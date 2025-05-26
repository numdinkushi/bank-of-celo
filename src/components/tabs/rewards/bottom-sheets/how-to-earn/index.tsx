import React from 'react';
import { Edit3, Trophy, DollarSign } from 'lucide-react';
import { BottomSheet } from '../../components/bottomSheet';
import { EarnItem } from '../../earn/EarnItem';

interface HowToEarnSheetProps {
    isOpen: boolean;
    onClose: () => void;
}

const HowToEarnSheet: React.FC<HowToEarnSheetProps> = ({ isOpen, onClose }) => {
    return (
        <BottomSheet
            isOpen={isOpen}
            onClose={onClose}
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
    );
};

export default HowToEarnSheet;
