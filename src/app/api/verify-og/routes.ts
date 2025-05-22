// app/api/verify-og/route.ts
import { NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../convex/_generated/api";

const SELF_XYZ_API_KEY = process.env.SELF_XYZ_API_KEY || "";
const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL || "";
const convex = new ConvexHttpClient(CONVEX_URL);

interface SelfXyzResponse {
  verified: boolean;
  address: string;
}

export async function POST(req: Request) {
  try {
    const { fid, address } = await req.json();

    // Verify with self.xyz
    const selfResponse = await fetch("https://api.self.xyz/v1/verify", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${SELF_XYZ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ address }),
    });

    if (!selfResponse.ok) throw new Error("self.xyz verification failed");
    const data: SelfXyzResponse = await selfResponse.json();
    if (!data.verified) throw new Error("Address not verified");

    // Update user as OG in Convex
    await convex.mutation(api.users.verifyOG, { fid, address });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error verifying OG:", error);
    return NextResponse.json({ error: "Verification failed" }, { status: 500 });
  }
}