import React from 'react';
import { BottomSheet } from '../../components/bottomSheet';
import { TierItem } from '../../tiers-and-redeem/tier';

interface RewardTiersSheetProps {
    isOpen: boolean;
    onClose: () => void;
}

const RewardTiersSheet: React.FC<RewardTiersSheetProps> = ({ isOpen, onClose }) => {
    return (
        <BottomSheet
            isOpen={isOpen}
            onClose={onClose}
            title="Reward Tiers"
            className="max-h-screen"
        >
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
        </BottomSheet>
    );
};

export default RewardTiersSheet;