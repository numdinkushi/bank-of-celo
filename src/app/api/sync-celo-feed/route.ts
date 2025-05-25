/* eslint-disable @typescript-eslint/no-explicit-any */
// app/api/sync-celo-feed/route.ts
import { NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../convex/_generated/api";

// Environment variables
const NEYNAR_API_KEY = process.env.NEYNAR_API_KEY || "";
const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL || "";

// Define types for Neynar API response
interface Cast {
  timestamp: string;
  author: {
    fid: number;
    username: string;
    score?: number;
  };
  reactions: {
    likes_count: number;
    recasts_count: number;
  };
  verified_addresses: {
    primary: {
      eth_address: string;
    }
  }
}

interface NeynarResponse {
  casts: Cast[];
  next?: { cursor: string };
}

// Initialize Convex client
const convex = new ConvexHttpClient(CONVEX_URL);

export async function POST() {
  try {
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    let casts: Cast[] = [];
    let cursor: string | null = null;
    const limit = 100;

    // Fetch casts with pagination
    do {
      const url = `https://api.neynar.com/v2/farcaster/feed/channels?with_recasts=true&members_only=true&limit=${limit}&channel_ids=celo${cursor ? `&cursor=${cursor}` : ""}`;
      const response = await fetch(url, {
        method: "GET", // Use GET as per Neynar API documentation
        headers: {
          "x-api-key": NEYNAR_API_KEY, // Correct header key
          "x-neynar-experimental": "false", // Required header
        },
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Neynar API error: ${response.status} - ${response.statusText} - ${errorBody}`);
      }

      const data: NeynarResponse = await response.json();
      casts = casts.concat(data.casts.filter((cast) => cast.timestamp >= oneWeekAgo));
      cursor = data.next?.cursor || null;
    } while (cursor && casts.length < 5000); // Increased limit for weekly data

    // Process casts and update user scores
    const userScores = new Map<string, { score: number; username: string, address: string }>();
    for (const cast of casts) {
      const fid = cast.author.fid.toString();
      const ethAddress = cast.verified_addresses?.primary?.eth_address || "";
      const currentScore = userScores.get(fid) || { score: cast.author.score || 0, username: cast.author.username };

      // Scoring: 1 point per cast, 0.5 per like, 0.3 per recast
      const castScore = 1 + cast.reactions.likes_count * 0.5 + cast.reactions.recasts_count * 0.3;
      userScores.set(fid, {
        score: currentScore.score + castScore,
        username: currentScore.username,
        address: ethAddress,
      });
    }

    // Update users in Convex
    for (const [fid, { score, username }] of userScores) {
      const existingUser = await convex.query(api.users.getUserByFid, { fid });

      // Skip if user’s score was updated recently (optional: adjust as needed)
      if (existingUser && Date.now() - existingUser.lastUpdated < 7 * 24 * 60 * 60 * 1000) {
        continue;
      }

      await convex.mutation(api.users.addOrUpdateUser, {
        fid,
        username,
        score,
        address: existingUser?.address,
        isOG: existingUser?.isOG || false,
      });
    }

    return NextResponse.json({ success: true, castsProcessed: casts.length });
  } catch (error: any) {
    console.error("Error syncing Celo feed:", error);
    return NextResponse.json(
      { error: "Failed to sync feed", details: error.message },
      { status: 500 }
    );
  }
}