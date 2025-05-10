/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import { useCallback, useEffect, useState } from "react";
import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/Button";
import { Label } from "~/components/ui/label";
import {
  useAccount,
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
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "react-hot-toast";
import { Wallet, Send, CheckCircle, XCircle, Loader2, Info } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";

// Bank of Celo ABI
const bankOfCeloAbi = [
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
      return (
        <div className="text-red-500 text-xs mt-1 flex items-center gap-1">
          <XCircle className="w-4 h-4" /> Rejected by user.
        </div>
      );
    }
  }
  return (
    <div className="text-red-500 text-xs mt-1 flex items-center gap-1">
      <XCircle className="w-4 h-4" /> {error.message}
    </div>
  );
};

export default function BankOfCelo({ title = "Bank of Celo" }: { title?: string }) {
  const { address, isConnected } = useAccount();
  const { data: session, status } = useSession();
  const { disconnect } = useDisconnect();
  const { connect, connectors } = useConnect();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();
  const { isSDKLoaded, context } = useFrame();

  // State
  const [donationAmount, setDonationAmount] = useState("");
  const [donateTxHash, setDonateTxHash] = useState<string | null>(null);
  const [isDonating, setIsDonating] = useState(false);
  const [donateError, setDonateError] = useState<Error | null>(null);

  const [fid, setFid] = useState("");
  const [requestTxHash, setRequestTxHash] = useState<string | null>(null);
  const [isRequesting, setIsRequesting] = useState(false);
  const [requestError, setRequestError] = useState<Error | null>(null);
  const [neynarScore, setNeynarScore] = useState<number | null>(null);
  const [isVerifyingFid, setIsVerifyingFid] = useState(false);

  const [vaultBalance, setVaultBalance] = useState<string>("0");
  const [showWelcome, setShowWelcome] = useState(true);

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
        if (!publicClient) return;
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
    const interval = setInterval(fetchVaultBalance, 30000);
    return () => clearInterval(interval);
  }, [publicClient]);

  // Verify FID with Neynar API
  const verifyFid = useCallback(async () => {
    if (!fid || isNaN(parseInt(fid))) {
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
      const score = user.neynar_score || 0;
      setNeynarScore(score);
      if (score < 0.41) {
        setRequestError(new Error("Neynar score too low (< 0.41)"));
        return false;
      }
      toast.success("FID verified successfully!");
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
      toast.success(`Donated ${donationAmount} CELO!`);
    } catch (error) {
      setDonateError(error instanceof Error ? error : new Error("Donation failed"));
      toast.error("Donation failed. Please try again.");
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
      toast.success("Requested 0.5 CELO!");
    } catch (error) {
      setRequestError(error instanceof Error ? error : new Error("Request failed"));
      toast.error("Request failed. Please try again.");
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
      toast.success("Signed in with Farcaster!");
    } catch (error) {
      console.error("Sign-in failed:", error);
      toast.error("Sign-in failed. Please try again.");
    }
  }, []);

  // Sign out
  const handleSignOut = useCallback(async () => {
    await signOut({ redirect: false });
    toast.success("Signed out successfully!");
  }, []);

  if (!isSDKLoaded) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-green-100 to-white">
        <Loader2 className="w-8 h-8 animate-spin text-green-600" />
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-gradient-to-br from-green-200 via-green-50 to-yellow-100 dark:from-green-900 dark:via-gray-800 dark:to-yellow-900 flex flex-col items-center justify-center p-4"
      style={{
        paddingTop: context?.client.safeAreaInsets?.top ?? 0,
        paddingBottom: context?.client.safeAreaInsets?.bottom ?? 0,
        paddingLeft: context?.client.safeAreaInsets?.left ?? 0,
        paddingRight: context?.client.safeAreaInsets?.right ?? 0,
      }}
    >
      {/* Welcome Modal */}
      <Dialog open={showWelcome} onOpenChange={setShowWelcome}>
        <DialogContent className="bg-white dark:bg-gray-800 rounded-lg shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-green-600 dark:text-green-400">
              Welcome to Bank of Celo!
            </DialogTitle>
            <DialogDescription className="text-gray-600 dark:text-gray-300">
              Help grow the Celo ecosystem by donating CELO to the vault or request 0.5 CELO to get started. Connect your wallet and sign in with Farcaster to begin!
            </DialogDescription>
          </DialogHeader>
          <Button onClick={() => setShowWelcome(false)} className="mt-4">
            Got it!
          </Button>
        </DialogContent>
      </Dialog>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md bg-white/80 dark:bg-gray-800/80 backdrop-blur-md rounded-2xl shadow-2xl p-6 space-y-6"
      >
        {/* Header */}
        <div className="text-center">
          <motion.h1
            className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-green-600 to-yellow-500"
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.3 }}
          >
            {title}
          </motion.h1>
          <div className="mt-2 flex items-center justify-center gap-2 text-sm">
            {isConnected ? (
              <>
                <Wallet className="w-4 h-4 text-green-600" />
                <span className="font-mono">{truncateAddress(address!)}</span>
                <Button
                  onClick={() => disconnect()}
                  className="text-red-500 hover:bg-red-100"
                >
                  Disconnect
                </Button>
              </>
            ) : (
              <Button
                onClick={() => connect({ connector: connectors[0] })}
                className="w-full bg-gradient-to-r from-green-500 to-yellow-500 hover:from-green-600 hover:to-yellow-600"
              >
                <Wallet className="w-4 h-4 mr-2" /> Connect Wallet
              </Button>
            )}
          </div>
        </div>

        {/* Farcaster Sign-In */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="space-y-2"
        >
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2">
            <Info className="w-4 h-4" /> Farcaster
          </h2>
          {status !== "authenticated" ? (
            <Button
              onClick={handleSignIn}
              className="w-full bg-blue-500 hover:bg-blue-600"
              disabled={status === "loading"}
            >
              Sign In with Farcaster
            </Button>
          ) : (
            <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded-lg">
              <div className="text-sm flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                Signed in as FID: {session?.user?.fid}
              </div>
              <Button
                className="w-full mt-2"
                onClick={handleSignOut}
              >
                Sign Out
              </Button>
            </div>
          )}
        </motion.div>

        {/* Vault Balance */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="space-y-2"
        >
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">Vault Balance</h2>
          <div className="p-4 bg-gradient-to-r from-green-100 to-yellow-100 dark:from-green-800 dark:to-yellow-800 rounded-lg text-center">
            <motion.span
              key={vaultBalance}
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200 }}
              className="text-3xl font-bold text-green-700 dark:text-green-300"
            >
              {parseFloat(vaultBalance).toFixed(2)}
            </motion.span>{" "}
            <span className="text-lg">CELO</span>
          </div>
        </motion.div>

        {/* Donate CELO */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="space-y-2"
        >
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2">
            <Send className="w-4 h-4" /> Donate CELO
          </h2>
          <div className="space-y-2">
            <Label htmlFor="donation-amount" className="text-sm">
              Amount (CELO)
            </Label>
            <Input
              id="donation-amount"
              type="number"
              step="0.01"
              min="0"
              value={donationAmount}
              onChange={(e) => setDonationAmount(e.target.value)}
              placeholder="e.g., 1.0"
              className="text-black dark:text-white border-green-300 focus:border-green-500"
              aria-invalid={donateError ? "true" : "false"}
            />
            <Button
              onClick={handleDonate}
              disabled={!isConnected || isDonating || !donationAmount}
              className="w-full bg-gradient-to-r from-green-500 to-yellow-500 hover:from-green-600 hover:to-yellow-600"
            >
              {isDonating ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Send className="w-4 h-4 mr-2" />
              )}
              Donate
            </Button>
            <AnimatePresence>
              {donateError && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  {renderError(donateError)}
                </motion.div>
              )}
              {donateTxHash && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-xs mt-2 p-2 bg-green-100 dark:bg-green-900 rounded-lg"
                >
                  <div>Tx Hash: {truncateAddress(donateTxHash)}</div>
                  <div className="flex items-center gap-1">
                    Status:{" "}
                    {isDonateConfirming ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : isDonateConfirmed ? (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    ) : (
                      "Pending"
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Request CELO */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="space-y-2"
        >
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2">
            <Send className="w-4 h-4" /> Request CELO
          </h2>
          <div className="space-y-2">
            <Label htmlFor="fid" className="text-sm">
              Farcaster FID
            </Label>
            <Input
              id="fid"
              type="number"
              value={fid}
              onChange={(e) => setFid(e.target.value)}
              placeholder="e.g., 420564"
              className="text-black dark:text-white border-green-300 focus:border-green-500"
              aria-invalid={requestError ? "true" : "false"}
            />
            <AnimatePresence>
              {neynarScore !== null && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-sm flex items-center gap-2"
                >
                  Neynar Score: {neynarScore.toFixed(2)}{" "}
                  {neynarScore >= 0.41 ? (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-500" />
                  )}
                </motion.div>
              )}
            </AnimatePresence>
            <Button
              onClick={handleRequest}
              disabled={!isConnected || isRequesting || isVerifyingFid || !fid}
              className="w-full bg-gradient-to-r from-green-500 to-yellow-500 hover:from-green-600 hover:to-yellow-600"
            >
              {isRequesting || isVerifyingFid ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Send className="w-4 h-4 mr-2" />
              )}
              Request 0.5 CELO
            </Button>
            <AnimatePresence>
              {requestError && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  {renderError(requestError)}
                </motion.div>
              )}
              {requestTxHash && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-xs mt-2 p-2 bg-green-100 dark:bg-green-900 rounded-lg"
                >
                  <div>Tx Hash: {truncateAddress(requestTxHash)}</div>
                  <div className="flex items-center gap-1">
                    Status:{" "}
                    {isRequestConfirming ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : isRequestConfirmed ? (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    ) : (
                      "Pending"
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Footer */}
        <div className="text-center text-xs text-gray-500 dark:text-gray-400">
          Powered by <span className="font-semibold">Celo</span> & <span className="font-semibold">Farcaster</span>
        </div>
      </motion.div>
    </div>
  );
}