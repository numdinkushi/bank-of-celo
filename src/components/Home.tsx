/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import { useState, useEffect } from "react";
import { useAccount, useDisconnect, useConnect, usePublicClient } from "wagmi";
import { useSession } from "next-auth/react";
import { signIn, signOut, getCsrfToken } from "next-auth/react";
import sdk from "@farcaster/frame-sdk";
import { formatEther } from "viem";
import { useFrame } from "~/components/providers/FrameProvider";
import { motion } from "framer-motion";
import { toast } from "react-hot-toast";
import { Wallet, Home, Send, ArrowLeftRight, Trophy, LogOut } from "lucide-react";
import { Button } from "~/components/ui/Button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "~/components/ui/dialog";
import HomeTab from "~/components/tabs/HomeTab";
import TransactTab from "~/components/tabs/TransactTab";
import SwapBridgeTab from "~/components/tabs/SwapBridgeTab";
import { truncateAddress } from "~/lib/truncateAddress";
import LeaderboardTab from "./tabs/LeaderboardTab";

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
];

// Replace with your deployed contract address
const CONTRACT_ADDRESS = "YOUR_DEPLOYED_CONTRACT_ADDRESS";

export default function BankOfCelo({ title = "Bank of Celo" }: { title?: string }) {
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const { connect, connectors } = useConnect();
  const { data: session, status } = useSession();
  const publicClient = usePublicClient();
  const { isSDKLoaded, context } = useFrame();

  // State
  const [activeTab, setActiveTab] = useState("home");
  const [vaultBalance, setVaultBalance] = useState<string>("0");
  const [showWelcome, setShowWelcome] = useState(true);

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

  // Sign in with Farcaster
  const handleSignIn = async () => {
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
  };

  // Sign out
  const handleSignOut = async () => {
    await signOut({ redirect: false });
    toast.success("Signed out successfully!");
  };

  if (!isSDKLoaded) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-green-200 to-yellow-100">
        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }}>
          <Home className="w-8 h-8 text-green-600" />
        </motion.div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-gradient-to-b from-green-200 to-yellow-100 dark:from-green-900 dark:to-yellow-900 flex flex-col"
      style={{
        paddingTop: context?.client.safeAreaInsets?.top ?? 0,
        paddingBottom: context?.client.safeAreaInsets?.bottom ?? 60,
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
              Donate or request CELO to support the ecosystem, swap/bridge tokens, or check the leaderboard to see top contributors!
            </DialogDescription>
          </DialogHeader>
          <Button onClick={() => setShowWelcome(false)} className="mt-4 bg-green-500 hover:bg-green-600">
            Let’s Go!
          </Button>
        </DialogContent>
      </Dialog>

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="sticky top-0 z-10 bg-white/80 dark:bg-gray-800/80 backdrop-blur-md shadow-md p-4"
      >
        <div className="flex items-center justify-between flex-wrap gap-2 max-w-md mx-auto">
          <h1 className="text-lg sm:text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-600 to-yellow-500 truncate max-w-[150px]">
            {title}
          </h1>
          <div className="flex items-center gap-2">
            {isConnected ? (
              <Button
                onClick={() => disconnect()}
                className="text-red-500 hover:bg-red-100 font-mono text-xs max-w-[120px] truncate"
                aria-label="Disconnect wallet"
              >
                <Wallet className="w-4 h-4 mr-1" />
                {truncateAddress(address!)}
              </Button>
            ) : (
              <Button
                onClick={() => connect({ connector: connectors[0] })}
                className="bg-green-500 hover:bg-green-600 text-xs"
                aria-label="Connect wallet"
              >
                <Wallet className="w-4 h-4 mr-1" /> Connect
              </Button>
            )}
            {status === "authenticated" ? (
              <Button
                onClick={handleSignOut}
                className="text-blue-500 hover:bg-blue-100 text-xs"
                aria-label="Sign out from Farcaster"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            ) : (
              <Button
                onClick={handleSignIn}
                className="bg-blue-500 hover:bg-blue-600 text-xs"
                disabled={status === "loading"}
                aria-label="Sign in with Farcaster"
              >
                Sign In
              </Button>
            )}
          </div>
        </div>
      </motion.div>

      {/* Content */}
      <div className="flex-1 p-4 overflow-y-auto max-w-md mx-auto w-full">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
        >
          {activeTab === "home" && <HomeTab vaultBalance={vaultBalance} />}
          {activeTab === "transact" && <TransactTab />}
          {activeTab === "swap" && <SwapBridgeTab />}
          {activeTab === "leaderboard" && <LeaderboardTab />}
        </motion.div>
      </div>

      {/* Bottom Navigation */}
      <motion.nav
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.5 }}
        className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 shadow-t-lg flex justify-around py-2"
      >
        {[
          { id: "home", icon: <Home className="w-6 h-6" />, label: "Home" },
          { id: "transact", icon: <Send className="w-6 h-6" />, label: "Transact" },
          { id: "swap", icon: <ArrowLeftRight className="w-6 h-6" />, label: "Swap" },
          { id: "leaderboard", icon: <Trophy className="w-6 h-6" />, label: "Leaderboard" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex flex-col items-center p-2 ${
              activeTab === tab.id
                ? "text-green-500"
                : "text-gray-500 dark:text-gray-400"
            }`}
            aria-label={tab.label}
          >
            {tab.icon}
            <span className="text-xs">{tab.label}</span>
          </button>
        ))}
      </motion.nav>
    </div>
  );
}