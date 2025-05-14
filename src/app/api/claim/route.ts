import { NextRequest, NextResponse } from "next/server";
import { encodeFunctionData, createPublicClient, http } from "viem";
import { celo } from "viem/chains";
import { BANK_OF_CELO_CONTRACT_ABI, BANK_OF_CELO_CONTRACT_ADDRESS } from "~/lib/constants";

export async function POST(req: NextRequest) {
  try {
    const { address, fid, deadline, signature } = await req.json();

    if (!address || !fid || !deadline || !signature) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Initialize public client
    const publicClient = createPublicClient({
      chain: celo, 
      transport: http("forno.celo.org"),
    });

    // Encode claimGasless call
    const callData = encodeFunctionData({
      abi: BANK_OF_CELO_CONTRACT_ABI,
      functionName: "claimGasless",
      args: [address, BigInt(fid), BigInt(deadline), signature],
    });

    // Estimate gas limits
    const callGasLimit = await publicClient.estimateContractGas({
      address: BANK_OF_CELO_CONTRACT_ADDRESS,
      abi: BANK_OF_CELO_CONTRACT_ABI,
      functionName: "claimGasless",
      args: [address, BigInt(fid), BigInt(deadline), signature],
      account: address,
    });

    // Construct User Operation (EntryPoint v0.6 for simplicity)
    const userOperation = {
      sender: address, // User's EOA
      nonce: `0x${(await publicClient.getTransactionCount({ address })).toString(16)}`,
      initCode: "0x", // No smart account deployment
      callData,
      callGasLimit: `0x${callGasLimit.toString(16)}`,
      verificationGasLimit: "0x100000", // Static estimate; adjust if needed
      preVerificationGas: "0x10000", // Static estimate
      maxFeePerGas: "0x3b9aca00", // 1 Gwei
      maxPriorityFeePerGas: "0x3b9aca00", // 1 Gwei
      paymaster: null,
      paymasterVerificationGasLimit: null,
      paymasterPostOpGasLimit: null,
      paymasterData: null,
      signature: "0x", // Dummy signature (paymaster will override)
    };

    // Pimlico JSON-RPC endpoint
    const pimlicoApiKey = process.env.PIMLICO_API_KEY || "";
    const pimlicoUrl = `https://api.pimlico.io/v2/celo/rpc?apikey=${pimlicoApiKey}`;

    // Sponsor User Operation
    const sponsorResponse = await fetch(pimlicoUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "pm_sponsorUserOperation",
        params: [
          userOperation,
          "0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789", // EntryPoint v0.6
        ],
      }),
    });

    const sponsorResult = await sponsorResponse.json();
    if (sponsorResult.error) {
      throw new Error(`Sponsor failed: ${sponsorResult.error.message}`);
    }

    const sponsoredUserOperation = {
      ...userOperation,
      paymaster: sponsorResult.result.paymaster,
      paymasterVerificationGasLimit: sponsorResult.result.paymasterVerificationGasLimit,
      paymasterPostOpGasLimit: sponsorResult.result.paymasterPostOpGasLimit,
      paymasterData: sponsorResult.result.paymasterData,
      signature: userOperation.signature, // Keep dummy signature
    };

    // Submit User Operation
    const sendResponse = await fetch(pimlicoUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 2,
        method: "eth_sendUserOperation",
        params: [
          sponsoredUserOperation,
          "0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789", // EntryPoint v0.6
        ],
      }),
    });

    const sendResult = await sendResponse.json();
    if (sendResult.error) {
      throw new Error(`Send failed: ${sendResult.error.message}`);
    }

    const userOperationHash = sendResult.result;

    // Wait for inclusion
    let receipt = null;
    for (let i = 0; i < 30; i++) {
      const receiptResponse = await fetch(pimlicoUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 3,
          method: "eth_getUserOperationReceipt",
          params: [userOperationHash],
        }),
      });

      const receiptResult = await receiptResponse.json();
      if (receiptResult.result) {
        receipt = receiptResult.result;
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    if (!receipt) {
      throw new Error("Failed to get User Operation receipt");
    }

    return NextResponse.json({ transactionHash: receipt.receipt.transactionHash });
  } catch (error) {
    console.error("Pimlico claim error:", error);
    return NextResponse.json(
      { error: `Failed to process claim: ${error instanceof Error ? error.message : "Unknown error"}` },
      { status: 500 }
    );
  }
}