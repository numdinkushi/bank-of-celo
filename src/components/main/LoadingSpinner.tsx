import { motion } from "framer-motion";
import { Home } from "lucide-react";

interface LoadingSpinnerProps {
    isSDKLoading?: boolean;
}

export default function LoadingSpinner({ isSDKLoading = false }: LoadingSpinnerProps) {
    if (isSDKLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-emerald-100 to-amber-100 dark:from-emerald-950 dark:to-amber-950">
                <motion.div
                    animate={{ rotate: 360, scale: [1, 1.2, 1] }}
                    transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
                >
                    <Home className="w-12 h-12 text-emerald-500 dark:text-emerald-300" />
                </motion.div>
            </div>
        );
    }

    return (
        <div className="absolute inset-0 bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm flex items-center justify-center z-20 rounded-xl">
            <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full"
            />
        </div>
    );
}