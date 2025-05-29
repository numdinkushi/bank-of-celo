/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, Flame, Gift, Loader2, AlertCircle } from "lucide-react";
import { BottomSheet } from "../../components/bottomSheet";
import { Button } from "~/components/ui/Button";
import { toast } from "sonner";
import { useAccount, usePublicClient, useWriteContract, useSwitchChain, useSendTransaction } from "wagmi";
import { CELO_CHECK_IN_CONTRACT_ADDRESS, CELO_CHECK_IN_ABI } from "~/lib/constants";
import { encodeFunctionData, parseEther } from "viem";
import { getDataSuffix, submitReferral } from "@divvi/referral-sdk";

interface DailyCheckinSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

interface SignatureResponse {
  signature: string;
  error?: string;
}

export const DailyCheckinSheet: React.FC<DailyCheckinSheetProps> = ({ isOpen, onClose }) => {
  const { address, chainId } = useAccount();
  const publicClient = usePublicClient();
  const { writeContractAsync, isPending: isTxPending } = useWriteContract();
  const { switchChainAsync } = useSwitchChain();
  const { sendTransactionAsync } = useSendTransaction();
  const [dailyPoints, setDailyPoints] = useState(0);
  const [checkinStreak, setCheckinStreak] = useState(0);
  const [canCheckinToday, setCanCheckinToday] = useState(true);
  const [canClaimReward, setCanClaimReward] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const CELO_CHAIN_ID = 42220; // Celo mainnet
  const isCorrectChain = chainId === CELO_CHAIN_ID;
  const CHECK_IN_FEE = parseEther("0.001"); // From contract
  const POINTS_PER_CHECKIN = 10;
  const POINTS_FOR_REWARD = 70; // Adjusted to match 7 check-ins (7 * 10 = 70)

  // Fetch user status from contract
  const fetchUserStatus = useCallback(async () => {
    if (!address || !publicClient || !isCorrectChain) return;
    setIsLoading(true);
    setError(null);

    try {
      const [checkInCount, eligibleForReward, hasClaimed] = (await publicClient.readContract({
        address: CELO_CHECK_IN_CONTRACT_ADDRESS,
        abi: CELO_CHECK_IN_ABI,
        functionName: "getUserStatus",
        args: [address],
      })) as [bigint, boolean, boolean];

      const points = Number(checkInCount) * POINTS_PER_CHECKIN;
      setDailyPoints(points);
      setCanClaimReward(eligibleForReward && !hasClaimed);

      // Check if user has checked in today (simplified, assumes 1 check-in per day per round)
      const currentRound = Number(
        await publicClient.readContract({
          address: CELO_CHECK_IN_CONTRACT_ADDRESS,
          abi: CELO_CHECK_IN_ABI,
          functionName: "currentRound",
        })
      );
      const hasCheckedInToday = await publicClient.readContract({
        address: CELO_CHECK_IN_CONTRACT_ADDRESS,
        abi: CELO_CHECK_IN_ABI,
        functionName: "dailyCheckIns",
        args: [BigInt(currentRound), address, BigInt(1)], // Check day 1 as proxy
      });
      setCanCheckinToday(!hasCheckedInToday);

      // Simplified streak calculation (could be enhanced with contract storage)
      setCheckinStreak(Number(checkInCount));
    } catch (err) {
      console.error("Error fetching user status:", err);
      setError("Failed to load check-in status. Please try again.");
      toast.error("Failed to load check-in status.");
    } finally {
      setIsLoading(false);
    }
  }, [address, publicClient, isCorrectChain]);

  useEffect(() => {
    fetchUserStatus();
  }, [fetchUserStatus]);

  // Fetch signature from backend API
  const fetchSignature = async (type: "checkIn" | "claimReward", params: any): Promise<string> => {
    try {
      const response = await fetch("/api/sign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, ...params }),
      });
      const data: SignatureResponse = await response.json();
      if (!response.ok || data.error) {
        throw new Error(data.error || "Failed to fetch signature");
      }
      return data.signature;
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : "Signature generation failed");
    }
  };

  // Handle daily check-in
const handleCheckin = async () => {
  if (!address || !publicClient || !isCorrectChain) {
    toast.error("Please connect wallet and switch to Celo Network");
    return;
  }

  if (!canCheckinToday) {
    toast.error("You have already checked in today");
    return;
  }

  setIsLoading(true);
  setTxHash(null);
  setError(null);

  try {
    // Switch to Celo mainnet if needed
    if (!isCorrectChain) {
      await switchChainAsync({ chainId: CELO_CHAIN_ID });
    }

    const currentRound = Number(
      await publicClient.readContract({
        address: CELO_CHECK_IN_CONTRACT_ADDRESS,
        abi: CELO_CHECK_IN_ABI,
        functionName: "currentRound",
      })
    );

    // Get signature for check-in (day 1-7, cycling based on check-in count)
    const day = ((dailyPoints / POINTS_PER_CHECKIN) % 7) + 1;
    const signature = await fetchSignature("checkIn", {
      userAddress: address,
      day,
      round: currentRound,
    });

    // Check user's balance for check-in fee
    const balance = await publicClient.getBalance({ address });
    if (balance < CHECK_IN_FEE) {
      throw new Error("Insufficient CELO for check-in fee (0.001 CELO)");
    }

    // Encode the contract call data
    const checkInData = encodeFunctionData({
      abi: CELO_CHECK_IN_ABI,
      functionName: "checkIn",
      args: [BigInt(day), signature],
    });

    // Try to get Divi referral data (but don't fail if it doesn't work)
    let dataSuffix = "";
    try {
      const suffix = await getDataSuffix({
        consumer: "0xC5337CeE97fF5B190F26C4A12341dd210f26e17c",
        providers: [
          "0x5f0a55FaD9424ac99429f635dfb9bF20c3360Ab8",
          "0x6226ddE08402642964f9A6de844ea3116F0dFc7e",
        ],
      });
      // Ensure the suffix is properly formatted (starts with 0x)
      dataSuffix = suffix.startsWith("0x") ? suffix.slice(2) : suffix;
    } catch (diviError) {
      console.warn("Divi referral tracking failed, proceeding without it:", diviError);
    }

    // Combine the data (contract call + referral suffix if available)
    const combinedData = (checkInData + dataSuffix) as `0x${string}`;

    // Call checkIn
    const hash = await sendTransactionAsync({
      to: CELO_CHECK_IN_CONTRACT_ADDRESS,
      data: combinedData,
      value: CHECK_IN_FEE,
    });
    try {
            console.log("Submitting referral to Divi:", {
              txHash: hash,
              chainId: CELO_CHAIN_ID,
            });
            await submitReferral({
              txHash: hash,
              chainId: CELO_CHAIN_ID,
            });
            console.log("Referral submitted successfully");
          } catch (diviError) {
            console.error("Divi submitReferral error:", diviError);
            // Optionally show a warning toast, but don't mark donation as failed
            toast.warning(
              "Donation succeeded, but referral tracking failed. We're looking into it.",
            );
          }
    
    setTxHash(hash);
    toast.success(`Checked in successfully! Tx: ${hash.slice(0, 6)}...`);
    await fetchUserStatus(); // Refresh status
  } catch (err) {
    console.error("Check-in error:", err);
    const errorMsg = err instanceof Error ? err.message : "Failed to check in";
    setError(errorMsg);
    toast.error(errorMsg);
  } finally {
    setIsLoading(false);
  }
};
  // Handle reward claim
  const handleClaimReward = async () => {
    if (!address || !publicClient || !isCorrectChain) {
      toast.error("Please connect wallet and switch to Celo Network");
      return;
    }

    if (!canClaimReward) {
      toast.error("You are not eligible to claim a reward yet");
      return;
    }

    setIsLoading(true);
    setTxHash(null);
    setError(null);

    try {
      // Switch to Celo mainnet if needed
      if (!isCorrectChain) {
        await switchChainAsync({ chainId: CELO_CHAIN_ID });
      }

      const currentRound = Number(
        await publicClient.readContract({
          address: CELO_CHECK_IN_CONTRACT_ADDRESS,
          abi: CELO_CHECK_IN_ABI,
          functionName: "currentRound",
        })
      );

      // Generate a unique FID (for simplicity, use a random number; in production, integrate with Farcaster or user input)
      const fid = Math.floor(Math.random() * 1000000);
      const signature = await fetchSignature("claimReward", {
        userAddress: address,
        fid,
        round: currentRound,
      });

      // Call claimReward
      const hash = await writeContractAsync({
        address: CELO_CHECK_IN_CONTRACT_ADDRESS,
        abi: CELO_CHECK_IN_ABI,
        functionName: "claimReward",
        args: [BigInt(fid), signature],
      });

      setTxHash(hash);
      toast.success(`Reward claimed successfully! Tx: ${hash.slice(0, 6)}...`);
      await fetchUserStatus(); // Refresh status
    } catch (err) {
      console.error("Claim reward error:", err);
      const errorMsg = err instanceof Error ? err.message : "Failed to claim reward";
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const progressPercentage = (dailyPoints / POINTS_FOR_REWARD) * 100;

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title="Daily Check-in" className="max-h-screen">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="space-y-6"
      >
        {/* Error or Transaction Status */}
        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-900/30 rounded-lg text-sm text-red-800 dark:text-red-200 flex items-center">
            <AlertCircle className="w-4 h-4 mr-2" />
            {error}
          </div>
        )}
        {txHash && (
          <div className="p-3 bg-green-50 dark:bg-green-900/30 rounded-lg text-sm text-green-800 dark:text-green-200 flex items-center">
            <span>
              Transaction successful!{" "}
              <a
                href={`https://celoscan.io/tx/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                View on CeloScan
              </a>
            </span>
          </div>
        )}

        {/* Progress Card */}
        <div className="bg-gradient-to-r from-blue-500/20 to-blue-600/20 rounded-xl p-6 border border-blue-500/30">
          <div className="text-center mb-4">
            <div className="text-3xl font-bold text-blue-400 mb-1">
              {dailyPoints}/{POINTS_FOR_REWARD}
            </div>
            <div className="text-blue-300 text-sm">Points to claim reward</div>
          </div>
          <div className="w-full bg-gray-700/50 rounded-full h-3 mb-4">
            <div
              className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full transition-all duration-500"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
          <div className="text-center text-gray-300 text-sm">{POINTS_FOR_REWARD - dailyPoints} points remaining</div>
        </div>

        {/* Streak Card */}
        <div className="bg-gradient-to-r from-orange-500/20 to-orange-600/20 rounded-xl p-4 border border-orange-500/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Flame className="w-6 h-6 text-orange-400" />
              <div>
                <div className="text-white font-semibold">Current Streak</div>
                <div className="text-orange-300 text-sm">Keep it going!</div>
              </div>
            </div>
            <div className="text-2xl font-bold text-orange-400">{checkinStreak}</div>
          </div>
        </div>

        {/* Check-in Button */}
        {!isCorrectChain ? (
          <Button
            onClick={() => switchChainAsync({ chainId: CELO_CHAIN_ID })}
            className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold py-4 px-6 rounded-xl"
          >
            Switch to Celo Network
          </Button>
        ) : isLoading ? (
          <div className="w-full bg-gray-500/20 text-gray-400 font-semibold py-4 px-6 rounded-xl flex items-center justify-center gap-3">
            <Loader2 className="w-5 h-5 animate-spin" />
            Processing...
          </div>
        ) : canCheckinToday ? (
          <Button
            onClick={handleCheckin}
            disabled={isTxPending || !address}
            className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold py-4 px-6 rounded-xl hover:scale-[1.02] transition-all duration-300 flex items-center justify-center gap-3 shadow-lg"
          >
            <CheckCircle2 className="w-5 h-5" />
            Check In Today (+{POINTS_PER_CHECKIN} points)
          </Button>
        ) : (
          <div className="w-full bg-gray-500/20 text-gray-400 font-semibold py-4 px-6 rounded-xl flex items-center justify-center gap-3">
            <CheckCircle2 className="w-5 h-5" />
            Already checked in today
          </div>
        )}

        {/* Claim Reward Button */}
        {canClaimReward ? (
          <Button
            onClick={handleClaimReward}
            disabled={isTxPending || !address || !isCorrectChain}
            className="w-full bg-gradient-to-r from-emerald-600 to-emerald-700 text-white font-semibold py-4 px-6 rounded-xl hover:scale-[1.02] transition-all duration-300 flex items-center justify-center gap-3 shadow-lg animate-pulse"
          >
            <Gift className="w-5 h-5" />
            Claim Your Reward (1 CELO)
          </Button>
        ) : (
          <div className="w-full bg-gray-500/20 text-gray-400 font-semibold py-4 px-6 rounded-xl flex items-center justify-center gap-3">
            <Gift className="w-5 h-5" />
            Reward available at {POINTS_FOR_REWARD} points
          </div>
        )}

        {/* Info Card */}
        <div className="bg-gray-500/10 rounded-xl p-4 border border-gray-500/20">
          <h4 className="text-white font-semibold mb-2">How it works:</h4>
          <ul className="text-gray-300 text-sm space-y-1">
            <li>• Check in daily to earn {POINTS_PER_CHECKIN} points (0.001 CELO fee)</li>
            <li>• Complete 7 check-ins ({POINTS_FOR_REWARD} points) to claim $CELO at the end of the week </li>
            <li>• Maintain your streak for bonus engagement</li>
            <li>• Points reset after claiming</li>
          </ul>
        </div>
      </motion.div>
    </BottomSheet>
  );
};