import React from "react";
import { Star } from "lucide-react";
import SelfProtocolComponent from "~/app/services/self-protocol/self";
import { BottomSheet } from "../../components/bottomSheet";

interface OGearningSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const OGearningSheet: React.FC<OGearningSheetProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
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
              <h3 className="text-white font-semibold mb-1">
                Unlock Exceptional Earning
              </h3>
              <p className="text-gray-300 text-sm leading-relaxed">
                Verified O.G users receive up to 2x multiplier on their weekly
                scores and exclusive access to premium reward tiers.
              </p>
            </div>
          </div>
        </div>

        <div className="bg-emerald-500/10 rounded-xl p-4 border border-emerald-500/20 mb-6">
          <h4 className="text-emerald-400 font-medium text-sm mb-2">
            O.G Benefits:
          </h4>
          <ul className="text-gray-300 text-sm space-y-1">
            <li>• 2x score multiplier</li>
            <li>• Exclusive premium tiers</li>
            <li>• Priority reward distribution</li>
            <li>• Early access to new features</li>
          </ul>
        </div>
      </div>
      <SelfProtocolComponent onSuccess={onSuccess} />
    </BottomSheet>
  );
};

export default OGearningSheet;
