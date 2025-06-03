/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useState, useRef } from "react";
import {
  Trophy,
  Users,
  Star,
  Calendar,
  Target,
  Shield,
  Flame,
  TrendingUp,
  Coins,
  Crown,
  Gift,
  CheckCircle2,
} from "lucide-react";
import { RewardItemProps } from "./bottom-sheets/reward-tiers-sheet/reward-item/RewardItem";
import ScoreCard from "./components/score-card";
import MiniCards from "./components/mini-cards";
import ScoredLastWeek from "./bottom-sheets/scored-last-week";
import OGearningSheet from "./bottom-sheets/og-earning";
import RewardTiersSheet from "./bottom-sheets/reward-tiers-sheet";
import HowToEarnSheet from "./bottom-sheets/how-to-earn";
import LeaderboardSheet from "./bottom-sheets/leader-board";
import { ClaimsSheet } from "./bottom-sheets/claims";
import { DailyCheckinSheet } from "./bottom-sheets/daily-check-ins";

interface MiniCard {
  id: "scored" | "rewards" | "earn" | "leaderboard" | "og-earning";
  title: string;
  value: string;
  icon: React.ReactNode;
  bgColor: string;
  iconColor?: "purple" | "emerald" | "blue" | "gold";
}

type ActiveSheet =
  | "scored"
  | "rewards"
  | "earn"
  | "leaderboard"
  | "og-earning"
  | "claims"
  | "daily-checkin"
  | null;

export default function Rewards(): JSX.Element {
  const [activeSheet, setActiveSheet] = useState<ActiveSheet>(null);
  const [isReady, setIsReady] = useState<boolean>(false);

  const [rewardItems, setRewardItems] = useState<RewardItemProps[]>([
    {
      id: "1",
      title: "Weekly Bonus",
      amount: "$25 USDC",
      description: "Bonus reward for consistent weekly participation",
      status: "available",
      icon: <Coins className="w-6 h-6 text-emerald-400" />,
      rarity: "common",
    },
    {
      id: "2",
      title: "Engagement Master",
      amount: "$100 USDC",
      description: "Achieved 1000+ engagement points this week",
      status: "available",
      icon: <TrendingUp className="w-6 h-6 text-blue-400" />,
      rarity: "rare",
    },
    {
      id: "3",
      title: "Top Creator",
      amount: "$500 USDC",
      description: "Ranked in top 10 creators this month",
      status: "locked",
      icon: <Crown className="w-6 h-6 text-purple-400" />,
      rarity: "epic",
    },
    {
      id: "4",
      title: "Legend Status",
      amount: "$1000 USDC",
      description: "Exclusive reward for legendary contributors",
      status: "locked",
      icon: <Star className="w-6 h-6 text-yellow-400" />,
      rarity: "legendary",
    },
    {
      id: "5",
      title: "Daily Streak",
      amount: "$10 USDC",
      description: "Maintained 30-day posting streak",
      status: "claimed",
      icon: <Flame className="w-6 h-6 text-orange-400" />,
      rarity: "common",
    },
  ]);

  const scrollRef = useRef<HTMLDivElement>(null);

  const miniCards: MiniCard[] = [
    {
      id: "leaderboard",
      title: "Leaderboard",
      value: "",
      icon: <Users className="w-4 h-4 text-blue-600" />,
      bgColor: "bg-gray-100/80",
      iconColor: "blue",
    },
    {
      id: "og-earning",
      title: "O.G Earning",
      value: "",
      icon: <Shield className="w-4 h-4 text-yellow-600" />,
      bgColor: "bg-gray-100/80",
      iconColor: "gold",
    },
    {
      id: "rewards",
      title: "Reward Tiers",
      value: "",
      icon: <Trophy className="w-4 h-4 text-purple-600" />,
      bgColor: "bg-gray-100/80",
      iconColor: "purple",
    },
    {
      id: "earn",
      title: "How to Earn",
      value: "",
      icon: <Target className="w-4 h-4 text-emerald-600" />,
      bgColor: "bg-gray-100/80",
      iconColor: "emerald",
    },
    {
      id: "scored",
      title: "Scored last week",
      value: "500",
      icon: <Calendar className="w-4 h-4" />,
      bgColor: "bg-gray-100/80",
    },
  ];

  const openSheet = (sheetId: ActiveSheet): void => {
    setActiveSheet(sheetId);
  };

  const closeSheet = (): void => {
    setActiveSheet(null);
  };

  const handleVerificationSuccess = (): void => {
    closeSheet();
    // Handle successful verification - could update user state, show success message, etc.
  };

  const handleRewardRedeem = (rewardId: string): void => {
    setRewardItems((prev) =>
      prev.map((item) =>
        item.id === rewardId ? { ...item, status: "claimed" as const } : item,
      ),
    );
  };

  return (
    <div className="min-h-screen bg-white text-gray-900 rounded-md relative overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-gray-50 via-white to-gray-50" />
      <div className="absolute top-0 left-0 w-full h-64 bg-gradient-to-b from-emerald-500/10 to-transparent" />
      <div className="relative z-1 p-6 pb-32">
        {/* Score Card */}
        <ScoreCard />

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-6">
          <button
            disabled={!isReady}
            onClick={() => openSheet("claims")}
            className="flex-1 bg-gradient-to-r from-emerald-500/20 to-emerald-600/20 border border-emerald-500/30 rounded-xl sm:rounded-2xl p-3 sm:p-4 flex items-center justify-center gap-2 sm:gap-3 hover:scale-[1.02] transition-all duration-300 hover:shadow-lg hover:shadow-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Gift className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600" />
            <span className="font-semibold text-sm sm:text-base text-emerald-700">
              Claim
            </span>
          </button>

          <button
            onClick={() => openSheet("daily-checkin")}
            className="flex-1 bg-gradient-to-r from-blue-500/20 to-blue-600/20 border border-blue-500/30 rounded-xl sm:rounded-2xl p-3 sm:p-4 flex items-center justify-center gap-2 sm:gap-3 hover:scale-[1.02] transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/20"
          >
            <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
            <span className="font-semibold text-sm sm:text-base text-blue-700">
              Check In
            </span>
          </button>
        </div>

        {/* Mini Cards */}
        <MiniCards
          miniCards={miniCards}
          openSheet={openSheet}
          scrollRef={scrollRef}
        />
      </div>

      {/* Scored Last Week Sheet */}
      <ScoredLastWeek
        isOpen={activeSheet === "scored"}
        onClose={closeSheet}
        title="Your weekly score"
      />

      {/* O.G Earning Sheet */}
      <OGearningSheet
        isOpen={activeSheet === "og-earning"}
        onClose={closeSheet}
        onSuccess={handleVerificationSuccess}
      />

      {/* Reward Tiers Sheet */}
      <RewardTiersSheet
        isOpen={activeSheet === "rewards"}
        onClose={closeSheet}
      />

      {/* How to Earn Sheet */}
      <HowToEarnSheet isOpen={activeSheet === "earn"} onClose={closeSheet} />

      {/* Leaderboard Sheet */}
      <LeaderboardSheet
        isOpen={activeSheet === "leaderboard"}
        onClose={closeSheet}
      />

      {/* Claims Sheet */}
      <ClaimsSheet
        isOpen={activeSheet === "claims"}
        onClose={closeSheet}
        rewardItems={rewardItems}
        onRedeem={handleRewardRedeem}
      />

      {/* Daily Check-in Sheet */}
      <DailyCheckinSheet
        isOpen={activeSheet === "daily-checkin"}
        onClose={closeSheet}
      />

      <style jsx>{`
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
}
