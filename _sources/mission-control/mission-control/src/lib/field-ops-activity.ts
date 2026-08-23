/**
 * Centralized Field Ops Activity Logging
 *
 * Single source of truth for logging field ops activity events.
 * Previously duplicated across 6 route files — now shared.
 */

import { mutateFieldActivityLog } from "@/lib/data";
import type { FieldOpsActivityEvent } from "@/lib/types";
import { generateId } from "@/lib/utils";

/**
 * Log a field ops activity event.
 *
 * Accepts all fields except `id` and `timestamp` (auto-generated).
 * New fields `missionId`, `credentialId`, and `metadata` default to null
 * so existing call sites don't need to change immediately.
 */
/** Input type: all FieldOpsActivityEvent fields except id/timestamp, with missionId/credentialId/metadata optional (default null). */
export type FieldActivityEventInput =
  Omit<FieldOpsActivityEvent, "id" | "timestamp" | "missionId" | "credentialId" | "metadata"> & {
    missionId?: string | null;
    credentialId?: string | null;
    metadata?: Record<string, unknown> | null;
  };

export async function addFieldActivityEvent(evt: FieldActivityEventInput): Promise<void> {
  await mutateFieldActivityLog(async (data) => {
    const event: FieldOpsActivityEvent = {
      id: generateId("fevt"),
      ...evt,
      missionId: evt.missionId ?? null,
      credentialId: evt.credentialId ?? null,
      metadata: evt.metadata ?? null,
      timestamp: new Date().toISOString(),
    };
    data.events.push(event);
  });
}
