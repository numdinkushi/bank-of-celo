/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import { useState, useEffect, useCallback } from "react";
import { useAccount, useDisconnect, useConnect, usePublicClient, useWriteContract, useSwitchChain, useChainId } from "wagmi";
import { useSession } from "next-auth/react";
import { signOut, getCsrfToken } from "next-auth/react";
import sdk from "@farcaster/frame-sdk";
import { formatEther, parseEther } from "viem";
import { useFrame } from "~/components/providers/FrameProvider";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { Wallet, Home, Send, ArrowLeftRight, Trophy, LogOut, ChevronRight, Clock, AlertCircle } from "lucide-react";
import { Button } from "~/components/ui/Button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "~/components/ui/dialog";
import HomeTab from "~/components/tabs/HomeTab";
import TransactTab from "~/components/tabs/TransactTab";
import SwapBridgeTab from "~/components/tabs/SwapBridgeTab";
import { truncateAddress } from "~/lib/truncateAddress";
import LeaderboardTab from "./tabs/LeaderboardTab";
import { BANK_OF_CELO_CONTRACT_ABI, BANK_OF_CELO_CONTRACT_ADDRESS } from "~/lib/constants";
import { celo } from "viem/chains";

export default function BankOfCelo({ title = "Bank of Celo" }: { title?: string }) {
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const { connect, connectors } = useConnect();
  const { switchChain } = useSwitchChain();
  const { data: session, status } = useSession();
  const publicClient = usePublicClient();
  const { writeContract, isPending } = useWriteContract();
  const { isSDKLoaded, context } = useFrame();

  const [activeTab, setActiveTab] = useState("home");
  const [vaultBalance, setVaultBalance] = useState<string>("0");
  const [showWelcome, setShowWelcome] = useState(() => {
    return !localStorage.getItem("hasSeenWelcome");
  });
  const [isLoading, setIsLoading] = useState(false);
  const [claimCooldown, setClaimCooldown] = useState<number>(0);
  const [lastClaimAt, setLastClaimAt] = useState<number>(0);
  const [maxClaim, setMaxClaim] = useState<string>("0");
  const [vaultStatus, setVaultStatus] = useState({
    currentBalance: "0",
    minReserve: "0",
    availableForClaims: "0",
  });

  const chainId = useChainId();
  const CELO_CHAIN_ID = celo.id;
  const isCorrectChain = chainId === CELO_CHAIN_ID;

  const handleSwitchChain = async () => {
    toast.loading("Switching to Celo network...");
    try {
      await switchChain({ chainId: CELO_CHAIN_ID });
      toast.dismiss();
      toast.success("Successfully switched to Celo!");
    } catch (error) {
      toast.dismiss();
      toast.error("Failed to switch networks. Please try again.");
      console.error("Chain switching error:", error);
    }
  };

  useEffect(() => {
    if (isConnected && !isCorrectChain) {
      handleSwitchChain();
    }
  }, [isConnected, chainId, isCorrectChain]);

  const fetchContractData = useCallback(async () => {
    if (!publicClient || !address || !isCorrectChain) return;
    try {
      setIsLoading(true);
      const data = await Promise.all([
        publicClient.readContract({
          address: BANK_OF_CELO_CONTRACT_ADDRESS as `0x${string}`,
          abi: BANK_OF_CELO_CONTRACT_ABI,
          functionName: "getVaultStatus",
        }),
        publicClient.readContract({
          address: BANK_OF_CELO_CONTRACT_ADDRESS as `0x${string}`,
          abi: BANK_OF_CELO_CONTRACT_ABI,
          functionName: "claimCooldown",
        }),
        publicClient.readContract({
          address: BANK_OF_CELO_CONTRACT_ADDRESS as `0x${string}`,
          abi: BANK_OF_CELO_CONTRACT_ABI,
          functionName: "lastClaimAt",
          args: [address],
        }),
        publicClient.readContract({
          address: BANK_OF_CELO_CONTRACT_ADDRESS as `0x${string}`,
          abi: BANK_OF_CELO_CONTRACT_ABI,
          functionName: "MAX_CLAIM",
        }),
      ]);

      const [status, cooldown, lastClaim, maxClaimAmount] = data;
      const [currentBalance, minReserve, availableForClaims] = status as [bigint, bigint, bigint];

      setVaultStatus({
        currentBalance: formatEther(currentBalance),
        minReserve: formatEther(minReserve),
        availableForClaims: formatEther(availableForClaims),
      });
      setVaultBalance(formatEther(currentBalance));
      setClaimCooldown(Number(cooldown));
      setLastClaimAt(Number(lastClaim));
      setMaxClaim(formatEther(maxClaimAmount as bigint));
    } catch (error) {
      console.error("Failed to fetch contract data:", error);
      toast.error("Failed to fetch contract data. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [publicClient, address, isCorrectChain]);

  useEffect(() => {
    fetchContractData();
    const interval = setInterval(fetchContractData, 30000);
    return () => clearInterval(interval);
  }, [fetchContractData]);

  const handleDonate = (amount: string) => {
    if (!isCorrectChain) {
      handleSwitchChain();
      return;
    }

    if (Number(amount) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    writeContract(
      {
        address: BANK_OF_CELO_CONTRACT_ADDRESS as `0x${string}`,
        abi: BANK_OF_CELO_CONTRACT_ABI,
        functionName: "donate",
        value: parseEther(amount),
        chainId: CELO_CHAIN_ID,
      },
      {
        onSuccess: () => {
          toast.success("Donation successful!");
          fetchContractData();
        },
        onError: (error) => {
          toast.error(`Donation failed: ${error.message}`);
          console.error("Donation error:", error);
        },
      }
    );
  };

  const handleClaim = (fid: number) => {
    if (!isCorrectChain) {
      handleSwitchChain();
      return;
    }

    writeContract(
      {
        address: BANK_OF_CELO_CONTRACT_ADDRESS as `0x${string}`,
        abi: BANK_OF_CELO_CONTRACT_ABI,
        functionName: "claim",
        args: [BigInt(fid)],
        chainId: CELO_CHAIN_ID,
      },
      {
        onSuccess: () => {
          toast.success("Claim submitted successfully!");
          fetchContractData();
        },
        onError: (error) => {
          toast.error(`Claim failed: ${error.message}`);
          console.error("Claim error:", error);
        },
      }
    );
  };

  const handleConnect = () => {
    connect({
      connector: connectors[0],
      chainId: CELO_CHAIN_ID,
    });
  };

  const handleSignOut = async () => {
    await signOut({ redirect: false });
    toast.success("Signed out successfully!");
  };

  const handleCloseWelcome = () => {
    setShowWelcome(false);
    localStorage.setItem("hasSeenWelcome", "true");
  };

  if (!isSDKLoaded) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-emerald-100 to-amber-100 dark:from-emerald-950 dark:to-amber-950">
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
      className="min-h-screen bg-gradient-to-br from-emerald-100 via-amber-50 to-emerald-100 dark:from-emerald-950 dark:via-gray-900 dark:to-emerald-950 flex flex-col"
      style={{
        paddingTop: context?.client.safeAreaInsets?.top ?? 0,
        paddingBottom: context?.client.safeAreaInsets?.bottom ?? 60,
        paddingLeft: context?.client.safeAreaInsets?.left ?? 0,
        paddingRight: context?.client.safeAreaInsets?.right ?? 0,
      }}
    >
      {/* Network Warning Banner */}
      {isConnected && !isCorrectChain && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-amber-100 dark:bg-amber-900/50 border-l-4 border-amber-500 dark:border-amber-400 p-3 text-center flex flex-col sm:flex-row items-center justify-center gap-3"
        >
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-300" />
            <span className="text-amber-800 dark:text-amber-100 font-medium">
              You are on the wrong network
            </span>
          </div>
          <Button
            onClick={handleSwitchChain}
            className="bg-amber-600 hover:bg-amber-700 text-white text-sm py-1 px-4 rounded-full flex items-center gap-1"
          >
            <ArrowLeftRight className="w-4 h-4" />
            Switch to Celo
          </Button>
        </motion.div>
      )}

      {/* Welcome Modal */}
      <Dialog open={showWelcome} onOpenChange={handleCloseWelcome}>
        <DialogContent className="bg-white dark:bg-gray-900 rounded-2xl border-0 shadow-xl p-6 max-w-md">
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
              The decentralized vault supporting the Celo ecosystem. Donate to help grow the community
              or claim {maxClaim} CELO to explore decentralized finance. Swap tokens seamlessly or
              check the leaderboard to see top contributors!
            </DialogDescription>
          </DialogHeader>
          <div className="mt-6 flex flex-col gap-3">
            <Button
              onClick={handleCloseWelcome}
              className="w-full bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 text-white rounded-lg py-3 shadow-md"
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
        className="sticky top-0 z-10 bg-white/90 dark:bg-gray-900/90 backdrop-blur-md border-b border-gray-200 dark:border-gray-700 p-4"
      >
        <div className="flex items-center justify-between max-w-md mx-auto">
          <h1 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-amber-500">
            {title}
          </h1>
          <div className="flex items-center gap-2">
            {isConnected ? (
              <>
                <Button
                  onClick={() => disconnect()}
                  className="text-xs text-gray-800 dark:text-gray-200 font-medium bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-full px-3 py-1.5"
                  aria-label="Disconnect wallet"
                >
                  <Wallet className="w-4 h-4 mr-1" />
                  {truncateAddress(address!)}
                </Button>
                {status === "authenticated" && (
                  <Button
                    onClick={handleSignOut}
                    className="text-xs font-medium bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white rounded-full p-1.5 shadow-sm"
                    aria-label="Sign out from Farcaster"
                  >
                    <LogOut className="w-4 h-4" />
                  </Button>
                )}
              </>
            ) : (
              <Button
                onClick={handleConnect}
                className="text-xs font-medium bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 text-white rounded-full px-3 py-1.5 shadow-sm"
                aria-label="Connect wallet"
              >
                <Wallet className="w-4 h-4 mr-1" /> Connect
              </Button>
            )}
          </div>
        </div>
      </motion.div>

      {/* Content */}
      <div className="flex-1 p-4 overflow-y-auto max-w-md mx-auto w-full relative">
        {isLoading && (
          <div className="absolute inset-0 bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm flex items-center justify-center z-20 rounded-xl">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
              className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full"
            />
          </div>
        )}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === "home" && (
              <HomeTab
                vaultBalance={vaultBalance}
                vaultStatus={vaultStatus}
                isLoading={isLoading}
                onNavigate={(tab) => setActiveTab(tab)}
                maxClaim={maxClaim}
                claimCooldown={claimCooldown}
                lastClaimAt={lastClaimAt}
                isCorrectChain={isCorrectChain}
              />
            )}
            {activeTab === "transact" && (
              <TransactTab
                onDonate={handleDonate}
                onClaim={handleClaim}
                maxClaim={maxClaim}
                claimCooldown={claimCooldown}
                lastClaimAt={lastClaimAt}
                isCorrectChain={isCorrectChain}
                isPending={isPending}
                fid={session?.user?.fid}
              />
            )}
            {activeTab === "swap" && <SwapBridgeTab isCorrectChain={isCorrectChain} />}
            {activeTab === "leaderboard" && <LeaderboardTab />}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom Navigation */}
      <motion.nav
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.5 }}
        className="fixed bottom-0 left-0 right-0 bg-white/95 dark:bg-gray-900/95 backdrop-blur-lg shadow-t-lg border-t border-gray-200 dark:border-gray-700 flex justify-around py-2 px-4"
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
            className={`relative flex flex-col items-center p-2 rounded-xl transition-all ${
              activeTab === tab.id
                ? "text-white bg-gradient-to-r from-emerald-500 to-emerald-600 shadow-md"
                : "text-gray-600 dark:text-gray-300 hover:text-emerald-600 dark:hover:text-emerald-400"
            }`}
            aria-label={tab.label}
          >
            {tab.icon}
            <span className="text-xs mt-1">{tab.label}</span>
            {activeTab === tab.id && (
              <motion.div
                layoutId="activeTabIndicator"
                className="absolute bottom-0 w-1/2 h-1 bg-emerald-300 rounded-full"
              />
            )}
          </button>
        ))}
      </motion.nav>
    </div>
  );
}