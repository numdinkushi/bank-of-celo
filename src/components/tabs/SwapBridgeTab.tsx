/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from "react";
import { useAccount, useSwitchChain } from "wagmi";
import { Button } from "~/components/ui/Button";
import { ArrowLeftRight, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { celo } from "wagmi/chains";

declare global {
    interface Window {
      Squid?: any; // Replace 'any' with the actual type if available
    }
  }

export default function SwapBridgeTab() {
  const { isConnected, chainId } = useAccount();
  const { switchChain, isPending: isSwitching } = useSwitchChain();
  const [isWidgetLoaded, setIsWidgetLoaded] = useState(false);

  useEffect(() => {
    // Dynamically load Squid widget script
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
    if (!window.Squid) return;
    const squid = new window.Squid({
      integratorId: "YOUR_SQUID_INTEGRATOR_ID", // Replace with your Squid integrator ID
      config: {
        chains: [celo.id],
        defaultChainId: celo.id,
        theme: "light", // or "dark"
      },
    });
    squid.init();
    squid.open();
  };

  const handleSwitchToCelo = () => {
    switchChain({ chainId: celo.id });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="space-y-4"
    >
      <div className="p-4 bg-white dark:bg-gray-700 rounded-lg shadow">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <ArrowLeftRight className="w-4 h-4" /> Swap/Bridge Tokens
        </h2>
        <div className="space-y-4 mt-4">
          {!isConnected ? (
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Please connect your wallet to swap or bridge tokens.
            </p>
          ) : chainId !== celo.id ? (
            <Button
              onClick={handleSwitchToCelo}
              disabled={isSwitching}
              className="w-full bg-green-500 hover:bg-green-600"
            >
              {isSwitching ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <ArrowLeftRight className="w-4 h-4 mr-2" />
              )}
              Switch to Celo
            </Button>
          ) : !isWidgetLoaded ? (
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Loading Squid Router widget...
            </p>
          ) : (
            <Button
              onClick={initializeWidget}
              className="w-full bg-green-500 hover:bg-green-600"
            >
              <ArrowLeftRight className="w-4 h-4 mr-2" />
              Open Swap/Bridge
            </Button>
          )}
        </div>
      </div>
    </motion.div>
  );
}