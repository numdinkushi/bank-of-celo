import { useState, useCallback } from "react";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Button } from "~/components/ui/Button";
import { useWalletClient, useWaitForTransactionReceipt } from "wagmi";
import { parseEther } from "viem";
import { toast } from "react-hot-toast";
import { Send, Loader2, CheckCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { truncateAddress } from "~/lib/truncateAddress";

const bankOfCeloAbi = [
  {
    inputs: [],
    name: "donate",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
];

const CONTRACT_ADDRESS = "YOUR_DEPLOYED_CONTRACT_ADDRESS";

export default function DonateTab() {
  const { data: walletClient } = useWalletClient();
  const [donationAmount, setDonationAmount] = useState("");
  const [donateTxHash, setDonateTxHash] = useState<string | null>(null);
  const [isDonating, setIsDonating] = useState(false);
  const [donateError, setDonateError] = useState<Error | null>(null);

  const { isLoading: isDonateConfirming, isSuccess: isDonateConfirmed } =
    useWaitForTransactionReceipt({
      hash: donateTxHash as `0x${string}`,
    });

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

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="space-y-4"
    >
      <div className="p-4 bg-white dark:bg-gray-700 rounded-lg shadow">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Send className="w-4 h-4" /> Donate CELO
        </h2>
        <div className="space-y-2 mt-4">
          <Label htmlFor="donation-amount">Amount (CELO)</Label>
          <Input
            id="donation-amount"
            type="number"
            step="0.01"
            min="0"
            value={donationAmount}
            onChange={(e) => setDonationAmount(e.target.value)}
            placeholder="e.g., 1.0"
            className="text-black dark:text-white"
            aria-invalid={donateError ? "true" : "false"}
          />
          <Button
            onClick={handleDonate}
            disabled={isDonating || !donationAmount}
            className="w-full bg-green-500 hover:bg-green-600"
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
                className="text-red-500 text-xs mt-1"
              >
                {donateError.message}
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
      </div>
    </motion.div>
  );
}