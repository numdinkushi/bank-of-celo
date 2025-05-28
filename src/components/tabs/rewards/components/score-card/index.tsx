/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useState, useEffect } from "react";
import {
    Zap,
    Star,
    Flame,
    TrendingUp,
    Award,
    Clock,
    Share2,
    Copy,
    X,
    ExternalLink,
    MessageCircle,
    Send,
    Mail,
    Facebook,
    Twitter,
} from "lucide-react";
import Image from "next/image";

// Enhanced ScoreCard with Share functionality
type ScoreCardProps = {
    onShare: () => void;
};

const ScoreCard = ({ onShare }: ScoreCardProps) => {
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

            {/* Share Button */}

            <div className="relative z-10">
                <button
                    onClick={onShare}
                    className="absolute top-4 left-0 bg-amber-500/20 hover:bg-amber-500/30 p-2 rounded-full transition-all duration-200 hover:scale-110 border border-amber-300/30"
                    aria-label="Share your score"
                >
                    <Share2 className="w-7 h-7 text-amber-600" />
                </button>
                {/* Header with icon */}
                {/* <div className="flex items-center justify-center mb-6">
          <div className="bg-emerald-500/20 p-3 rounded-full mr-3">
            <TrendingUp className="w-6 h-6 text-emerald-600" />
          </div>
          <p className="text-gray-600 text-lg font-medium">Your Score</p>
        </div> */}

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

// Share Modal/Drawer Component
type ShareDrawerProps = {
    isOpen: boolean;
    onClose: () => void;
    userProfile: {
        username?: string;
        profileImage?: string | null;
    };
};

const ShareDrawer = ({ isOpen, onClose, userProfile }: ShareDrawerProps) => {
    const [copied, setCopied] = useState(false);
    const shareUrl = "https://bank-of-celo.vercel.app/?tab=rewards";
    const shareText = `Check out my progress on Bank of Celo! Join me in exploring DeFi on Celo 🌱`;

    const copyToClipboard = async () => {
        try {
            await navigator.clipboard.writeText(shareUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy: ', err);
        }
    };

    const shareOptions = [
        {
            name: "WhatsApp",
            icon: MessageCircle,
            color: "bg-green-500",
            action: () => {
                window.open(`https://wa.me/?text=${encodeURIComponent(shareText + " " + shareUrl)}`, '_blank');
            }
        },
        {
            name: "Telegram",
            icon: Send,
            color: "bg-blue-500",
            action: () => {
                window.open(`https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`, '_blank');
            }
        },
        {
            name: "Twitter",
            icon: Twitter,
            color: "bg-sky-500",
            action: () => {
                window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`, '_blank');
            }
        },
        {
            name: "Email",
            icon: Mail,
            color: "bg-gray-600",
            action: () => {
                window.open(`mailto:?subject=${encodeURIComponent("Bank of Celo")}&body=${encodeURIComponent(shareText + "\n\n" + shareUrl)}`, '_blank');
            }
        }
    ];

    const handleNativeShare = async () => {
        if (navigator.share) {
            try {
                await navigator.share({
                    title: "Bank of Celo",
                    text: shareText,
                    url: shareUrl,
                });
            } catch (err) {
                console.error('Error sharing: ', err);
            }
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end justify-center">
            <div className="bg-white rounded-t-3xl w-full max-w-md max-h-[80vh] overflow-y-auto shadow-2xl animate-in slide-in-from-bottom duration-300">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-100">
                    <h2 className="text-xl font-bold text-gray-900">Share Your Progress</h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                    >
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                {/* User Profile Section */}
                <div className="p-6 bg-gradient-to-r from-emerald-50 to-teal-50 border-b border-gray-100">
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-full flex items-center justify-center">
                            {userProfile?.profileImage ? (
                                <Image
                                    height={20}
                                    width={20}
                                    src={userProfile.profileImage}
                                    alt="Profile"
                                    className="w-full h-full rounded-full object-cover"
                                />
                            ) : (
                                <div className="text-white font-bold text-xl">
                                    {userProfile?.username?.[0]?.toUpperCase() || "U"}
                                </div>
                            )}
                        </div>
                        <div>
                            <h3 className="font-semibold text-gray-900">
                                {userProfile?.username || "Anonymous User"}
                            </h3>
                            <p className="text-sm text-gray-600">Score: &lt; 500</p>
                            <div className="flex items-center gap-1 mt-1">
                                <Flame className="w-4 h-4 text-emerald-500" />
                                <span className="text-sm text-emerald-600 font-medium">Growing</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Share URL */}
                <div className="p-6 border-b border-gray-100">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Share Link
                    </label>
                    <div className="flex items-center gap-2 bg-gray-50 rounded-lg p-3">
                        <input
                            type="text"
                            value={shareUrl}
                            readOnly
                            className="flex-1 bg-transparent text-sm text-gray-600 outline-none"
                        />
                        <button
                            onClick={copyToClipboard}
                            className="flex items-center gap-1 bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-1 rounded-md text-sm transition-colors"
                        >
                            <Copy className="w-4 h-4" />
                            {copied ? "Copied!" : "Copy"}
                        </button>
                    </div>
                </div>

                {/* Share Options */}
                <div className="p-6">
                    <h3 className="text-sm font-medium text-gray-700 mb-4">Share to</h3>
                    <div className="grid grid-cols-2 gap-3">
                        {shareOptions.map((option) => (
                            <button
                                key={option.name}
                                onClick={option.action}
                                className="flex items-center gap-3 p-4 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors"
                            >
                                <div
                                    className={`w-10 h-10 ${option.color} rounded-full flex items-center justify-center`}
                                >
                                    <option.icon className="w-5 h-5 text-white" />
                                </div>
                                <span className="font-medium text-gray-700">{option.name}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 bg-gray-50 text-center">
                    <p className="text-xs text-gray-500">
                        Invite friends to join Bank of Celo and explore DeFi together!
                    </p>
                </div>
            </div>
        </div>
    );
};

// Main App Component with URL handling
const SocreCardsComponent = () => {
    const [showShareDrawer, setShowShareDrawer] = useState(false);
    const [activeTab, setActiveTab] = useState("home");
    const [showWelcome, setShowWelcome] = useState(true);

    // Mock user profile - replace with actual user data
    const userProfile = {
        username: "celobuilder",
        profileImage: null, // Replace with actual Farcaster profile image URL
    };

    // Handle URL parameters for deep linking
    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const tabParam = urlParams.get('tab');

        if (tabParam === 'rewards') {
            // Close welcome modal and navigate to rewards tab
            setShowWelcome(false);
            setActiveTab('rewards');
        }
    }, []);

    const handleShare = () => {
        setShowShareDrawer(true);
    };

    return (
        <div className=" bg-white text-gray-900">
            <ScoreCard onShare={handleShare} />

            {/* Share Drawer */}
            <ShareDrawer
                isOpen={showShareDrawer}
                onClose={() => setShowShareDrawer(false)}
                userProfile={userProfile}
            />
        </div>
    );
};

export default SocreCardsComponent;