import React, { useState } from 'react';
import { BottomSheet } from '../../components/bottomSheet';
import { RewardItem, RewardItemProps } from './reward-item/RewardItem';
import { TierItem } from '../../tiers-and-redeem/tier';

interface RewardTiersSheetProps {
    isOpen: boolean;
    onClose: () => void;
    rewardItems: RewardItemProps[];
    onRedeem: (rewardId: string) => void;
}

const RewardTiersSheet: React.FC<RewardTiersSheetProps> = ({ isOpen, onClose, rewardItems, onRedeem }) => {
    const [activeRewardTab, setActiveRewardTab] = useState<'tiers' | 'redeem'>('tiers');

    return (
        <BottomSheet
            isOpen={isOpen}
            onClose={onClose}
            title="Rewards"
            className="max-h-screen"
        >
            <div>
                {/* Tab Navigation */}
                <div className="flex bg-gray-700/50 rounded-xl p-1 mb-6">
                    <button
                        onClick={() => setActiveRewardTab('tiers')}
                        className={`flex-1 py-3 px-4 rounded-lg font-medium text-sm transition-all duration-200 ${activeRewardTab === 'tiers'
                            ? 'bg-emerald-600 text-white shadow-lg'
                            : 'text-gray-300 hover:text-white hover:bg-gray-600/50'
                            }`}
                    >
                        Tiers
                    </button>
                    <button
                        onClick={() => setActiveRewardTab('redeem')}
                        className={`flex-1 py-3 px-4 rounded-lg font-medium text-sm transition-all duration-200 ${activeRewardTab === 'redeem'
                            ? 'bg-emerald-600 text-white shadow-lg'
                            : 'text-gray-300 hover:text-white hover:bg-gray-600/50'
                            }`}
                    >
                        Redeem
                    </button>
                </div>

                {/* Tab Content */}
                <div className="min-h-[400px]">
                    {activeRewardTab === 'tiers' ? (
                        <div className="space-y-2">
                            <TierItem tier="Tier 1" prize="300" winners="Top 10 winners" />
                            <TierItem tier="Tier 2" prize="100" winners="Next 20 winners" />
                            <TierItem tier="Tier 3" prize="25" winners="Next 200 winners" />
                            <TierItem tier="Tier 4" prize="10" winners="Next 300 winners" />
                            <TierItem tier="Tier 5" prize="5" winners="Next 500 winners" />
                            <TierItem
                                tier="Tier 6"
                                prize="3"
                                winners="Next 1500 winners"
                                isLast={true}
                            />
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {/* Stats Header */}
                            <div className="bg-gradient-to-r from-emerald-500/20 to-emerald-600/20 rounded-xl p-4 mb-6 border border-emerald-500/30">
                                <div className="flex items-center justify-between text-center">
                                    <div>
                                        <div className="text-2xl font-bold text-emerald-400">{rewardItems.filter(r => r.status === 'available').length}</div>
                                        <div className="text-xs text-emerald-300">Available</div>
                                    </div>
                                    <div>
                                        <div className="text-2xl font-bold text-gray-300">{rewardItems.filter(r => r.status === 'claimed').length}</div>
                                        <div className="text-xs text-gray-400">Claimed</div>
                                    </div>
                                    <div>
                                        <div className="text-2xl font-bold text-orange-400">{rewardItems.filter(r => r.status === 'locked').length}</div>
                                        <div className="text-xs text-orange-300">Locked</div>
                                    </div>
                                </div>
                            </div>

                            {/* Reward Items */}
                            {rewardItems.map(reward => (
                                <RewardItem
                                    key={reward.id}
                                    {...reward}
                                    onRedeem={onRedeem}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </BottomSheet>
    );
};

export default RewardTiersSheet;
