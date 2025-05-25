/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getUniversalLink } from "@selfxyz/core";
import SelfQRcodeWrapper, {
  SelfAppBuilder,
  type SelfApp,
} from "@selfxyz/qrcode";
import { Shield, Copy, ExternalLink, CheckCircle, Verified } from "lucide-react";
import { useAccount } from "wagmi";
import { APP_ICON_URL } from "~/lib/constants";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";

interface SelfProtocolComponentProps {
  onSuccess?: () => void;
}

const SelfProtocolComponent: React.FC<SelfProtocolComponentProps> = ({
  onSuccess,
}) => {
  const { address } = useAccount();
  const router = useRouter();
  const [linkCopied, setLinkCopied] = useState<boolean>(false);
  const [showToast, setShowToast] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string>("");
  const [selfApp, setSelfApp] = useState<SelfApp | null>(null);
  const [universalLink, setUniversalLink] = useState<string>("");

  // Check if user is already verified OG
  const userData = useQuery(api.users.checkAddressExists, {
    address: address || "",
  });
  const isVerifiedOG = useQuery(api.users.getUserByFid, {
    fid: address || "",
  })?.isOG;

  const minimumAge = 18;
  const requireName = true;
  const checkOFAC = true;

  useEffect(() => {
    if (!address || isVerifiedOG) return;

    try {
      const app = new SelfAppBuilder({
        appName: process.env.NEXT_PUBLIC_SELF_APP_NAME || "Bank of Celo",
        scope: process.env.NEXT_PUBLIC_SELF_SCOPE || "bank-of-celo",
        endpoint: `${process.env.NEXT_PUBLIC_SELF_ENDPOINT}`,
        logoBase64: APP_ICON_URL,
        userId: address,
        endpointType: "https",
        userIdType: "hex",
        disclosures: {
          minimumAge,
          ofac: checkOFAC,
          name: requireName,
        },
      }).build();

      setSelfApp(app);
      setUniversalLink(getUniversalLink(app));
    } catch (error) {
      console.log("Failed to initialize Self app:", error);
    }
  }, [address, checkOFAC, requireName, isVerifiedOG]);

  const displayToast = (message: string): void => {
    setToastMessage(message);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  const copyToClipboard = (): void => {
    if (!universalLink) return;

    navigator.clipboard
      .writeText(universalLink)
      .then(() => {
        setLinkCopied(true);
        displayToast("Universal link copied to clipboard!");
        setTimeout(() => setLinkCopied(false), 2000);
      })
      .catch((err) => {
        console.log("Failed to copy text: ", err);
        displayToast("Failed to copy link");
      });
  };

  const openSelfApp = (): void => {
    if (!universalLink) return;

    window.open(universalLink, "_blank");
    displayToast("Opening Self App...");
  };

  const handleSuccessfulVerification = (): void => {
    displayToast("Verification successful! Redirecting...");
    if (onSuccess) {
      onSuccess();
    } else {
      setTimeout(() => {
        router.push("/");
      }, 1500);
    }
  };

  if (isVerifiedOG) {
    return (
      <div className="min-h-screen w-full bg-gradient-to-br from-gray-900 via-gray-900 to-emerald-900 flex flex-col items-center justify-center p-4 sm:p-6 md:p-8">
        <div className="text-center max-w-md mx-auto">
          {/* Verified OG Status */}
          <div className="mb-6">
            <div className="w-16 h-16 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-full mx-auto mb-4 flex items-center justify-center">
              <Verified className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">
              You are Verified!
            </h3>
            <p className="text-gray-300 text-sm leading-relaxed">
              Your identity has been successfully verified. You now have access to
              O.G benefits including 2x rewards!
            </p>
          </div>

          {/* Celebration Card */}
          <div className="bg-emerald-500/10 rounded-xl p-6 border border-emerald-500/20 mb-6">
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 bg-emerald-500 rounded-full flex items-center justify-center mb-3">
                <Verified className="w-6 h-6 text-white" />
              </div>
              <h4 className="text-emerald-400 font-medium text-sm mb-2">
                O.G Status Active
              </h4>
              <p className="text-gray-300 text-xs">
                Enjoy your exclusive benefits across the platform
              </p>
            </div>
          </div>

          <button
            onClick={() => router.push("/")}
            className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 transition-colors text-white py-3 px-6 rounded-xl font-medium w-full"
          >
            Continue to App
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-gray-900 via-gray-900 to-emerald-900 flex flex-col items-center justify-center p-4 sm:p-6 md:p-8">
      <div className="text-center max-w-md mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="w-16 h-16 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-full mx-auto mb-4 flex items-center justify-center">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">
            Verify Your Identity
          </h3>
          <p className="text-gray-300 text-sm leading-relaxed">
            Scan QR code with Self Protocol App to unlock O.G earning potential
          </p>
        </div>

        {/* QR Code Container */}
        <div className="bg-white rounded-2xl p-6 mb-20 mt-10 mx-auto w-64">
          <div className="w-48 h-48 mx-auto flex items-center justify-center rounded-xl">
            {selfApp ? (
              <div className="">
                <SelfQRcodeWrapper
                  selfApp={selfApp}
                  onSuccess={handleSuccessfulVerification}
                />
              </div>
            ) : (
              <div className="w-full h-full bg-gray-100 flex items-center justify-center rounded-xl border-2 border-gray-200">
                <div className="text-center">
                  <div className="w-12 h-12 bg-emerald-500 rounded-lg mx-auto mb-2 flex items-center justify-center animate-pulse">
                    <Shield className="w-6 h-6 text-white" />
                  </div>
                  <p className="text-gray-600 text-xs">QR Code Loading...</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-3 mb-6 mt-8">
          <button
            type="button"
            onClick={copyToClipboard}
            disabled={!universalLink}
            className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 transition-colors text-white py-3 px-4 rounded-xl font-medium disabled:bg-emerald-400 disabled:cursor-not-allowed"
          >
            <Copy className="w-4 h-4" />
            {linkCopied ? "Copied!" : "Copy Universal Link"}
          </button>

          <button
            type="button"
            onClick={openSelfApp}
            disabled={!universalLink}
            className="flex items-center justify-center gap-2 bg-gray-700 hover:bg-gray-600 transition-colors text-white py-3 px-4 rounded-xl font-medium disabled:bg-gray-500 disabled:cursor-not-allowed"
          >
            <ExternalLink className="w-4 h-4" />
            Open Self App
          </button>
        </div>

        {/* Verification Requirements */}
        <div className="bg-emerald-500/10 rounded-xl p-4 border border-emerald-500/20">
          <h4 className="text-emerald-400 font-medium text-sm mb-3">
            Verification Requirements:
          </h4>
          <ul className="text-gray-300 text-xs space-y-2">
            <li className="flex items-center gap-2">
              <CheckCircle className="w-3 h-3 text-emerald-400 flex-shrink-0" />
              <span>Minimum Age: {minimumAge}+ years</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle className="w-3 h-3 text-emerald-400 flex-shrink-0" />
              <span>Name Verification Required</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle className="w-3 h-3 text-emerald-400 flex-shrink-0" />
              <span>OFAC Compliance Enabled</span>
            </li>
          </ul>
        </div>

        {/* Toast notification */}
        {showToast && (
          <div className="fixed bottom-4 right-4 bg-emerald-600 text-white py-2 px-4 rounded-lg shadow-lg text-sm z-50">
            {toastMessage}
          </div>
        )}
      </div>
    </div>
  );
};

export default SelfProtocolComponent;