import { useState, useCallback } from "react";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Button } from "~/components/ui/Button";
import { useWalletClient, useWaitForTransactionReceipt } from "wagmi";
import { toast } from "react-hot-toast";
import { Send, Loader2, CheckCircle, XCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { truncateAddress } from "~/lib/truncateAddress";

const bankOfCeloAbi = [
  {
    inputs: [{ name: "_fid", type: "uint256" }],
    name: "requestCelo",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
];

const CONTRACT_ADDRESS = "YOUR_DEPLOYED_CONTRACT_ADDRESS";
const NEYNAR_API_KEY = "FF6C17E2-C5C4-4B55-9848-769D80022F83";

export default function RequestTab() {
  const { data: walletClient } = useWalletClient();
  const [fid, setFid] = useState("");
  const [requestTxHash, setRequestTxHash] = useState<string | null>(null);
  const [isRequesting, setIsRequesting] = useState(false);
  const [requestError, setRequestError] = useState<Error | null>(null);
  const [neynarScore, setNeynarScore] = useState<number | null>(null);
  const [isVerifyingFid, setIsVerifyingFid] = useState(false);

  const { isLoading: isRequestConfirming, isSuccess: isRequestConfirmed } =
    useWaitForTransactionReceipt({
      hash: requestTxHash as `0x${string}`,
    });

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

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="space-y-4"
    >
      <div className="p-4 bg-white dark:bg-gray-700 rounded-lg shadow">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Send className="w-4 h-4" /> Request CELO
        </h2>
        <div className="space-y-2 mt-4">
          <Label htmlFor="fid">Farcaster FID</Label>
          <Input
            id="fid"
            type="number"
            value={fid}
            onChange={(e) => setFid(e.target.value)}
            placeholder="e.g., 420564"
            className="text-black dark:text-white"
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
            disabled={isRequesting || isVerifyingFid || !fid}
            className="w-full bg-green-500 hover:bg-green-600"
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
                className="text-red-500 text-xs mt-1"
              >
                {requestError.message}
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
      </div>
    </motion.div>
  );
}