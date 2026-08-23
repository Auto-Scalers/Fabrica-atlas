/**
 * Prepare Transaction API (wallet signing mode)
 *
 * POST /api/field-ops/execute/prepare
 * Body: { taskId: string }
 *
 * For services using signingMode: "wallet", this endpoint:
 * 1. Validates the task is in "approved" status
 * 2. Verifies the service uses wallet signing mode
 * 3. Validates the payload via the adapter
 * 4. Builds unsigned transaction parameters for MetaMask
 * 5. Transitions task to "awaiting-signature"
 * 6. Returns txParams for the client to sign
 */

import { NextResponse } from "next/server";
import {
  getFieldTasks,
  getFieldServices,
  mutateFieldTasks,
} from "@/lib/data";
import { isValidTransition } from "@/lib/field-ops-security";
import { addFieldActivityEvent } from "@/lib/field-ops-activity";
import { prepareTransaction } from "@/lib/adapters/ethereum-adapter";
import { getAdapter } from "@/lib/adapters/registry";
import { validateBody } from "@/lib/validations";
import { z } from "zod";
import type { FieldOpsService } from "@/lib/types";

// Import adapters so they self-register
import "@/lib/adapters/twitter-adapter";
import "@/lib/adapters/ethereum-adapter";
import "@/lib/adapters/reddit-adapter";
import "@/lib/adapters/linkedin-adapter";
import "@/lib/adapters/stripe-adapter";

const prepareSchema = z.object({
  taskId: z.string().min(1, "Task ID is required"),
});

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  // ── 1. Validate request body ──
  const validation = await validateBody(request, prepareSchema);
  if (!validation.success) return validation.error;

  const { taskId } = validation.data;

  // ── 2. Load task ──
  const tasksData = await getFieldTasks();
  const task = tasksData.tasks.find((t) => t.id === taskId);
  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  // ── 3. Validate task is approved ──
  if (task.status !== "approved") {
    return NextResponse.json(
      { error: `Task must be in "approved" status to prepare (current: "${task.status}")` },
      { status: 400 },
    );
  }

  if (!isValidTransition("approved", "awaiting-signature")) {
    return NextResponse.json(
      { error: "Invalid state transition: approved -> awaiting-signature" },
      { status: 400 },
    );
  }

  // ── 4. Resolve service ──
  const servicesData = await getFieldServices();
  const service: FieldOpsService | null = task.serviceId
    ? servicesData.services.find((s) => s.id === task.serviceId) ?? null
    : null;

  if (!service) {
    return NextResponse.json(
      { error: `Service "${task.serviceId ?? "(none)"}" not found` },
      { status: 400 },
    );
  }

  // ── 5. Verify wallet signing mode ──
  const signingMode = (service.config.signingMode as string) ?? "vault";
  if (signingMode !== "wallet") {
    return NextResponse.json(
      { error: `Service "${service.name}" uses signing mode "${signingMode}", not "wallet". Use POST /api/field-ops/execute for server-side execution.` },
      { status: 400 },
    );
  }

  // ── 6. Find adapter and validate payload ──
  let resolvedAdapter = getAdapter(service.id);
  if (!resolvedAdapter && service.catalogId) {
    resolvedAdapter = getAdapter(service.catalogId);
  }

  if (!resolvedAdapter) {
    return NextResponse.json(
      { error: `No adapter registered for service "${service.name}"` },
      { status: 400 },
    );
  }

  const payloadValidation = resolvedAdapter.validatePayload(task.payload);
  if (!payloadValidation.valid) {
    return NextResponse.json(
      { error: "Payload validation failed", details: payloadValidation.errors },
      { status: 400 },
    );
  }

  // ── 7. Prepare unsigned transaction ──
  const operation = (task.payload.operation as string) ?? "read-balance";
  const network = (service.config.network as string) ?? "ethereum";
  const rpcUrl = service.config.rpcUrl as string | undefined;

  const prepResult = await prepareTransaction(operation, task.payload, network, rpcUrl);

  if (!prepResult.success) {
    return NextResponse.json(
      { error: `Failed to prepare transaction: ${prepResult.error}` },
      { status: 400 },
    );
  }

  // ── 8. Transition to awaiting-signature ──
  const now = new Date().toISOString();

  await mutateFieldTasks(async (data) => {
    const t = data.tasks.find((t) => t.id === taskId);
    if (t) {
      t.status = "awaiting-signature";
      t.updatedAt = now;
    }
  });

  // ── 9. Log activity ──
  await addFieldActivityEvent({
    type: "field_task_executing",
    actor: "system",
    taskId,
    serviceId: task.serviceId,
    missionId: task.missionId,
    summary: `Transaction prepared for wallet signing: "${task.title}"`,
    details: `Operation: ${operation}, Network: ${network}, Chain ID: ${prepResult.txParams?.chainId ?? "unknown"}`,
  });

  // ── 10. Return unsigned tx params ──
  return NextResponse.json({
    taskId,
    status: "awaiting-signature",
    txParams: prepResult.txParams,
  });
}
