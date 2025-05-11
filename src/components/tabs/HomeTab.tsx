import { motion } from "framer-motion";
import { Info } from "lucide-react";

interface HomeTabProps {
  vaultBalance: string;
}

export default function HomeTab({ vaultBalance }: HomeTabProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="space-y-4"
    >
      <div className="p-4 bg-gradient-to-r from-green-100 to-yellow-100 dark:from-green-800 dark:to-yellow-800 rounded-lg text-center">
        <motion.span
          key={vaultBalance}
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 200 }}
          className="text-3xl font-bold text-green-700 dark:text-green-300"
        >
          {parseFloat(vaultBalance).toFixed(2)}
        </motion.span>{" "}
        <span className="text-lg">CELO</span>
        <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">
          Vault Balance
        </p>
      </div>
      <div className="p-4 bg-white dark:bg-gray-700 rounded-lg shadow">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Info className="w-4 h-4" /> About Bank of Celo
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">
          Support the Celo ecosystem by donating CELO or request 0.5 CELO to explore the blockchain. Swap tokens to Celo using our bridge!
        </p>
      </div>
    </motion.div>
  );
}