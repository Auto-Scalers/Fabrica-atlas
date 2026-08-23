/**
 * Submit Signature API (wallet signing mode)
 *
 * POST /api/field-ops/execute/submit-signature
 * Body: { taskId: string, txHash: string }
 *
 * After the client signs a transaction via MetaMask and receives a txHash,
 * this endpoint:
 * 1. Validates the task is in "awaiting-signature" status
 * 2. Validates the txHash format
 * 3. Transitions task to "completed" with result containing txHash
 * 4. Updates service lastUsed
 * 5. Logs activity and spend
 */

import { NextResponse } from "next/server";
import {
  getFieldTasks,
  getFieldServices,
  mutateFieldTasks,
  mutateFieldServices,
  mutateSafetyLimits,
} from "@/lib/data";
import { isValidTransition } from "@/lib/field-ops-security";
import { addFieldActivityEvent } from "@/lib/field-ops-activity";
import {
  notifyFieldTaskCompleted,
  logFieldOpsActivity,
} from "@/lib/field-ops-notify";
import { pruneSpendLog } from "@/lib/spend-tracker";
import { validateBody } from "@/lib/validations";
import { z } from "zod";
import type { FieldTask, FieldOpsService } from "@/lib/types";

const TX_HASH_REGEX = /^0x[0-9a-fA-F]{64}$/;

const submitSignatureSchema = z.object({
  taskId: z.string().min(1, "Task ID is required"),
  txHash: z.string().min(1, "Transaction hash is required"),
});

export const dynamic = "force-dynamic";

/** Rough USD estimate for a transaction based on task payload. */
function estimateTransactionUsd(task: FieldTask, service: FieldOpsService): number {
  const amount = Number(task.payload.amount ?? 0);
  if (amount <= 0) return 0;

  const operation = (task.payload.operation as string) ?? "";
  if (operation === "send-eth") return amount * 2000;
  if (operation === "send-usdc") return amount;
  if (service.riskLevel === "high" && amount > 0) return amount;

  return 0;
}

export async function POST(request: Request) {
  // ── 1. Validate request body ──
  const validation = await validateBody(request, submitSignatureSchema);
  if (!validation.success) return validation.error;

  const { taskId, txHash } = validation.data;

  // ── 2. Validate txHash format ──
  if (!TX_HASH_REGEX.test(txHash)) {
    return NextResponse.json(
      { error: "Invalid transaction hash format. Expected 0x followed by 64 hex characters." },
      { status: 400 },
    );
  }

  // ── 3. Load task ──
  const tasksData = await getFieldTasks();
  const foundTask = tasksData.tasks.find((t) => t.id === taskId);
  if (!foundTask) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }
  const task: FieldTask = foundTask;

  // ── 4. Validate task is awaiting-signature ──
  if (task.status !== "awaiting-signature") {
    return NextResponse.json(
      { error: `Task must be in "awaiting-signature" status (current: "${task.status}")` },
      { status: 400 },
    );
  }

  if (!isValidTransition("awaiting-signature", "completed")) {
    return NextResponse.json(
      { error: "Invalid state transition: awaiting-signature -> completed" },
      { status: 400 },
    );
  }

  // ── 5. Resolve service ──
  const servicesData = await getFieldServices();
  const service: FieldOpsService | null = task.serviceId
    ? servicesData.services.find((s) => s.id === task.serviceId) ?? null
    : null;

  // ── 6. Transition to completed ──
  const now = new Date().toISOString();

  await mutateFieldTasks(async (data) => {
    const t = data.tasks.find((t) => t.id === taskId);
    if (t) {
      t.status = "completed";
      t.completedAt = now;
      t.updatedAt = now;
      t.result = {
        txHash,
        signingMode: "wallet",
        operation: (task.payload.operation as string) ?? "unknown",
        network: service ? (service.config.network as string) ?? "ethereum" : "unknown",
      };
    }
  });

  // ── 7. Update service lastUsed ──
  if (service) {
    await mutateFieldServices(async (data) => {
      const s = data.services.find((s) => s.id === service!.id);
      if (s) {
        s.lastUsed = now;
      }
    });
  }

  // ── 8. Log spend to safety limits ──
  if (service) {
    const spentUsd = estimateTransactionUsd(task, service);
    if (spentUsd > 0) {
      await mutateSafetyLimits(async (data) => {
        data.spendLog.push({
          serviceId: service!.id,
          amountUsd: spentUsd,
          operation: (task.payload.operation as string) ?? "unknown",
          taskId,
          timestamp: new Date().toISOString(),
        });
        data.spendLog = pruneSpendLog(data.spendLog);
      });
    }
  }

  // ── 9. Log field ops activity ──
  await addFieldActivityEvent({
    type: "field_task_completed",
    actor: "system",
    taskId,
    serviceId: task.serviceId,
    missionId: task.missionId,
    summary: `Wallet-signed transaction submitted: "${task.title}"`,
    details: `Transaction hash: ${txHash}. Signed via external wallet (MetaMask).`,
    metadata: { txHash, signingMode: "wallet" },
  });

  // ── 10. Post to regular inbox + activity log ──
  {
    const freshData = await getFieldTasks();
    const finalTask = freshData.tasks.find((t) => t.id === taskId);
    if (finalTask) {
      await notifyFieldTaskCompleted(finalTask);
      await logFieldOpsActivity(
        "field_task_completed",
        "system",
        finalTask.linkedTaskId,
        `Field task completed (wallet): ${finalTask.title}`,
        `Field task "${finalTask.title}" (${finalTask.id}) completed via wallet signing. Tx: ${txHash}`,
      );
    }
  }

  // ── 11. Return result ──
  return NextResponse.json({
    taskId,
    status: "completed",
    txHash,
    signingMode: "wallet",
  });
}
