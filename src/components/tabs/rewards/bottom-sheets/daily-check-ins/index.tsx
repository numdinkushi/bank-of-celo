import { CheckCircle2, Flame, Gift } from "lucide-react";
import { BottomSheet } from "../../components/bottomSheet";

// Daily Check-in Sheet Component
export const DailyCheckinSheet: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    dailyPoints: number;
    checkinStreak: number;
    canCheckinToday: boolean;
    canClaimReward: boolean;
    onCheckin: () => void;
    onClaimReward: () => void;
}> = ({
    isOpen,
    onClose,
    dailyPoints,
    checkinStreak,
    canCheckinToday,
    canClaimReward,
    onCheckin,
    onClaimReward
}) => {
        const progressPercentage = (dailyPoints / 2000) * 100;

        return (
            <BottomSheet
                isOpen={isOpen}
                onClose={onClose}
                title="Daily Check-in"
                className="max-h-screen"
            >
                <div className="space-y-6">
                    {/* Progress Card */}
                    <div className="bg-gradient-to-r from-blue-500/20 to-blue-600/20 rounded-xl p-6 border border-blue-500/30">
                        <div className="text-center mb-4">
                            <div className="text-3xl font-bold text-blue-400 mb-1">{dailyPoints}/2000</div>
                            <div className="text-blue-300 text-sm">Points to claim reward</div>
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full bg-gray-700/50 rounded-full h-3 mb-4">
                            <div
                                className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full transition-all duration-500"
                                style={{ width: `${progressPercentage}%` }}
                            />
                        </div>

                        <div className="text-center text-gray-300 text-sm">
                            {2000 - dailyPoints} points remaining
                        </div>
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
                    {canCheckinToday ? (
                        <button
                            onClick={onCheckin}
                            className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold py-4 px-6 rounded-xl hover:scale-[1.02] transition-all duration-300 flex items-center justify-center gap-3 shadow-lg"
                        >
                            <CheckCircle2 className="w-5 h-5" />
                            Check In Today (+10 points)
                        </button>
                    ) : (
                        <div className="w-full bg-gray-500/20 text-gray-400 font-semibold py-4 px-6 rounded-xl flex items-center justify-center gap-3">
                            <CheckCircle2 className="w-5 h-5" />
                            Already checked in today
                        </div>
                    )}

                    {/* Claim Reward Button */}
                    {canClaimReward ? (
                        <button
                            onClick={onClaimReward}
                            className="w-full bg-gradient-to-r from-emerald-600 to-emerald-700 text-white font-semibold py-4 px-6 rounded-xl hover:scale-[1.02] transition-all duration-300 flex items-center justify-center gap-3 shadow-lg animate-pulse"
                        >
                            <Gift className="w-5 h-5" />
                            Claim Your Reward!
                        </button>
                    ) : (
                        <div className="w-full bg-gray-500/20 text-gray-400 font-semibold py-4 px-6 rounded-xl flex items-center justify-center gap-3">
                            <Gift className="w-5 h-5" />
                            Reward available at 2000 points
                        </div>
                    )}

                    {/* Info Card */}
                    <div className="bg-gray-500/10 rounded-xl p-4 border border-gray-500/20">
                        <h4 className="text-white font-semibold mb-2">How it works:</h4>
                        <ul className="text-gray-300 text-sm space-y-1">
                            <li>• Check in daily to earn 10 points</li>
                            <li>• Collect 2000 points to claim your reward</li>
                            <li>• Maintain your streak for bonus rewards</li>
                            <li>• Points reset after claiming</li>
                        </ul>
                    </div>
                </div>
            </BottomSheet>
        );
    };