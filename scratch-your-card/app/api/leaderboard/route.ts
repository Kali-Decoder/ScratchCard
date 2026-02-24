import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { Transaction } from "@/lib/models/Transaction";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();

    const pageParam = Number(request.nextUrl.searchParams.get("page") || "1");
    const pageSizeParam =
      Number(request.nextUrl.searchParams.get("pageSize") || request.nextUrl.searchParams.get("limit") || "5");
    const page = Math.max(Number.isFinite(pageParam) ? Math.floor(pageParam) : 1, 1);
    const pageSize = Math.min(
      Math.max(Number.isFinite(pageSizeParam) ? Math.floor(pageSizeParam) : 5, 1),
      100
    );
    const skip = (page - 1) * pageSize;

    const [leaderboard, totalUsersAgg, platformAgg] = await Promise.all([
      Transaction.aggregate([
        {
          $group: {
            _id: "$walletAddress",
            totalWonWei: {
              $sum: {
                $cond: [
                  { $eq: ["$action", "scratch_reward"] },
                  { $toDecimal: "$amountWei" },
                  0,
                ],
              },
            },
            totalClaimedWei: {
              $sum: {
                $cond: [{ $eq: ["$action", "claim"] }, { $toDecimal: "$amountWei" }, 0],
              },
            },
            scratchCount: {
              $sum: {
                $cond: [{ $eq: ["$action", "scratch_reward"] }, 1, 0],
              },
            },
            txCount: { $sum: 1 },
            lastActivity: { $max: "$occurredAt" },
          },
        },
        {
          $sort: {
            totalWonWei: -1,
            scratchCount: -1,
            lastActivity: -1,
          },
        },
        { $skip: skip },
        { $limit: pageSize },
        {
          $project: {
            _id: 0,
            walletAddress: "$_id",
            totalWonWei: { $toString: "$totalWonWei" },
            totalClaimedWei: { $toString: "$totalClaimedWei" },
            scratchCount: 1,
            txCount: 1,
            lastActivity: 1,
          },
        },
      ]),
      Transaction.aggregate([{ $group: { _id: "$walletAddress" } }, { $count: "totalUsers" }]),
      Transaction.aggregate([
        {
          $group: {
            _id: null,
            totalTransactions: { $sum: 1 },
            totalScratches: {
              $sum: {
                $cond: [{ $eq: ["$action", "scratch_reward"] }, 1, 0],
              },
            },
            totalClaimedWei: {
              $sum: {
                $cond: [{ $eq: ["$action", "claim"] }, { $toDecimal: "$amountWei" }, 0],
              },
            },
          },
        },
      ]),
    ]);

    const totalUsers = Number(totalUsersAgg?.[0]?.totalUsers || 0);
    const totalPages = Math.max(Math.ceil(totalUsers / pageSize), 1);
    const platformStats = {
      totalUsers,
      totalScratchCards: Number(platformAgg?.[0]?.totalScratches || 0),
      totalTransactions: Number(platformAgg?.[0]?.totalTransactions || 0),
      totalClaimedWei: platformAgg?.[0]?.totalClaimedWei
        ? String(platformAgg[0].totalClaimedWei)
        : "0",
    };

    return NextResponse.json({
      ok: true,
      leaderboard,
      pagination: {
        page,
        pageSize,
        totalUsers,
        totalPages,
      },
      platformStats,
    });
  } catch (error: any) {
    console.error("GET /api/leaderboard failed:", error);
    return NextResponse.json(
      { ok: false, error: error?.message || "Failed to fetch leaderboard" },
      { status: 500 }
    );
  }
}
