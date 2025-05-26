import React, {  } from "react";
import {
  Zap,
  Star,
  Flame,
  TrendingUp,
  Award,
  Clock,
} from "lucide-react";

const ScoreCard = () => {
    return (
        <div className="relative bg-gradient-to-br from-emerald-500/20 via-emerald-400/15 to-teal-500/20 backdrop-blur-xl rounded-3xl p-8 mb-8 border border-emerald-200/50 shadow-xl overflow-hidden">
            {/* Background decorative elements */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-emerald-300/20 to-transparent rounded-full -translate-y-16 translate-x-16" />
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-teal-300/20 to-transparent rounded-full translate-y-12 -translate-x-12" />

            {/* Floating icons */}
            <div className="absolute top-4 right-4 text-emerald-400/30">
                <Zap className="w-6 h-6" />
            </div>
            <div className="absolute bottom-4 left-4 text-teal-400/30">
                <Star className="w-5 h-5" />
            </div>

            <div className="relative z-10">
                {/* Header with icon */}
                <div className="flex items-center justify-center mb-6">
                    <div className="bg-emerald-500/20 p-3 rounded-full mr-3">
                        <TrendingUp className="w-6 h-6 text-emerald-600" />
                    </div>
                    <p className="text-gray-600 text-lg font-medium">Your Score</p>
                </div>

                {/* Main score with decorative elements */}
                <div className="text-center mb-8">
                    <div className="relative inline-block">
                        <div className="text-7xl font-bold text-gray-900 mb-2 relative">
                            &lt; 500
                            <div className="absolute -top-2 -right-2">
                                <div className="w-4 h-4 bg-emerald-500 rounded-full animate-pulse" />
                            </div>
                        </div>

                        {/* Score status indicator */}
                        <div className="flex items-center justify-center mt-3 mb-6">
                            <div className="bg-emerald-100 text-emerald-700 px-4 py-2 rounded-full text-sm font-semibold flex items-center gap-2">
                                <Flame className="w-4 h-4" />
                                Growing
                            </div>
                        </div>
                    </div>
                </div>

                {/* Enhanced divider */}
                <div className="relative mb-6">
                    <div className="h-px bg-gradient-to-r from-transparent via-emerald-300/50 to-transparent" />
                    <div className="absolute left-1/2 top-0 transform -translate-x-1/2 -translate-y-1/2">
                        <div className="w-2 h-2 bg-emerald-400 rounded-full" />
                    </div>
                </div>

                {/* Bottom info with enhanced styling */}
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2 text-gray-600">
                        <Clock className="w-4 h-4 text-emerald-500" />
                        <span className="text-sm font-medium">Round ends</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-sm font-bold flex items-center gap-1">
                            <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" />
                            5d 17h
                        </div>
                    </div>
                </div>

                {/* Additional stats row */}
                <div className="mt-6 pt-6 border-t border-emerald-200/30">
                    <div className="flex justify-between items-center text-sm">
                        <div className="flex items-center gap-2 text-gray-600">
                            <Award className="w-4 h-4 text-purple-500" />
                            <span>Current Rank</span>
                        </div>
                        <span className="text-gray-700 font-semibold">Unranked</span>
                    </div>
                </div>
            </div>
        </div>

    );
};

export default ScoreCard;