import React, { useState, useRef, useEffect } from 'react';
import { Zap, Trophy, Users, Gift, Star, Calendar, Coins, Target, Edit3, DollarSign, X, Shield, CheckCircle, Copy, ExternalLink } from 'lucide-react';
import SelfProtocolComponent from '~/app/services/self-protocol/self';
import LeaderBoard from './leader-board/Leaderboard';
import Image from 'next/image';

interface BottomSheetProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
    className?: string;
}

interface TierItemProps {
    tier: string;
    prize: string;
    winners: string;
    isLast?: boolean;
}

interface EarnItemProps {
    icon: React.ReactNode;
    title: string;
    description: string;
}

interface MiniCard {
    id: 'scored' | 'rewards' | 'earn' | 'leaderboard' | 'og-earning';
    title: string;
    value: string;
    icon: React.ReactNode;
    bgColor: string;
    iconColor?: 'purple' | 'emerald' | 'blue' | 'gold';
}

type ActiveSheet = 'scored' | 'rewards' | 'earn' | 'leaderboard' | 'og-earning' | null;

const BottomSheet: React.FC<BottomSheetProps> = ({ isOpen, onClose, title, children, className = "" }) => {
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 ">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300"
                onClick={onClose}
            />

            {/* Sheet - Increased height to extend above middle */}
            <div className={`absolute bottom-0  left-1/2 transform -translate-x-1/2 w-96 max-w-[90vw] h-3/4 rounded-t-3xl bg-gray-800/95 backdrop-blur-xl transition-transform duration-300 ${className}`}>
                <div className="w-12 h-1.5 bg-gray-400 rounded-full mx-auto mt-4 mb-6" />
                <div className="px-6 pb-8 h-full overflow-y-auto">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-2xl font-bold text-white">{title}</h2>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-gray-700/50 rounded-full transition-colors"
                        >
                            <X className="w-5 h-5 text-gray-400" />
                        </button>
                    </div>
                    <div className="mb-10 pb-12">
                        {children}
                    </div>
                </div>
            </div>
        </div>
    );
};

const TierItem: React.FC<TierItemProps> = ({ tier, prize, winners, isLast = false }) => (
    <div className={`py-6 ${!isLast ? 'border-b border-gray-500/50' : ''}`}>
        <div className="flex justify-between items-start">
            <div>
                <h3 className="text-white font-semibold text-lg mb-1">
                    {tier} – ${prize} Prize
                </h3>
                <p className="text-gray-300 text-sm">{winners}</p>
            </div>
            <div className="bg-emerald-500/20 text-emerald-400 px-3 py-1 rounded-full text-xs font-medium">
                ${prize}
            </div>
        </div>
    </div>
);

const EarnItem: React.FC<EarnItemProps> = ({ icon, title, description }) => (
    <div className="bg-gray-700/50 backdrop-blur-sm rounded-2xl p-6 mb-4 border border-gray-600/30">
        <div className="flex items-start space-x-4">
            <div className="bg-emerald-500/20 p-3 rounded-xl">
                {icon}
            </div>
            <div className="flex-1">
                <h3 className="text-white font-semibold text-lg mb-2">{title}</h3>
                <p className="text-gray-300 text-sm leading-relaxed">{description}</p>
            </div>
        </div>
    </div>
);

export default function WarpcastWalletApp({address}: {address: string}): JSX.Element {
    const [activeSheet, setActiveSheet] = useState<ActiveSheet>(null);
    const scrollRef = useRef<HTMLDivElement>(null);

    const miniCards: MiniCard[] = [
        {
            id: 'scored',
            title: 'Scored last week',
            value: '500',
            icon: <Calendar className="w-4 h-4" />,
            bgColor: 'bg-gray-100/80'
        },
        {
            id: 'og-earning',
            title: 'O.G Earning',
            value: '',
            icon: <Shield className="w-4 h-4 text-yellow-600" />,
            bgColor: 'bg-gray-100/80',
            iconColor: 'gold'
        },
        {
            id: 'rewards',
            title: 'Reward Tiers',
            value: '',
            icon: <Trophy className="w-4 h-4 text-purple-600" />,
            bgColor: 'bg-gray-100/80',
            iconColor: 'purple'
        },
        {
            id: 'earn',
            title: 'How to Earn',
            value: '',
            icon: <Target className="w-4 h-4 text-emerald-600" />,
            bgColor: 'bg-gray-100/80',
            iconColor: 'emerald'
        },
        {
            id: 'leaderboard',
            title: 'Leaderboard',
            value: '',
            icon: <Users className="w-4 h-4 text-blue-600" />,
            bgColor: 'bg-gray-100/80',
            iconColor: 'blue'
        }
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

    return (
        <div className="min-h-screen bg-white text-gray-900 rounded-md relative overflow-hidden">
            {/* Background gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-gray-50 via-white to-gray-50" />
            <div className="absolute top-0 left-0 w-full h-64 bg-gradient-to-b from-emerald-500/10 to-transparent" />

            <div className="relative z-1 p-6 pb-32">
                {/* Boost Card */}
                <div className="bg-gradient-to-r from-emerald-500/20 to-emerald-600/20 backdrop-blur-sm rounded-3xl p-6 mb-8 border border-emerald-500/30 shadow-lg">
                    <div className="flex items-start space-x-4">
                        <div className="bg-emerald-500/30 p-3 rounded-xl">
                            <Zap className="w-6 h-6 text-emerald-600" />
                        </div>
                        <div className="flex-1">
                            <h2 className="text-xl font-bold text-gray-900 mb-2">
                                Boost your score by funding your wallet!
                            </h2>
                            <p className="text-gray-700 text-sm leading-relaxed">
                                Users with $50 in their Warpcast Wallet will get a +500 point boost this week.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Score Card */}
                <div className="bg-gradient-to-r from-emerald-500/20 to-emerald-600/20  backdrop-blur-xl rounded-3xl p-8 mb-8 border border-gray-200/50 shadow-lg">
                    <div className="text-center">
                        <p className="text-gray-600 text-lg mb-4">Your score</p>
                        <div className="text-6xl font-bold text-gray-900 mb-6">
                            &lt; 500
                        </div>
                        <div className="h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent mb-6" />
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-600">Round ends</span>
                            <span className="text-gray-900 font-semibold">5d 17h</span>
                        </div>
                    </div>
                </div>

                {/* Mini Cards */}
                <div
                    ref={scrollRef}
                    className="flex space-x-3 overflow-x-auto pb-4 scrollbar-hide"
                    style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                >
                    {miniCards.map((card) => (
                        <button
                            key={card.id}
                            onClick={() => openSheet(card.id)}
                            className={`${card.bgColor} backdrop-blur-sm rounded-xl p-4 min-w-32 flex-shrink-0 border border-gray-200/50 hover:border-emerald-500/50 transition-all duration-300 hover:scale-105 active:scale-95 shadow-sm`}
                        >
                            <div className="flex flex-col items-start">
                                <div className={`p-2 rounded-lg mb-2 ${card.iconColor === 'purple' ? 'bg-purple-100' :
                                    card.iconColor === 'emerald' ? 'bg-emerald-100' :
                                        card.iconColor === 'blue' ? 'bg-blue-100' :
                                            card.iconColor === 'gold' ? 'bg-yellow-100' : 'bg-gray-200'
                                    }`}>
                                    {card.icon}
                                </div>
                                <h3 className="text-gray-900 font-medium text-xs text-left mb-1 leading-tight">
                                    {card.title}
                                </h3>
                                {card.value && (
                                    <p className="text-lg font-bold text-gray-900 text-left">
                                        {card.value}
                                    </p>
                                )}
                            </div>
                        </button>
                    ))}
                </div>
            </div>

            {/* Bottom Sheets */}

            {/* Scored Last Week Sheet */}
            <BottomSheet
                isOpen={activeSheet === 'scored'}
                onClose={closeSheet}
                title="Your weekly score"
            >
                <div className="text-center mb-8">
                    <div className="w-20 h-20 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-full mx-auto mb-6 flex items-center justify-center">
                        <Image
                            src="/api/placeholder/60/60"
                            alt="Profile"
                            width={20}
                            height={20}
                            className="w-16 h-16 rounded-full object-cover border-2 border-white/20"
                        />
                    </div>
                    <div className="text-5xl font-bold text-white mb-8">500</div>
                </div>

                <div className="space-y-6">
                    <div className="flex justify-between items-center py-4 border-b border-gray-500/50">
                        <span className="text-gray-300">Your rank</span>
                        <span className="text-white font-semibold">None</span>
                    </div>
                    <div className="flex justify-between items-center py-4">
                        <span className="text-gray-300">Week</span>
                        <span className="text-white font-semibold">May 13 - 20</span>
                    </div>
                </div>
            </BottomSheet>

            {/* O.G Earning Sheet */}
            <BottomSheet
                isOpen={activeSheet === 'og-earning'}
                onClose={closeSheet}
                title="O.G Earning"
                className="max-h-screen"
            >
                <div className="mb-6">
                    <div className="bg-gradient-to-r from-yellow-500/20 to-yellow-600/20 rounded-xl p-4 mb-4 border border-yellow-500/30">
                        <div className="flex items-start gap-3">
                            <div className="bg-yellow-500/30 p-2 rounded-lg">
                                <Star className="w-5 h-5 text-yellow-600" />
                            </div>
                            <div>
                                <h3 className="text-white font-semibold mb-1">Unlock Exceptional Earning</h3>
                                <p className="text-gray-300 text-sm leading-relaxed">
                                    Verified O.G users receive up to 10x multiplier on their weekly scores and exclusive access to premium reward tiers.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-emerald-500/10 rounded-xl p-4 border border-emerald-500/20 mb-6">
                        <h4 className="text-emerald-400 font-medium text-sm mb-2">O.G Benefits:</h4>
                        <ul className="text-gray-300 text-sm space-y-1">
                            <li>• 10x score multiplier</li>
                            <li>• Exclusive premium tiers</li>
                            <li>• Priority reward distribution</li>
                            <li>• Early access to new features</li>
                        </ul>
                    </div>
                </div>
                <SelfProtocolComponent address={address} onSuccess={handleVerificationSuccess} />
                {/* <SelfProtocolVerification onSuccess={handleVerificationSuccess} /> */}
            </BottomSheet>

            {/* Reward Tiers Sheet */}
            <BottomSheet
                isOpen={activeSheet === 'rewards'}
                onClose={closeSheet}
                title="Reward Tiers"
                className="max-h-screen"
            >
                <div className="space-y-2">
                    <TierItem tier="Tier 1" prize="300" winners="Top 10 winners" />
                    <TierItem tier="Tier 2" prize="100" winners="Next 20 winners" />
                    <TierItem tier="Tier 3" prize="25" winners="Next 200 winners" />
                    <TierItem tier="Tier 4" prize="10" winners="Next 300 winners" />
                    <TierItem tier="Tier 5" prize="5" winners="Next 500 winners" />
                    <TierItem tier="Tier 6" prize="3" winners="Next 1500 winners" isLast={true} />
                </div>
            </BottomSheet>

            {/* How to Earn Sheet */}
            <BottomSheet
                isOpen={activeSheet === 'earn'}
                onClose={closeSheet}
                title="How to Earn"
                className="max-h-screen"
            >
                <div className="space-y-4">
                    <EarnItem
                        icon={<Edit3 className="w-6 h-6 text-emerald-400" />}
                        title="Cast and Engage"
                        description="Your score is based on the engagement your casts receive, adjusted by the number of followers."
                    />
                    <EarnItem
                        icon={<Trophy className="w-6 h-6 text-emerald-400" />}
                        title="Get Ranked → Top 2530"
                        description="Each week, the top 2530 accounts with the highest scores receive USDC rewards."
                    />
                    <EarnItem
                        icon={<DollarSign className="w-6 h-6 text-emerald-400" />}
                        title="Receive USDC"
                        description="Rewards are sent to your connected Ethereum address on Base."
                    />
                </div>
            </BottomSheet>

            {/* Leaderboard Sheet */}
            <BottomSheet
                isOpen={activeSheet === 'leaderboard'}
                onClose={closeSheet}
                title="Leaderboard"
            >
                <div className="text-center py-12">
                    <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <LeaderBoard />
                </div>
            </BottomSheet>

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