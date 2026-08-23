/**
 * Spend Tracker — Financial Safety Controls
 *
 * Utility functions for calculating spend totals and checking limits.
 * Used by the execute route to enforce per-service and global budgets.
 */

import type { SafetyLimitsFile, SpendLogEntry } from "./types";

// ─── Time Boundaries ────────────────────────────────────────────────────────

/** Get start of today (midnight local) as ISO string */
function startOfDay(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

/** Get start of current week (Monday midnight) as ISO string */
function startOfWeek(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  // getDay(): 0=Sun, 1=Mon, ... 6=Sat → offset to Monday
  const diff = day === 0 ? 6 : day - 1;
  d.setDate(d.getDate() - diff);
  return d.toISOString();
}

/** Get start of current month (1st midnight) as ISO string */
function startOfMonth(): string {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

// ─── Spend Calculations ─────────────────────────────────────────────────────

/** Calculate cumulative spend for a service since a given timestamp */
export function getServiceSpend(
  spendLog: SpendLogEntry[],
  serviceId: string,
  since: string,
): number {
  const sinceTime = new Date(since).getTime();
  return spendLog
    .filter(
      (entry) =>
        entry.serviceId === serviceId &&
        new Date(entry.timestamp).getTime() >= sinceTime,
    )
    .reduce((sum, entry) => sum + entry.amountUsd, 0);
}

/** Calculate global cumulative spend since a given timestamp */
export function getGlobalSpend(
  spendLog: SpendLogEntry[],
  since: string,
): number {
  const sinceTime = new Date(since).getTime();
  return spendLog
    .filter((entry) => new Date(entry.timestamp).getTime() >= sinceTime)
    .reduce((sum, entry) => sum + entry.amountUsd, 0);
}

// ─── Limit Enforcement ──────────────────────────────────────────────────────

/**
 * Check if a proposed transaction would exceed any limits.
 * Returns null if OK, or an error message string if blocked.
 *
 * Check order:
 * 1. Global enabled flag
 * 2. Per-service enabled flag
 * 3. Per-transaction limit
 * 4. Service daily limit
 * 5. Global daily budget
 * 6. Global weekly budget
 * 7. Global monthly budget
 */
export function checkSpendLimits(
  safetyLimits: SafetyLimitsFile,
  serviceId: string,
  proposedAmountUsd: number,
  operation: string,
): string | null {
  const { global, services, spendLog } = safetyLimits;

  // 1. Global kill switch
  if (!global.enabled) return null;

  // 2. Per-service limits
  const serviceLimit = services[serviceId];
  if (serviceLimit) {
    // Service disabled
    if (!serviceLimit.enabled) {
      return `Service "${serviceId}" spending is disabled`;
    }

    // 3. Per-transaction limit
    if (proposedAmountUsd > serviceLimit.maxPerTxUsd) {
      return `Transaction $${proposedAmountUsd.toFixed(2)} exceeds per-tx limit of $${serviceLimit.maxPerTxUsd.toFixed(2)} for service "${serviceId}" (operation: ${operation})`;
    }

    // 4. Service daily limit
    const serviceSpendToday = getServiceSpend(spendLog, serviceId, startOfDay());
    if (serviceSpendToday + proposedAmountUsd > serviceLimit.dailyLimitUsd) {
      return `Service "${serviceId}" daily limit would be exceeded: $${serviceSpendToday.toFixed(2)} spent today + $${proposedAmountUsd.toFixed(2)} proposed > $${serviceLimit.dailyLimitUsd.toFixed(2)} limit`;
    }
  }

  // 5. Global daily budget
  const globalSpendToday = getGlobalSpend(spendLog, startOfDay());
  if (globalSpendToday + proposedAmountUsd > global.dailyBudgetUsd) {
    return `Global daily budget would be exceeded: $${globalSpendToday.toFixed(2)} spent today + $${proposedAmountUsd.toFixed(2)} proposed > $${global.dailyBudgetUsd.toFixed(2)} daily budget`;
  }

  // 6. Global weekly budget
  const globalSpendWeek = getGlobalSpend(spendLog, startOfWeek());
  if (globalSpendWeek + proposedAmountUsd > global.weeklyBudgetUsd) {
    return `Global weekly budget would be exceeded: $${globalSpendWeek.toFixed(2)} spent this week + $${proposedAmountUsd.toFixed(2)} proposed > $${global.weeklyBudgetUsd.toFixed(2)} weekly budget`;
  }

  // 7. Global monthly budget
  const globalSpendMonth = getGlobalSpend(spendLog, startOfMonth());
  if (globalSpendMonth + proposedAmountUsd > global.monthlyBudgetUsd) {
    return `Global monthly budget would be exceeded: $${globalSpendMonth.toFixed(2)} spent this month + $${proposedAmountUsd.toFixed(2)} proposed > $${global.monthlyBudgetUsd.toFixed(2)} monthly budget`;
  }

  return null;
}

// ─── Maintenance ────────────────────────────────────────────────────────────

/** Prune spend log entries older than 31 days */
export function pruneSpendLog(spendLog: SpendLogEntry[]): SpendLogEntry[] {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 31);
  const cutoffTime = cutoff.getTime();
  return spendLog.filter(
    (entry) => new Date(entry.timestamp).getTime() >= cutoffTime,
  );
}

// ─── Reporting ──────────────────────────────────────────────────────────────

/** Get spend summary for display */
export function getSpendSummary(spendLog: SpendLogEntry[]): {
  todayTotal: number;
  weekTotal: number;
  monthTotal: number;
  byService: Record<string, { today: number; week: number; month: number }>;
} {
  const todayStart = startOfDay();
  const weekStart = startOfWeek();
  const monthStart = startOfMonth();

  const todayTotal = getGlobalSpend(spendLog, todayStart);
  const weekTotal = getGlobalSpend(spendLog, weekStart);
  const monthTotal = getGlobalSpend(spendLog, monthStart);

  // Aggregate by service
  const serviceIds = new Set(spendLog.map((e) => e.serviceId));
  const byService: Record<string, { today: number; week: number; month: number }> = {};

  for (const sid of serviceIds) {
    byService[sid] = {
      today: getServiceSpend(spendLog, sid, todayStart),
      week: getServiceSpend(spendLog, sid, weekStart),
      month: getServiceSpend(spendLog, sid, monthStart),
    };
  }

  return { todayTotal, weekTotal, monthTotal, byService };
}
