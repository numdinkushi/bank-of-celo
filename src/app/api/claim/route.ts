// app/api/claim/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createPublicClient, createWalletClient, http, parseEther } from "viem";
import { celo } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import { BANK_OF_CELO_CONTRACT_ABI, BANK_OF_CELO_CONTRACT_ADDRESS } from "~/lib/constants";
import { encodeFunctionData } from "viem";

export async function POST(req: NextRequest) {
  try {
    const { address, fid, deadline, signature, nonce } = await req.json();

    if (!address || !fid || !deadline || !signature || nonce === undefined) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Initialize public client
    const publicClient = createPublicClient({
      chain: celo,
      transport: http("https://forno.celo.org"),
    });

    // Check user's CELO balance
    const balance = await publicClient.getBalance({ address: address as `0x${string}` });
    const minBalance = parseEther("0.001"); // Minimum to cover gas (~0.001 CELO)

    if (balance > minBalance) {
      // User has CELO: Return transaction request for claim
      const gas = await publicClient.estimateContractGas({
        address: BANK_OF_CELO_CONTRACT_ADDRESS,
        abi: BANK_OF_CELO_CONTRACT_ABI,
        functionName: "claim",
        args: [BigInt(fid), BigInt(deadline), signature],
        account: address,
      });

      const txRequest = {
        to: BANK_OF_CELO_CONTRACT_ADDRESS as `0x${string}`,
        data: encodeFunctionData({
          abi: BANK_OF_CELO_CONTRACT_ABI,
          functionName: "claim",
          args: [BigInt(fid), BigInt(deadline), signature],
        }),
        value: 0n,
        gas,
        gasPrice: await publicClient.getGasPrice(),
      };

      return NextResponse.json({
        action: "signAndSend",
        transaction: txRequest,
      });
    } else {
      // User has no CELO: Use private key to call executeGaslessClaim
      const privateKey = process.env.SPONSOR_PRIVATE_KEY;
      if (!privateKey) {
        throw new Error("Sponsor private key not configured");
      }

      const account = privateKeyToAccount(privateKey as `0x${string}`);
      const walletClient = createWalletClient({
        account,
        chain: celo,
        transport: http("https://forno.celo.org"),
      });

      // Call executeGaslessClaim
      const hash = await walletClient.writeContract({
        address: BANK_OF_CELO_CONTRACT_ADDRESS as `0x${string}`,
        abi: BANK_OF_CELO_CONTRACT_ABI,
        functionName: "executeGaslessClaim",
        args: [address, BigInt(fid), BigInt(deadline), signature],
      });

      // Wait for transaction receipt
      const receipt = await publicClient.waitForTransactionReceipt({ hash });

      return NextResponse.json({ transactionHash: receipt.transactionHash });
    }
  } catch (error) {
    console.error("Claim error:", error);
    return NextResponse.json(
      { error: `Failed to process claim: ${error instanceof Error ? error.message : "Unknown error"}` },
      { status: 500 }
    );
  }
}