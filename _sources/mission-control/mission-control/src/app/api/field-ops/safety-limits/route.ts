/**
 * Safety Limits API
 *
 * GET  /api/field-ops/safety-limits — Read safety limits + spend summary (no auth required)
 * PUT  /api/field-ops/safety-limits — Update safety limits (requires master password, owner only)
 */

import { NextResponse } from "next/server";
import { getSafetyLimits, mutateSafetyLimits } from "@/lib/data";
import { addFieldActivityEvent } from "@/lib/field-ops-activity";
import { getSpendSummary, pruneSpendLog } from "@/lib/spend-tracker";
import { requireOwner } from "@/lib/owner-guard";
import type { GlobalBudget, ServiceSpendLimit } from "@/lib/types";

export const dynamic = "force-dynamic";

// ─── GET: Read safety limits + spend summary ────────────────────────────────

export async function GET() {
  const data = await getSafetyLimits();
  const summary = getSpendSummary(data.spendLog);
  return NextResponse.json({ ...data, spendSummary: summary });
}

// ─── PUT: Update safety limits (master password required) ───────────────────

export async function PUT(request: Request) {
  const body = (await request.json()) as {
    masterPassword?: string;
    actor?: string;
    global?: Partial<GlobalBudget>;
    services?: Record<string, ServiceSpendLimit>;
  };
  const { global, services } = body;

  const ownerCheck = await requireOwner(body as Record<string, unknown>);
  if (ownerCheck) return ownerCheck;

  // Apply updates
  const result = await mutateSafetyLimits(async (data) => {
    if (global) {
      data.global = { ...data.global, ...global };
    }
    if (services) {
      data.services = { ...data.services, ...services };
    }
    data.updatedAt = new Date().toISOString();
    data.updatedBy = "me";
    // Prune old spend log entries
    data.spendLog = pruneSpendLog(data.spendLog);
    return { newGlobal: data.global };
  });

  await addFieldActivityEvent({
    type: "approval_config_changed",
    actor: "me",
    taskId: null,
    serviceId: null,
    summary: "Safety limits updated",
    details: `Global budget: $${result.newGlobal.dailyBudgetUsd}/day, $${result.newGlobal.weeklyBudgetUsd}/week, $${result.newGlobal.monthlyBudgetUsd}/month`,
  });

  return NextResponse.json({ ok: true });
}
