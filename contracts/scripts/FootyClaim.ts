/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-require-imports */
import hre from "hardhat";
import { parseEther } from "viem";
import { ethers } from "ethers";
import { config as dotenvConfig } from "dotenv";

dotenvConfig();

async function main() {
  // === Wallet & RPC clients ===
  const [walletClient] = await hre.viem.getWalletClients();
  const publicClient = await hre.viem.getPublicClient();

  // === Contract setup ===
  const contractAddress = "0x727556F2afF622797228CC80cf6Af46b10ad126e"; // your FootyScoresClaim
  const abi = [
    {
      inputs: [
        { internalType: "address[]", name: "_addresses", type: "address[]" },
        { internalType: "uint256[]", name: "_amounts", type: "uint256[]" },
      ],
      name: "whitelistAddresses",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
  ];
  const contract = await hre.viem.getContractAt(
    "FootyScoresClaim",
    contractAddress,
  );

  // === Prepare your list ===
  // Replace these entries with the real addresses and amounts you need
  const claimList: { address: string; amount: string }[] = [
    { address: "0xdD8eE5555744d6842e3c572e46F42092ed7326b6", amount: "100" },

  ];

  const addresses = claimList.map((c) => c.address);
  const amounts = claimList.map((c) => parseEther(c.amount));

  console.log("🔖 Whitelisting addresses:", addresses);
  console.log("💰 With amounts (raw):", amounts);

  // === Send transaction ===
  const txHash = await walletClient.writeContract({
    address: contractAddress,
    abi,
    functionName: "whitelistAddresses",
    args: [addresses, amounts],
  });
  console.log("📤 Tx submitted:", txHash);

  // === Wait for confirmation ===
  const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
  if (receipt.status === "success") {
    console.log("✅ Whitelist successful!");
  } else {
    console.error("❌ Transaction failed:", receipt);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
