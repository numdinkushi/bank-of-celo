/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from "react";
import { usePublicClient } from "wagmi";
import { formatEther } from "viem";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, Loader2 } from "lucide-react";
import { Button } from "~/components/ui/Button";
import { truncateAddress } from "~/lib/truncateAddress";

import { AbiEvent } from "viem";

const bankOfCeloAbi: AbiEvent[] = [
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

interface Donation {
  donor: string;
  amount: string;
}

export default function LeaderboardTab() {
  const publicClient = usePublicClient();
  const [donations, setDonations] = useState<Donation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchDonations = async () => {
    setIsLoading(true);
    try {
      // Note: In production, use a backend to fetch historical events
      if (!publicClient) {
        console.error("Public client is undefined");
        setIsLoading(false);
        return;
      }
      const logs = await publicClient.getLogs({
        address: CONTRACT_ADDRESS as `0x${string}`,
        event: bankOfCeloAbi.find((item) => item.name === "Donated"),
        fromBlock: BigInt(0),
      });
      const donationMap: { [key: string]: bigint } = {};
      logs.forEach((log: any) => {
        const donor = log.args.donor as string;
        const amount = log.args.amount as bigint;
        donationMap[donor] = (donationMap[donor] || BigInt(0)) + amount;
      });
      const sortedDonations = Object.entries(donationMap)
        .map(([donor, amount]) => ({
          donor,
          amount: formatEther(amount),
        }))
        .sort((a, b) => parseFloat(b.amount) - parseFloat(a.amount));
      setDonations(sortedDonations);
    } catch (error) {
      console.error("Failed to fetch donations:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDonations();
    const unwatch = publicClient
      ? publicClient.watchContractEvent({
          address: CONTRACT_ADDRESS as `0x${string}`,
          abi: bankOfCeloAbi,
          eventName: "Donated",
          onLogs: () => fetchDonations(), // Refresh on new donations
        })
      : () => {};
    return () => unwatch();
  }, [publicClient]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="space-y-4"
    >
      <div className="p-4 bg-white dark:bg-gray-700 rounded-lg shadow">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Trophy className="w-4 h-4" /> Leaderboard
          </h2>
          <Button
            onClick={fetchDonations}
            disabled={isLoading}
            className="text-green-500 hover:bg-green-100"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Refresh"}
          </Button>
        </div>
        {isLoading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="w-6 h-6 animate-spin text-green-500" />
          </div>
        ) : donations.length === 0 ? (
          <p className="text-sm text-gray-600 dark:text-gray-300 mt-4">
            No donations yet. Be the first to contribute!
          </p>
        ) : (
          <div className="mt-4 space-y-2">
            <AnimatePresence>
              {donations.map((donation, index) => (
                <motion.div
                  key={donation.donor}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center p-2 bg-green-50 dark:bg-green-900 rounded-lg"
                >
                  <span className="w-8 text-center text-sm font-bold text-green-600 dark:text-green-400">
                    #{index + 1}
                  </span>
                  <span className="flex-1 font-mono text-sm truncate">
                    {truncateAddress(donation.donor)}
                  </span>
                  <span className="text-sm font-semibold">
                    {parseFloat(donation.amount).toFixed(2)} CELO
                  </span>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </motion.div>
  );
}