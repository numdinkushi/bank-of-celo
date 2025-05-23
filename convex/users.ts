// convex/users.ts
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const addOrUpdateUser = mutation({
  args: {
    fid: v.string(),
    username: v.string(),
    score: v.number(),
    isOG: v.optional(v.boolean()),
    address: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existingUser = await ctx.db
      .query("users")
      .filter(q => q.eq(q.field("fid"), args.fid))
      .first();

    if (existingUser) {
      await ctx.db.patch(existingUser._id, {
        score: args.score,
        username: args.username,
        ...(args.isOG !== undefined && { isOG: args.isOG }),
        ...(args.address && { address: args.address }),
        lastUpdated: Date.now(),
      });
      return existingUser._id;
    } else {
      return await ctx.db.insert("users", {
        fid: args.fid,
        username: args.username,
        score: args.score,
        isOG: args.isOG || false,
        address: args.address || "",
        lastUpdated: Date.now(),
      });
    }
  },
});

export const getLeaderboard = query({
    args: { limit: v.optional(v.number()) },
    handler: async (ctx, args) => {
      const users = await ctx.db
        .query("users")
        .order("desc")
        .take(args.limit || 50);
      
      return users;
    },
  });

export const verifyOG = mutation({
  args: { fid: v.string(), address: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .filter(q => q.eq(q.field("fid"), args.fid))
      .first();

    if (!user) throw new Error("User not found");
    await ctx.db.patch(user._id, { isOG: true, address: args.address });
  },
});

export const getUserByFid = query({
  args: { fid: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .filter(q => q.eq(q.field("fid"), args.fid))
      .first();
  },
});