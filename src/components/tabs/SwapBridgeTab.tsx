/* eslint-disable react/no-unescaped-entities */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { useState, useEffect } from "react";
import { useAccount, useSwitchChain } from "wagmi";
import { Button } from "~/components/ui/Button";
import { ArrowLeftRight, Loader2, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";
import { celo } from "wagmi/chains";
import { toast } from "sonner";

declare global {
  interface Window {
    Squid?: any;
  }
}

export default function SwapBridgeTab() {
  const { isConnected, chainId } = useAccount();
  const { switchChain, isPending: isSwitching } = useSwitchChain();
  const [isWidgetLoaded, setIsWidgetLoaded] = useState(false);

  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://widget.squidrouter.com/v1/squid.js";
    script.async = true;
    script.onload = () => setIsWidgetLoaded(true);
    document.body.appendChild(script);
    return () => {
      document.body.removeChild(script);
    };
  }, []);

  const initializeWidget = () => {
    if (!window.Squid) {
      toast.error("Widget not loaded yet");
      return;
    }
    
    try {
      const squid = new window.Squid({
        integratorId: "YOUR_SQUID_INTEGRATOR_ID",
        config: {
          chains: [celo.id],
          defaultChainId: celo.id,
          theme: "light",
        },
      });
      squid.init();
      squid.open();
    } catch (error) {
      console.error("Failed to initialize widget:", error);
      toast.error("Failed to open swap widget");
    }
  };

  const handleSwitchToCelo = () => {
    switchChain({ chainId: celo.id }, {
      onError: (error) => {
        toast.error("Failed to switch to Celo");
        console.error("Switch chain error:", error);
      }
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      <div className="p-5 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
        <h2 className="text-lg font-semibold flex items-center gap-3 mb-4">
          <div className="bg-blue-100 dark:bg-blue-900 p-2 rounded-lg">
            <ArrowLeftRight className="w-5 h-5 text-blue-600 dark:text-blue-300" />
          </div>
          <span className="text-gray-900 dark:text-white">Swap & Bridge Tokens</span>
        </h2>
        
        <div className="space-y-4">
          {!isConnected ? (
            <div className="p-4 text-center bg-gray-50 dark:bg-gray-700 rounded-lg">
              <p className="text-gray-600 dark:text-gray-300">
                Connect your wallet to swap or bridge tokens
              </p>
            </div>
          ) : chainId !== celo.id ? (
            <Button
              onClick={handleSwitchToCelo}
              disabled={isSwitching}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              {isSwitching ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <ArrowLeftRight className="w-4 h-4 mr-2" />
              )}
              Switch to Celo Network
            </Button>
          ) : !isWidgetLoaded ? (
            <div className="flex items-center justify-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <Loader2 className="w-5 h-5 animate-spin text-blue-500 mr-2" />
              <span className="text-gray-600 dark:text-gray-300">Loading widget...</span>
            </div>
          ) : (
            <div className="space-y-3">
              <Button
                onClick={initializeWidget}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                <ArrowLeftRight className="w-4 h-4 mr-2" />
                Open Swap Widget
              </Button>
              <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
                Powered by Squid Router
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bridge Information */}
      <div className="p-5 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
        <h3 className="font-medium text-gray-900 dark:text-white mb-3">How to Bridge</h3>
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <div className="bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold mt-0.5">
              1
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Connect your wallet and ensure you're on the Celo network
            </p>
          </div>
          <div className="flex items-start gap-3">
            <div className="bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold mt-0.5">
              2
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Open the swap widget and select "Bridge" tab
            </p>
          </div>
          <div className="flex items-start gap-3">
            <div className="bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold mt-0.5">
              3
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Select tokens and networks, then confirm the transaction
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}