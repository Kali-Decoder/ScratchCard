import { NextRequest, NextResponse } from "next/server";
import { upsertTransactionLog } from "@/app/services/transaction-log.service";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    await upsertTransactionLog({
      walletAddress: String(body?.walletAddress || ""),
      txHash: String(body?.txHash || ""),
      action: String(body?.action || "") as "scratch_reward" | "claim",
      amountWei: String(body?.amountWei || ""),
      contractAddress: String(body?.contractAddress || ""),
      chainId: Number(body?.chainId),
      occurredAt: body?.occurredAt ? new Date(body.occurredAt) : new Date(),
    });

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error("POST /api/transactions failed:", error);
    return NextResponse.json(
      { ok: false, error: error?.message || "Failed to store transaction" },
      { status: 500 }
    );
  }
}
