interface TierItemProps {
  tier: string;
  prize: string;
  winners: string;
  isLast?: boolean;
}

export const TierItem: React.FC<TierItemProps> = ({
  tier,
  prize,
  winners,
  isLast = false,
}) => (
  <div className={`py-6 ${!isLast ? "border-b border-gray-500/50" : ""}`}>
    <div className="flex justify-between items-start">
      <div>
        <h3 className="text-white font-semibold text-lg mb-1">
          {tier} ~ {prize} $CELO
        </h3>
        <p className="text-gray-300 text-sm">{winners}</p>
      </div>
      <div className="bg-emerald-500/20 text-emerald-400 px-3 py-1 rounded-full text-xs font-medium">
        {prize} $celo
      </div>
    </div>
  </div>
);
