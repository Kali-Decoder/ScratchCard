import { connectToDatabase } from "@/lib/mongodb";
import { Transaction } from "@/lib/models/Transaction";

const VALID_ACTIONS = new Set(["scratch_reward", "claim"]);

type ActionType = "scratch_reward" | "claim";

export type TransactionLogInput = {
  walletAddress: string;
  txHash: string;
  action: ActionType;
  amountWei: string;
  contractAddress: string;
  chainId: number;
  occurredAt?: Date;
};

export async function upsertTransactionLog(input: TransactionLogInput) {
  const walletAddress = String(input.walletAddress || "").trim().toLowerCase();
  const txHash = String(input.txHash || "").trim().toLowerCase();
  const action = String(input.action || "").trim() as ActionType;
  const amountWei = String(input.amountWei || "").trim();
  const contractAddress = String(input.contractAddress || "").trim().toLowerCase();
  const chainId = Number(input.chainId);
  const occurredAt = input.occurredAt ?? new Date();

  if (!walletAddress || !txHash || !amountWei || !contractAddress || !Number.isFinite(chainId)) {
    throw new Error("Missing required fields");
  }

  if (!VALID_ACTIONS.has(action)) {
    throw new Error("Invalid action. Use scratch_reward or claim.");
  }

  await connectToDatabase();

  await Transaction.updateOne(
    { txHash },
    {
      walletAddress,
      txHash,
      action,
      amountWei,
      contractAddress,
      chainId,
      occurredAt,
    },
    { upsert: true }
  );
}
