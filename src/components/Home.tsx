/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import { useState, useEffect } from "react";
import { useAccount, useDisconnect, useConnect, usePublicClient } from "wagmi";
import { useSession } from "next-auth/react";
import { signIn, signOut, getCsrfToken } from "next-auth/react";
import sdk from "@farcaster/frame-sdk";
import { formatEther } from "viem";
import { useFrame } from "~/components/providers/FrameProvider";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { Wallet, Home, Send, ArrowLeftRight, Trophy, LogOut, ChevronRight } from "lucide-react";
import { Button } from "~/components/ui/Button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "~/components/ui/dialog";
import HomeTab from "~/components/tabs/HomeTab";
import TransactTab from "~/components/tabs/TransactTab";
import SwapBridgeTab from "~/components/tabs/SwapBridgeTab";
import { truncateAddress } from "~/lib/truncateAddress";
import LeaderboardTab from "./tabs/LeaderboardTab";

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

const CONTRACT_ADDRESS = "YOUR_DEPLOYED_CONTRACT_ADDRESS";

export default function BankOfCelo({ title = "Bank of Celo" }: { title?: string }) {
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const { connect, connectors } = useConnect();
  const { data: session, status } = useSession();
  const publicClient = usePublicClient();
  const { isSDKLoaded, context } = useFrame();

  const [activeTab, setActiveTab] = useState("home");
  const [vaultBalance, setVaultBalance] = useState<string>("0");
  const [showWelcome, setShowWelcome] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchVaultBalance = async () => {
      try {
        if (!publicClient) return;
        setIsLoading(true);
        const balance = await publicClient.readContract({
          address: CONTRACT_ADDRESS as `0x${string}`,
          abi: bankOfCeloAbi,
          functionName: "getVaultBalance",
        });
        setVaultBalance(formatEther(balance as bigint));
      } catch (error) {
        console.error("Failed to fetch vault balance:", error);
        toast.error("Failed to fetch vault balance");
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchVaultBalance();
    const interval = setInterval(fetchVaultBalance, 30000);
    return () => clearInterval(interval);
  }, [publicClient]);

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

  const handleSignOut = async () => {
    await signOut({ redirect: false });
    toast.success("Signed out successfully!");
  };

  if (!isSDKLoaded) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-emerald-50 to-amber-50 dark:from-emerald-900 dark:to-amber-900">
        <motion.div
          animate={{ rotate: 360, scale: [1, 1.2, 1] }}
          transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
        >
          <Home className="w-12 h-12 text-emerald-500 dark:text-emerald-300" />
        </motion.div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-gradient-to-br from-emerald-50 to-amber-50 dark:from-emerald-900 dark:to-amber-900 flex flex-col"
      style={{
        paddingTop: context?.client.safeAreaInsets?.top ?? 0,
        paddingBottom: context?.client.safeAreaInsets?.bottom ?? 60,
        paddingLeft: context?.client.safeAreaInsets?.left ?? 0,
        paddingRight: context?.client.safeAreaInsets?.right ?? 0,
      }}
    >
      {/* Welcome Modal */}
      <Dialog open={showWelcome} onOpenChange={setShowWelcome}>
        <DialogContent className="bg-white dark:bg-gray-800 rounded-2xl border-0 shadow-xl p-6 max-w-md">
          <DialogHeader>
            <div className="flex justify-center mb-4">
              <div className="bg-emerald-100 dark:bg-emerald-900 p-3 rounded-full">
                <Trophy className="w-8 h-8 text-emerald-600 dark:text-emerald-300" />
              </div>
            </div>
            <DialogTitle className="text-2xl font-bold text-center text-gray-900 dark:text-white">
              Welcome to Bank of Celo!
            </DialogTitle>
            <DialogDescription className="text-center text-gray-600 dark:text-gray-300 mt-2">
              Donate or request CELO to support the ecosystem, swap/bridge tokens, or check the leaderboard to see top contributors!
            </DialogDescription>
          </DialogHeader>
          <div className="mt-6 flex flex-col gap-3">
            <Button 
              onClick={() => setShowWelcome(false)} 
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg py-3"
            >
              Get Started
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="sticky top-0 z-10 bg-white/80 dark:bg-gray-800/80 backdrop-blur-md shadow-sm p-4"
      >
        <div className="flex items-center justify-between max-w-md mx-auto">
          <h1 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-amber-500">
            {title}
          </h1>
          <div className="flex items-center gap-2">
            {isConnected ? (
              <Button
                onClick={() => disconnect()}
                className="text-xs font-medium bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-full px-3 py-1.5"
                aria-label="Disconnect wallet"
              >
                <Wallet className="w-4 h-4 mr-1" />
                {truncateAddress(address!)}
              </Button>
            ) : (
              <Button
                onClick={() => connect({ connector: connectors[0] })}
                className="text-xs font-medium bg-emerald-600 hover:bg-emerald-700 text-white rounded-full px-3 py-1.5"
                aria-label="Connect wallet"
              >
                <Wallet className="w-4 h-4 mr-1" /> Connect
              </Button>
            )}
            {status === "authenticated" ? (
              <Button
                onClick={handleSignOut}
                className="text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-full p-1.5"
                aria-label="Sign out from Farcaster"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            ) : (
              <Button
                onClick={handleSignIn}
                className="text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-full px-3 py-1.5"
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
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === "home" && <HomeTab vaultBalance={vaultBalance} isLoading={isLoading} />}
            {activeTab === "transact" && <TransactTab />}
            {activeTab === "swap" && <SwapBridgeTab />}
            {activeTab === "leaderboard" && <LeaderboardTab />}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom Navigation */}
      <motion.nav
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.5 }}
        className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 shadow-t-lg border-t border-gray-100 dark:border-gray-700 flex justify-around py-2 px-4"
      >
        {[
          { id: "home", icon: <Home className="w-5 h-5" />, label: "Home" },
          { id: "transact", icon: <Send className="w-5 h-5" />, label: "Transact" },
          { id: "swap", icon: <ArrowLeftRight className="w-5 h-5" />, label: "Swap" },
          { id: "leaderboard", icon: <Trophy className="w-5 h-5" />, label: "Leaderboard" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex flex-col items-center p-2 rounded-lg transition-colors ${
              activeTab === tab.id
                ? "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30"
                : "text-gray-500 dark:text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400"
            }`}
            aria-label={tab.label}
          >
            {tab.icon}
            <span className="text-xs mt-1">{tab.label}</span>
          </button>
        ))}
      </motion.nav>
    </div>
  );
}