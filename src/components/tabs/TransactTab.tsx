/* eslint-disable @typescript-eslint/no-unused-vars */
import { useState } from "react";
import { useAccount, useWriteContract } from "wagmi";
import { parseEther } from "viem";
import { motion } from "framer-motion";
import { Loader2, Send, Gift, HandCoins, Clock } from "lucide-react";
import { Button } from "~/components/ui/Button";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { Input } from "../ui/input";

interface TransactTabProps {
  onDonate: (amount: string) => void;
  onClaim: (fid: number) => void;
  maxClaim?: string;
  claimCooldown?: number;
  lastClaimAt?: number;
}

export default function TransactTab({ 
  onDonate, 
  onClaim,
  maxClaim = "0.5",
  claimCooldown = 86400,
  lastClaimAt = 0
}: TransactTabProps) {
  const { isConnected } = useAccount();
  const [amount, setAmount] = useState("");
  const [fid, setFid] = useState("");
  const [activeTab, setActiveTab] = useState<"donate" | "claim">("donate");
  const { isPending: isDonating } = useWriteContract();
  const { isPending: isClaiming } = useWriteContract();

  const canClaim = () => {
    if (!lastClaimAt) return true;
    const now = Math.floor(Date.now() / 1000);
    return now >= lastClaimAt + claimCooldown;
  };

  const nextClaimTime = lastClaimAt 
    ? new Date((lastClaimAt + claimCooldown) * 1000)
    : null;

  const handleSubmit = () => {
    if (activeTab === "donate") {
      if (!amount || isNaN(Number(amount))) {
        toast.error("Please enter a valid amount");
        return;
      }
      onDonate(amount);
    } else {
      if (!fid || isNaN(Number(fid))) {
        toast.error("Please enter a valid Farcaster ID");
        return;
      }
      onClaim(Number(fid));
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      {/* Tab Selector */}
      <div className="flex bg-gray-100 dark:bg-gray-700 rounded-xl p-1">
        <button
          onClick={() => setActiveTab("donate")}
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === "donate"
              ? "bg-white dark:bg-gray-800 shadow-sm text-emerald-600 dark:text-emerald-400"
              : "text-gray-500 dark:text-gray-400"
          }`}
        >
          Donate
        </button>
        <button
          onClick={() => setActiveTab("claim")}
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === "claim"
              ? "bg-white dark:bg-gray-800 shadow-sm text-amber-600 dark:text-amber-400"
              : "text-gray-500 dark:text-gray-400"
          }`}
        >
          Claim
        </button>
      </div>

      {!isConnected ? (
        <div className="p-6 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 text-center">
          <p className="text-gray-600 dark:text-gray-300">
            Please connect your wallet to {activeTab === "donate" ? "donate" : "claim"} CELO
          </p>
        </div>
      ) : activeTab === "donate" ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="p-5 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-emerald-100 dark:bg-emerald-900 p-2 rounded-lg">
              <Gift className="w-5 h-5 text-emerald-600 dark:text-emerald-300" />
            </div>
            <h3 className="font-medium text-gray-900 dark:text-white">Donate to the Vault</h3>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Amount (CELO)
              </label>
              <Input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.0"
                className="w-full"
              />
            </div>
            <Button
              onClick={handleSubmit}
              disabled={isDonating || !amount}
              className="w-full bg-emerald-600 hover:bg-emerald-700"
            >
              {isDonating ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Send className="w-4 h-4 mr-2" />
              )}
              Donate
            </Button>
          </div>
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="p-5 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-amber-100 dark:bg-amber-900 p-2 rounded-lg">
              <HandCoins className="w-5 h-5 text-amber-600 dark:text-amber-300" />
            </div>
            <h3 className="font-medium text-gray-900 dark:text-white">Claim CELO</h3>
          </div>
          <div className="space-y-4">
            {!canClaim() && nextClaimTime && (
              <div className="p-3 bg-amber-50 dark:bg-amber-900/30 rounded-lg text-sm text-amber-700 dark:text-amber-300 flex items-center">
                <Clock className="w-4 h-4 mr-2" />
                You can claim again {formatDistanceToNow(nextClaimTime, { addSuffix: true })}
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Your Farcaster ID
              </label>
              <Input
                type="number"
                value={fid}
                onChange={(e) => setFid(e.target.value)}
                placeholder="1234"
                className="w-full"
              />
            </div>
            <Button
              onClick={handleSubmit}
              disabled={isClaiming || !fid || !canClaim()}
              className="w-full bg-amber-600 hover:bg-amber-700"
            >
              {isClaiming ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <HandCoins className="w-4 h-4 mr-2" />
              )}
              Claim {maxClaim} CELO
            </Button>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}