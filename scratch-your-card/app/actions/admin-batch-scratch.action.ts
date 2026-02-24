"use server";

import {
  executeAdminBatchScratch,
  type BatchBody,
} from "@/app/services/admin-batch-scratch.service";

export async function runAdminBatchAction(payload: BatchBody) {
  try {
    const result = await executeAdminBatchScratch(payload);
    return { ok: true, result };
  } catch (error: any) {
    return {
      ok: false,
      error: error?.message || "Failed to execute admin batch scratch",
    };
  }
}
