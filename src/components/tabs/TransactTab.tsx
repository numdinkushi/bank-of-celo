import { useState } from "react";
import { useAccount, useWriteContract } from "wagmi";
import { parseEther } from "viem";
import { motion } from "framer-motion";
import { Loader2, Send, Gift, HandCoins } from "lucide-react";
import { Button } from "~/components/ui/Button";
import { toast } from "sonner";
import { Input } from "../ui/input";

const CONTRACT_ADDRESS = "YOUR_DEPLOYED_CONTRACT_ADDRESS";

export default function TransactTab() {
  const { isConnected } = useAccount();
  const { writeContract, isPending } = useWriteContract();
  const [amount, setAmount] = useState("");
  const [activeTab, setActiveTab] = useState<"donate" | "request">("donate");

  const handleDonate = () => {
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    writeContract(
      {
        address: CONTRACT_ADDRESS as `0x${string}`,
        abi: [
          {
            inputs: [],
            name: "donate",
            outputs: [],
            stateMutability: "payable",
            type: "function",
          },
        ],
        functionName: "donate",
        value: parseEther(amount),
      },
      {
        onSuccess: () => {
          toast.success("Donation successful!");
          setAmount("");
        },
        onError: (error) => {
          toast.error("Donation failed");
          console.error("Donation error:", error);
        },
      }
    );
  };

  const handleRequest = () => {
    writeContract(
      {
        address: CONTRACT_ADDRESS as `0x${string}`,
        abi: [
          {
            inputs: [{ name: "_fid", type: "uint256" }],
            name: "requestCelo",
            outputs: [],
            stateMutability: "nonpayable",
            type: "function",
          },
        ],
        functionName: "requestCelo",
        args: [1234n], // Replace with actual FID
      },
      {
        onSuccess: () => {
          toast.success("Request submitted!");
        },
        onError: (error) => {
          toast.error("Request failed");
          console.error("Request error:", error);
        },
      }
    );
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
          onClick={() => setActiveTab("request")}
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === "request"
              ? "bg-white dark:bg-gray-800 shadow-sm text-amber-600 dark:text-amber-400"
              : "text-gray-500 dark:text-gray-400"
          }`}
        >
          Request
        </button>
      </div>

      {!isConnected ? (
        <div className="p-6 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 text-center">
          <p className="text-gray-600 dark:text-gray-300">
            Please connect your wallet to {activeTab === "donate" ? "donate" : "request"} CELO
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
              onClick={handleDonate}
              disabled={isPending || !amount}
              className="w-full bg-emerald-600 hover:bg-emerald-700"
            >
              {isPending ? (
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
            <h3 className="font-medium text-gray-900 dark:text-white">Request CELO</h3>
          </div>
          <div className="space-y-4">
            <p className="text-sm text-gray-600 dark:text-gray-300">
              You can request 0.5 CELO once per day to explore the Celo ecosystem.
            </p>
            <Button
              onClick={handleRequest}
              disabled={isPending}
              className="w-full bg-amber-600 hover:bg-amber-700"
            >
              {isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <HandCoins className="w-4 h-4 mr-2" />
              )}
              Request 0.5 CELO
            </Button>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}