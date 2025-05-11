/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from "react";
import { usePublicClient } from "wagmi";
import { formatEther } from "viem";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, Loader2, Award, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "~/components/ui/Button";
import { truncateAddress } from "~/lib/truncateAddress";
import { toast } from "sonner";

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
  const [expandedDonor, setExpandedDonor] = useState<string | null>(null);

  const fetchDonations = async () => {
    setIsLoading(true);
    try {
      if (!publicClient) {
        toast.error("Wallet connection error");
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
      toast.success("Leaderboard updated");
    } catch (error) {
      console.error("Failed to fetch donations:", error);
      toast.error("Failed to load leaderboard");
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
          onLogs: () => fetchDonations(),
        })
      : () => {};
    return () => unwatch();
  }, [publicClient]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      <div className="p-5 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold flex items-center gap-3">
            <div className="bg-purple-100 dark:bg-purple-900 p-2 rounded-lg">
              <Trophy className="w-5 h-5 text-purple-600 dark:text-purple-300" />
            </div>
            <span className="text-gray-900 dark:text-white">Top Donors</span>
          </h2>
          <Button
            onClick={fetchDonations}
            disabled={isLoading}
            className="text-xs font-medium bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-full px-3 py-1.5"
          >
            {isLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : "Refresh"}
          </Button>
        </div>
        
        {isLoading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
          </div>
        ) : donations.length === 0 ? (
          <div className="p-4 text-center bg-gray-50 dark:bg-gray-700 rounded-lg">
            <p className="text-gray-600 dark:text-gray-300">
              No donations yet. Be the first to contribute!
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            <AnimatePresence>
              {donations.map((donation, index) => (
                <motion.div
                  key={donation.donor}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  transition={{ delay: index * 0.05 }}
                  className={`overflow-hidden rounded-lg ${
                    expandedDonor === donation.donor 
                      ? "bg-purple-50 dark:bg-purple-900/30 border border-purple-100 dark:border-purple-800"
                      : "bg-gray-50 dark:bg-gray-700"
                  }`}
                >
                  <button
                    onClick={() => 
                      setExpandedDonor(expandedDonor === donation.donor ? null : donation.donor)
                    }
                    className="w-full flex items-center p-3"
                  >
                    <div className="flex items-center w-full">
                      <div className="w-8 h-8 flex items-center justify-center bg-purple-100 dark:bg-purple-900 rounded-full mr-3">
                        <span className="text-sm font-bold text-purple-600 dark:text-purple-300">
                          {index + 1}
                        </span>
                      </div>
                      <div className="text-left flex-1">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {truncateAddress(donation.donor)}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {parseFloat(donation.amount).toFixed(2)} CELO
                        </p>
                      </div>
                      {expandedDonor === donation.donor ? (
                        <ChevronUp className="w-4 h-4 text-gray-500" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-gray-500" />
                      )}
                    </div>
                  </button>
                  
                  {expandedDonor === donation.donor && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="px-3 pb-3"
                    >
                      <div className="pt-2 border-t border-purple-100 dark:border-purple-800">
                        <div className="flex justify-between text-xs text-gray-600 dark:text-gray-300">
                          <span>Total Donations:</span>
                          <span className="font-medium">
                            {parseFloat(donation.amount).toFixed(2)} CELO
                          </span>
                        </div>
                        <div className="flex justify-between text-xs text-gray-600 dark:text-gray-300 mt-1">
                          <span>Address:</span>
                          <span className="font-mono">{donation.donor}</span>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
      
      {/* Top Donor Highlight */}
      {donations.length > 0 && (
        <div className="p-5 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/30 dark:to-blue-900/30 rounded-2xl border border-purple-100 dark:border-purple-800">
          <div className="flex items-center gap-3 mb-3">
            <Award className="w-5 h-5 text-purple-600 dark:text-purple-300" />
            <h3 className="font-medium text-gray-900 dark:text-white">Top Donor</h3>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 flex items-center justify-center bg-purple-100 dark:bg-purple-900 rounded-full">
              <span className="text-sm font-bold text-purple-600 dark:text-purple-300">1</span>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {truncateAddress(donations[0].donor)}
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-300">
                {parseFloat(donations[0].amount).toFixed(2)} CELO donated
              </p>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}