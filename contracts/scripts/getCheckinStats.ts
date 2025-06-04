import { ethers } from "ethers";
import fs from "fs";

async function main() {
  const contractAddress = "0xaFbFAaac9c495C74de33c039C0B56172b393d2Ad";
  const deploymentBlock = 34968748; // Estimated for May 28, 2025
  
  // Use the provider from hardhat instead of creating a new one
  const provider = new ethers.providers.JsonRpcProvider("https://forno.celo.org");  
  // Or if you need to use a specific provider:
  // const provider = new ethers.providers.JsonRpcProvider("https://celo-mainnet.g.alchemy.com/v2/ImPte7otRAJ_4gDny9NLO_Ao9GT4_CiQ");

  const currentBlock = await provider.getBlockNumber();
  console.log(`⏳ Fetching check-in stats from block ${deploymentBlock} to ${currentBlock}...`);

  // Contract ABI
  const abi = [
    {
      anonymous: false,
      inputs: [
        { indexed: true, name: "user", type: "address" },
        { indexed: true, name: "day", type: "uint256" },
        { indexed: true, name: "round", type: "uint256" },
      ],
      name: "CheckedIn",
      type: "event",
    },
    {
      inputs: [],
      name: "currentRound",
      outputs: [{ name: "", type: "uint256" }],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [{ name: "round", type: "uint256" }],
      name: "rounds",
      outputs: [
        { name: "startTime", type: "uint256" },
        { name: "isActive", type: "bool" },
        { name: "participantCount", type: "uint256" },
        { name: "totalCheckIns", type: "uint256" },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [
        { name: "", type: "uint256" },
        { name: "", type: "address" },
      ],
      name: "userRoundData",
      outputs: [
        { name: "checkInCount", type: "uint256" },
        { name: "hasClaimed", type: "bool" },
      ],
      stateMutability: "view",
      type: "function",
    },
  ];

  // Get contract instance using the ABI
  const contract = new ethers.Contract(contractAddress, abi, provider);

  // Get current round
  const currentRound = await contract.currentRound();
  console.log(`ℹ️ Current Round: ${currentRound}`);

  // Get round data
  const roundData = await contract.rounds(currentRound);
  console.log(`ℹ️ Raw Round Data:`, roundData);

  // Destructure roundData
  const [startTime, isActive, participantCount, totalCheckIns] = roundData;

  // Handle startTime
  let startTimeDisplay = "Invalid or not set";
  if (startTime && Number(startTime) > 0) {
    startTimeDisplay = new Date(Number(startTime) * 1000).toISOString();
  }

  console.log(`\n📊 Round ${currentRound} Stats:`);
  console.log(`- Start Time: ${startTimeDisplay}`);
  console.log(`- Active: ${isActive}`);
  console.log(`- Total Participants: ${participantCount}`);
  console.log(`- Total Check-Ins: ${totalCheckIns}`);

  // Fetch CheckedIn events to get user addresses
  console.log(`\n⏳ Fetching CheckedIn events to collect user addresses...`);
  const maxBlockRange = 2000; // Increased range for better performance
  const userAddresses = new Set<string>();
  
  for (let fromBlock = deploymentBlock; fromBlock <= currentBlock; fromBlock += maxBlockRange) {
    const toBlock = Math.min(fromBlock + maxBlockRange - 1, currentBlock);
    console.log(`Fetching events from block ${fromBlock} to ${toBlock}...`);

    try {
      const checkInFilter = contract.filters.CheckedIn(null, null, currentRound);
      const checkInBatch = await contract.queryFilter(checkInFilter, fromBlock, toBlock);
      checkInBatch.forEach((event) => {
        if (event.args && event.args.user) {
          userAddresses.add(event.args.user.toLowerCase());
        }
      });
    } catch (error) {
      console.warn(`⚠️ Error fetching events for block range ${fromBlock}-${toBlock}: ${error instanceof Error ? error.message : String(error)}`);
      // Add a delay before retrying
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  console.log(`ℹ️ Found ${userAddresses.size} unique user addresses`);

  // If no addresses found, exit
  if (userAddresses.size === 0) {
    console.error("\n❌ No user addresses found. Possible issues:");
    console.log("- No check-ins in the scanned block range.");
    console.log("- Incorrect deploymentBlock (try a later block).");
    console.log("- RPC issues (check Alchemy dashboard).");
    console.log("- Contract address or round number is incorrect.");
    process.exit(1);
  }

  // Fetch user data
  console.log(`\n⏳ Fetching user data for ${userAddresses.size} addresses...`);
  const userStats: { address: string; checkInCount: number; hasClaimed: boolean }[] = [];

  // Convert Set to Array for easier processing
  const userAddressesArray = Array.from(userAddresses);
  
  for (let i = 0; i < userAddressesArray.length; i++) {
    const address = userAddressesArray[i];
    try {
      const userData = await contract.userRoundData(currentRound, address);
      const checkInCount = Number(userData.checkInCount);
      const hasClaimed = userData.hasClaimed;

      if (checkInCount > 0) {
        userStats.push({
          address,
          checkInCount,
          hasClaimed,
        });
      }
      
      // Show progress
      if (i % 10 === 0 || i === userAddressesArray.length - 1) {
        console.log(`Processed ${i + 1}/${userAddressesArray.length} users...`);
      }
    } catch (error) {
      console.warn(`⚠️ Error fetching userRoundData for ${address}: ${error instanceof Error ? error.message : String(error)}`);
    }

    // Delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 200));
  }

  // Sort by check-in count (descending)
  userStats.sort((a, b) => b.checkInCount - a.checkInCount);

  // Calculate statistics
  const totalParticipants = userStats.length;
  const perfectCheckIns = userStats.filter(u => u.checkInCount === 6).length;
  const averageCheckIns = totalParticipants > 0
    ? userStats.reduce((sum, u) => sum + u.checkInCount, 0) / totalParticipants
    : 0;
  const eligibleForRewards = userStats.filter(u => !u.hasClaimed && u.checkInCount >= 6).length;

  // Display results
  console.log("\n📊 Check-In Statistics (Current Round):");
  console.log(`- Total Participants: ${totalParticipants}`);
  console.log(`- Users with all 6 days checked in: ${perfectCheckIns}`);
  console.log(`- Average check-ins per user: ${averageCheckIns.toFixed(2)}`);
  console.log(`- Users eligible for rewards (6+ check-ins, unclaimed): ${eligibleForRewards}`);

  console.log("\n🏆 Top Participants by Check-Ins:");
  const topParticipants = userStats.slice(0, 10); // Show top 10
  topParticipants.forEach((user, index) => {
    console.log(`${index + 1}. ${user.address} - ${user.checkInCount} check-ins (Claimed: ${user.hasClaimed})`);
  });

  // Save to JSON file
  const output = {
    round: Number(currentRound),
    totalParticipants,
    totalCheckIns: Number(totalCheckIns),
    perfectCheckIns,
    averageCheckIns: averageCheckIns.toFixed(2),
    eligibleForRewards,
    startTime: startTimeDisplay,
    isActive,
    userStats,
  };
  
  fs.writeFileSync("check-in-stats.json", JSON.stringify(output, null, 2));
  console.log("\n📄 Saved to check-in-stats.json");

  if (userStats.length === 0) {
    console.log("\n❌ No check-in data found. Possible issues:");
    console.log("- No check-ins in the scanned block range.");
    console.log("- Incorrect deploymentBlock (try a later block).");
    console.log("- RPC issues (check Alchemy dashboard).");
    console.log("- Contract address or round number is incorrect.");
  }
}

main().catch((err) => {
  console.error("Error fetching check-in stats:", err instanceof Error ? err.message : String(err));
  process.exit(1);
});