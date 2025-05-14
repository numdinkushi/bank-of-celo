import { NextRequest, NextResponse } from "next/server";
import { encodeFunctionData } from "viem";
import { BANK_OF_CELO_CONTRACT_ABI, BANK_OF_CELO_CONTRACT_ADDRESS } from "~/lib/constants";

// Simplified Gelato client (replace with actual Gelato SDK)
const submitToGelato = async (data: string, to: `0x${string}`) => {
  // Example: Submit transaction to Gelato relayer
  // Replace with actual Gelato SDK integration
  console.log("Submitting to Gelato:", { data, to });
  // const response = await gelatoClient.sponsorTransaction({ data, to });
  // return response;
  return { taskId: "mock-task-id" }; // Mock response
};

export async function POST(req: NextRequest) {
  try {
    const { address, fid } = await req.json();

    if (!address || !fid) {
      return NextResponse.json({ error: "Address and FID are required" }, { status: 400 });
    }

    // Encode the claim function call
    const data = encodeFunctionData({
      abi: BANK_OF_CELO_CONTRACT_ABI,
      functionName: "claim",
      args: [BigInt(fid)],
    });

    // Submit to Gelato relayer
    const result = await submitToGelato(data, BANK_OF_CELO_CONTRACT_ADDRESS);

    return NextResponse.json({ taskId: result.taskId });
  } catch (error) {
    console.error("Gasless claim error:", error);
    return NextResponse.json(
      { error: `Failed to process claim: ${error instanceof Error ? error.message : "Unknown error"}` },
      { status: 500 }
    );
  }
}