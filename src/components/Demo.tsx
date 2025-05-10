/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import { useCallback, useEffect, useState } from "react";
import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/Button";
import { Label } from "~/components/ui/label";
import {
  useAccount,
  useSendTransaction,
  useWaitForTransactionReceipt,
  useDisconnect,
  useConnect,
  useWalletClient,
  usePublicClient,
} from "wagmi";
import { useSession } from "next-auth/react";
import { signIn, signOut, getCsrfToken } from "next-auth/react";
import sdk, { SignIn as SignInCore } from "@farcaster/frame-sdk";
import { parseEther, formatEther } from "viem";
import { celo } from "wagmi/chains";
import { BaseError, UserRejectedRequestError } from "viem";
import { truncateAddress } from "~/lib/truncateAddress";
import { useFrame } from "~/components/providers/FrameProvider";

// Bank of Celo ABI (generated after Hardhat compilation)
const bankOfCeloAbi = [
  // Simplified ABI for key functions
  {
    inputs: [],
    name: "donate",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [{ name: "_fid", type: "uint256" }],
    name: "requestCelo",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "getVaultBalance",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "donor", type: "address" },
      { indexed: false, name: "amount", type: "uint256" },
    ],
    name: "Donated",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "requester", type: "address" },
      { indexed: false, name: "fid", type: "uint256" },
      { indexed: false, name: "amount", type: "uint256" },
    ],
    name: "Requested",
    type: "event",
  },
];

// Replace with your deployed contract address
const CONTRACT_ADDRESS = "YOUR_DEPLOYED_CONTRACT_ADDRESS";

// Neynar API key
const NEYNAR_API_KEY = "FF6C17E2-C5C4-4B55-9848-769D80022F83";

const renderError = (error: Error | null) => {
  if (!error) return null;
  if (error instanceof BaseError) {
    const isUserRejection = error.walk(
      (e) => e instanceof UserRejectedRequestError
    );
    if (isUserRejection) {
      return <div className="text-red-500 text-xs mt-1">Rejected by user.</div>;
    }
  }
  return <div className="text-red-500 text-xs mt-1">{error.message}</div>;
};

export default function BankOfCelo({ title = "Bank of Celo" }: { title?: string }) {
  const { address, isConnected } = useAccount();
  const { data: session, status } = useSession();
  const { disconnect } = useDisconnect();
  const { connect, connectors } = useConnect();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();
  const { isSDKLoaded, context } = useFrame();

  // State for donation
  const [donationAmount, setDonationAmount] = useState("");
  const [donateTxHash, setDonateTxHash] = useState<string | null>(null);
  const [isDonating, setIsDonating] = useState(false);
  const [donateError, setDonateError] = useState<Error | null>(null);

  // State for request
  const [fid, setFid] = useState("");
  const [requestTxHash, setRequestTxHash] = useState<string | null>(null);
  const [isRequesting, setIsRequesting] = useState(false);
  const [requestError, setRequestError] = useState<Error | null>(null);
  const [neynarScore, setNeynarScore] = useState<number | null>(null);
  const [isVerifyingFid, setIsVerifyingFid] = useState(false);

  // State for vault balance
  const [vaultBalance, setVaultBalance] = useState<string>("0");

  // Transaction status
  const { isLoading: isDonateConfirming, isSuccess: isDonateConfirmed } =
    useWaitForTransactionReceipt({
      hash: donateTxHash as `0x${string}`,
    });
  const { isLoading: isRequestConfirming, isSuccess: isRequestConfirmed } =
    useWaitForTransactionReceipt({
      hash: requestTxHash as `0x${string}`,
    });

  // Fetch vault balance
  useEffect(() => {
    const fetchVaultBalance = async () => {
      try {
        if (!publicClient) {
          console.error("Public client is not available.");
          return;
        }
        const balance = await publicClient.readContract({
          address: CONTRACT_ADDRESS as `0x${string}`,
          abi: bankOfCeloAbi,
          functionName: "getVaultBalance",
        });
        setVaultBalance(formatEther(balance as bigint));
      } catch (error) {
        console.error("Failed to fetch vault balance:", error);
      }
    };
    fetchVaultBalance();
    const interval = setInterval(fetchVaultBalance, 30000); // Update every 30s
    return () => clearInterval(interval);
  }, [publicClient]);

  // Verify FID with Neynar API
  const verifyFid = useCallback(async () => {
    if (!fid) {
      setRequestError(new Error("Please enter a valid FID"));
      return false;
    }
    setIsVerifyingFid(true);
    try {
      const response = await fetch(
        `https://api.neynar.com/v2/farcaster/user/bulk?fids=${fid}`,
        {
          method: "GET",
          headers: {
            "x-api-key": NEYNAR_API_KEY,
            "x-neynar-experimental": "false",
          },
        }
      );
      const data = await response.json();
      const user = data.users[0];
      if (!user) {
        setRequestError(new Error("Invalid FID"));
        return false;
      }
      const score = user.neynar_score || 0; // Replace with actual field name if different
      setNeynarScore(score);
      if (score < 0.41) {
        setRequestError(new Error("Neynar score too low (< 0.41)"));
        return false;
      }
      // TODO: Call backend or admin script to approve FID on-chain
      // For demo, assume FID is approved (in production, check approvedFIDs)
      return true;
    } catch (error) {
      setRequestError(error instanceof Error ? error : new Error("Failed to verify FID"));
      return false;
    } finally {
      setIsVerifyingFid(false);
    }
  }, [fid]);

  // Donate CELO
  const handleDonate = useCallback(async () => {
    if (!donationAmount || parseFloat(donationAmount) <= 0) {
      setDonateError(new Error("Enter a valid donation amount"));
      return;
    }
    setIsDonating(true);
    setDonateError(null);
    try {
      const tx = await walletClient!.writeContract({
        address: CONTRACT_ADDRESS as `0x${string}`,
        abi: bankOfCeloAbi,
        functionName: "donate",
        value: parseEther(donationAmount),
      });
      setDonateTxHash(tx);
    } catch (error) {
      setDonateError(error instanceof Error ? error : new Error("Donation failed"));
    } finally {
      setIsDonating(false);
    }
  }, [donationAmount, walletClient]);

  // Request CELO
  const handleRequest = useCallback(async () => {
    const isValidFid = await verifyFid();
    if (!isValidFid) return;
    setIsRequesting(true);
    setRequestError(null);
    try {
      const tx = await walletClient!.writeContract({
        address: CONTRACT_ADDRESS as `0x${string}`,
        abi: bankOfCeloAbi,
        functionName: "requestCelo",
        args: [parseInt(fid)],
      });
      setRequestTxHash(tx);
    } catch (error) {
      setRequestError(error instanceof Error ? error : new Error("Request failed"));
    } finally {
      setIsRequesting(false);
    }
  }, [fid, verifyFid, walletClient]);

  // Sign in with Farcaster
  const handleSignIn = useCallback(async () => {
    try {
      const nonce = await getCsrfToken();
      if (!nonce) throw new Error("Unable to generate nonce");
      const result = await sdk.actions.signIn({ nonce });
      await signIn("credentials", {
        message: result.message,
        signature: result.signature,
        redirect: false,
      });
    } catch (error) {
      console.error("Sign-in failed:", error);
    }
  }, []);

  // Sign out
  const handleSignOut = useCallback(async () => {
    await signOut({ redirect: false });
  }, []);

  if (!isSDKLoaded) {
    return <div className="text-center py-8">Loading...</div>;
  }

  return (
    <div
      className="min-h-screen bg-gradient-to-b from-green-100 to-white dark:from-green-900 dark:to-gray-900 flex flex-col items-center justify-center p-4"
      style={{
        paddingTop: context?.client.safeAreaInsets?.top ?? 0,
        paddingBottom: context?.client.safeAreaInsets?.bottom ?? 0,
        paddingLeft: context?.client.safeAreaInsets?.left ?? 0,
        paddingRight: context?.client.safeAreaInsets?.right ?? 0,
      }}
    >
      <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 space-y-6">
        {/* Header */}
        <h1 className="text-2xl font-bold text-center text-green-600 dark:text-green-400">{title}</h1>
        <div className="text-center text-sm">
          {isConnected ? (
            <div>
              Connected: <span className="font-mono">{truncateAddress(address!)}</span>
              <Button
                className="ml-2"
                onClick={() => disconnect()}
              >
                Disconnect
              </Button>
            </div>
          ) : (
            <Button
              onClick={() => connect({ connector: connectors[0] })}
              className="w-full"
            >
              Connect Wallet
            </Button>
          )}
        </div>

        {/* Farcaster Sign-In */}
        <div className="space-y-2">
          <h2 className="text-lg font-semibold">Farcaster</h2>
          {status !== "authenticated" ? (
            <Button
              onClick={handleSignIn}
              className="w-full"
              disabled={status === "loading"}
            >
              Sign In with Farcaster
            </Button>
          ) : (
            <div>
              <div className="text-sm">Signed in as FID: {session?.user?.fid}</div>
              <Button
                
                className="w-full mt-2"
                onClick={handleSignOut}
              >
                Sign Out
              </Button>
            </div>
          )}
        </div>

        {/* Vault Balance */}
        <div className="space-y-2">
          <h2 className="text-lg font-semibold">Vault Balance</h2>
          <div className="p-4 bg-green-50 dark:bg-green-900 rounded-lg text-center">
            <span className="text-2xl font-bold">{parseFloat(vaultBalance).toFixed(2)}</span> CELO
          </div>
        </div>

        {/* Donate CELO */}
        <div className="space-y-2">
          <h2 className="text-lg font-semibold">Donate CELO</h2>
          <div className="space-y-2">
            <Label htmlFor="donation-amount">Amount (CELO)</Label>
            <Input
              id="donation-amount"
              type="number"
              step="0.01"
              min="0"
              value={donationAmount}
              onChange={(e) => setDonationAmount(e.target.value)}
              placeholder="Enter amount"
              className="text-black dark:text-white"
            />
            <Button
              onClick={handleDonate}
              disabled={!isConnected || isDonating || !donationAmount}
              isLoading={isDonating}
              className="w-full"
            >
              Donate
            </Button>
            {donateError && renderError(donateError)}
            {donateTxHash && (
              <div className="text-xs mt-2">
                <div>Tx Hash: {truncateAddress(donateTxHash)}</div>
                <div>
                  Status: {isDonateConfirming ? "Confirming..." : isDonateConfirmed ? "Confirmed!" : "Pending"}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Request CELO */}
        <div className="space-y-2">
          <h2 className="text-lg font-semibold">Request CELO</h2>
          <div className="space-y-2">
            <Label htmlFor="fid">Farcaster FID</Label>
            <Input
              id="fid"
              type="number"
              value={fid}
              onChange={(e) => setFid(e.target.value)}
              placeholder="Enter your FID"
              className="text-black dark:text-white"
            />
            {neynarScore !== null && (
              <div className="text-sm">
                Neynar Score: {neynarScore.toFixed(2)} {neynarScore >= 0.41 ? "✅" : "❌"}
              </div>
            )}
            <Button
              onClick={handleRequest}
              disabled={!isConnected || isRequesting || isVerifyingFid || !fid}
              isLoading={isRequesting || isVerifyingFid}
              className="w-full"
            >
              Request 0.5 CELO
            </Button>
            {requestError && renderError(requestError)}
            {requestTxHash && (
              <div className="text-xs mt-2">
                <div>Tx Hash: {truncateAddress(requestTxHash)}</div>
                <div>
                  Status: {isRequestConfirming ? "Confirming..." : isRequestConfirmed ? "Confirmed!" : "Pending"}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-gray-500 dark:text-gray-400">
          Powered by Celo & Farcaster
        </div>
      </div>
    </div>
  );
}