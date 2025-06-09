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
    { address: "0xd66c3603aaeae3d03bc521434aff992a8af6af17", amount: "36000" }, // @trh 
    { address: "0x5e3cd56eaab5f45a8f09337555ce03d36bb08ebe", amount: "6037" }, // @aaizu.eth
    { address: "0xf6cc71878e23c05406b35946cd9d378e0f2f4f2f", amount: "6022" }, // @baeshy.eth
    { address: "0xa499ccf474840fbeab6eb58a23b487fe99de6d9e", amount: "42048" }, // @lorenzo-007
    { address: "0x9ca210c5aa54f942461a1ed0629b84dec4186bf4", amount: "4000" }, // @just-austin
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
