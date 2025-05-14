/* eslint-disable @typescript-eslint/no-unused-vars */
import { useState, useEffect } from "react";
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
  isCorrectChain: boolean;
  isPending: boolean;
  fid?: number; // FID from session
}

export default function TransactTab({
  onDonate,
  onClaim,
  maxClaim = "0.5",
  claimCooldown = 86400,
  lastClaimAt = 0,
  isCorrectChain,
  isPending,
  fid,
}: TransactTabProps) {
  const [amount, setAmount] = useState("");
  const [fidInput, setFidInput] = useState("");
  const [activeTab, setActiveTab] = useState<"donate" | "claim">("donate");

  // Auto-populate FID if available from session
  useEffect(() => {
    if (fid) {
      setFidInput(fid.toString());
    }
  }, [fid]);

  const canClaim = () => {
    if (!lastClaimAt) return true;
    const now = Math.floor(Date.now() / 1000);
    return now >= lastClaimAt + claimCooldown;
  };

  const nextClaimTime = lastClaimAt ? new Date((lastClaimAt + claimCooldown) * 1000) : null;

  const handleSubmit = () => {
    if (!isCorrectChain) {
      toast.error("Please switch to Celo Network");
      return;
    }

    if (activeTab === "donate") {
      if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
        toast.error("Please enter a valid amount");
        return;
      }
      onDonate(amount);
      setAmount("");
    } else {
      if (!fidInput || isNaN(Number(fidInput))) {
        toast.error("Please enter a valid Farcaster ID");
        return;
      }
      onClaim(Number(fidInput));
      setFidInput(fid ? fid.toString() : "");
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
          aria-label="Donate tab"
          role="tab"
          aria-selected={activeTab === "donate"}
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
          aria-label="Claim tab"
          role="tab"
          aria-selected={activeTab === "claim"}
        >
          Claim
        </button>
      </div>

      {!isCorrectChain ? (
        <div className="p-6 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 text-center">
          <p className="text-gray-600 dark:text-gray-300">Please switch to Celo Network to proceed</p>
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
              <label htmlFor="donate-amount" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Amount (CELO)
              </label>
              <Input
                id="donate-amount"
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.0"
                className="w-full"
                min="0"
                step="0.01"
              />
            </div>
            <Button
              onClick={handleSubmit}
              disabled={isPending || !amount}
              className="w-full bg-emerald-600 hover:bg-emerald-700"
              aria-label="Donate CELO"
            >
              {isPending && activeTab === "donate" ? (
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
              <label
                htmlFor="farcaster-id"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Your Farcaster ID
              </label>
              <Input
                id="farcaster-id"
                type="number"
                value={fidInput}
                onChange={(e) => setFidInput(e.target.value)}
                placeholder="1234"
                className="w-full"
                disabled={!!fid} // Disable if FID is auto-populated
              />
            </div>
            <Button
              onClick={handleSubmit}
              disabled={isPending || !fidInput || !canClaim()}
              className="w-full bg-amber-600 hover:bg-amber-700"
              aria-label={`Claim ${maxClaim} CELO`}
            >
              {isPending && activeTab === "claim" ? (
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