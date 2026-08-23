/**
 * Field Ops Security Layer
 *
 * Risk classification, state machine enforcement, and approval logic
 * based on OWASP Top 10 for Agentic Applications 2026.
 *
 * Pure functions — no side effects, no UI dependencies.
 */

import type {
  FieldTaskType,
  FieldTaskStatus,
  ServiceRiskLevel,
  AutonomyLevel,
} from "@/lib/types";

// ─── Risk Classification ────────────────────────────────────────────────────

export type RiskLevel = "high" | "medium" | "low";

/** Base risk level per task type (before service risk elevation) */
export const TASK_TYPE_RISK: Record<FieldTaskType, RiskLevel> = {
  payment: "high",
  "ad-campaign": "high",
  "email-campaign": "medium",
  "social-post": "medium",
  publish: "medium",
  design: "low",
  "crypto-transfer": "high", // financial — always requires approval
  custom: "medium", // custom always requires approval regardless
};

/** Combine task-type risk with service risk. Service risk can elevate but not lower. */
export function computeTaskRisk(
  taskType: FieldTaskType,
  serviceRiskLevel: ServiceRiskLevel = "low",
): RiskLevel {
  const baseRisk = TASK_TYPE_RISK[taskType];
  if (baseRisk === "high") return "high";
  if (serviceRiskLevel === "high") return "high";
  if (baseRisk === "medium" || serviceRiskLevel === "medium") return "medium";
  return "low";
}

/** Determine if a task requires human approval given the autonomy level. */
export function requiresApproval(
  taskType: FieldTaskType,
  serviceRiskLevel: ServiceRiskLevel = "low",
  autonomyLevel: AutonomyLevel,
): boolean {
  const risk = computeTaskRisk(taskType, serviceRiskLevel);

  // HIGH risk tasks ALWAYS require approval — even in full-autonomy mode
  // This is the "iron claw" — financial and high-impact actions never auto-approve
  if (risk === "high") return true;

  // Custom tasks always require approval (ASI05: unexpected code execution defense)
  if (taskType === "custom") return true;

  switch (autonomyLevel) {
    case "approve-all":
      return true;
    case "approve-high-risk":
      return risk === "medium";
    case "full-autonomy":
      return false;
  }
}

// ─── State Machine ──────────────────────────────────────────────────────────

/** Valid status transitions. Key = current status, value = allowed next statuses. */
export const VALID_TRANSITIONS: Record<FieldTaskStatus, FieldTaskStatus[]> = {
  draft: ["pending-approval", "approved"], // approved only if no approval required
  "pending-approval": ["approved", "rejected"],
  approved: ["executing", "awaiting-signature"], // awaiting-signature for wallet-mode tasks
  "awaiting-signature": ["completed", "failed"], // user signs in browser wallet → completed or failed
  executing: ["completed", "failed"],
  completed: [], // terminal state
  failed: ["draft"], // can retry by resubmitting as draft
  rejected: ["draft"], // can resubmit after addressing feedback
};

/** Check if a status transition is valid. */
export function isValidTransition(
  from: FieldTaskStatus,
  to: FieldTaskStatus,
): boolean {
  return VALID_TRANSITIONS[from].includes(to);
}

/** Get human-readable reason why a transition is invalid. */
export function getTransitionError(
  from: FieldTaskStatus,
  to: FieldTaskStatus,
): string {
  const allowed = VALID_TRANSITIONS[from];
  if (allowed.length === 0) {
    return `Task is in terminal state "${from}" and cannot be changed.`;
  }
  return `Cannot transition from "${from}" to "${to}". Valid transitions: ${allowed.join(", ")}.`;
}

// ─── Approval Enforcement ────────────────────────────────────────────────────

/**
 * Detect if a task is attempting to bypass the approval workflow.
 * A draft task with `approvalRequired: true` MUST go through `pending-approval`
 * before reaching `approved`. Directly transitioning draft → approved is a bypass.
 */
export function isApprovalBypassAttempt(
  currentStatus: FieldTaskStatus,
  newStatus: FieldTaskStatus,
  approvalRequired: boolean,
): boolean {
  return (
    currentStatus === "draft" &&
    newStatus === "approved" &&
    approvalRequired
  );
}

/** Human-readable error for approval bypass attempts. */
export function getApprovalBypassError(): string {
  return "Task requires approval. Must go through pending-approval before it can be approved.";
}

// ─── Risk Display Helpers ───────────────────────────────────────────────────

export const RISK_BADGE_STYLES: Record<RiskLevel, { label: string; classes: string }> = {
  high: { label: "High Risk", classes: "bg-red-500/20 text-red-400 border-red-500/30" },
  medium: { label: "Medium Risk", classes: "bg-amber-500/20 text-amber-400 border-amber-500/30" },
  low: { label: "Low Risk", classes: "bg-green-500/20 text-green-400 border-green-500/30" },
};

export const TASK_STATUS_STYLES: Record<FieldTaskStatus, { label: string; classes: string }> = {
  draft: { label: "Draft", classes: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30" },
  "pending-approval": { label: "Pending Approval", classes: "bg-amber-500/20 text-amber-400 border-amber-500/30" },
  approved: { label: "Approved", classes: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  "awaiting-signature": { label: "Sign in Wallet", classes: "bg-purple-500/20 text-purple-400 border-purple-500/30" },
  executing: { label: "Executing", classes: "bg-indigo-500/20 text-indigo-400 border-indigo-500/30" },
  completed: { label: "Completed", classes: "bg-green-500/20 text-green-400 border-green-500/30" },
  failed: { label: "Failed", classes: "bg-red-500/20 text-red-400 border-red-500/30" },
  rejected: { label: "Rejected", classes: "bg-orange-500/20 text-orange-400 border-orange-500/30" },
};

export const TASK_TYPE_INFO: Record<FieldTaskType, { label: string; icon: string }> = {
  "social-post": { label: "Social Post", icon: "MessageSquare" },
  "email-campaign": { label: "Email Campaign", icon: "Mail" },
  "ad-campaign": { label: "Ad Campaign", icon: "Megaphone" },
  payment: { label: "Payment", icon: "CreditCard" },
  publish: { label: "Publish", icon: "Globe" },
  design: { label: "Design", icon: "Palette" },
  "crypto-transfer": { label: "Crypto Transfer", icon: "Wallet" },
  custom: { label: "Custom", icon: "Wrench" },
};

// ─── Circuit Breaker ────────────────────────────────────────────────────────

/** Check if a mission should be paused due to consecutive failures (ASI08 defense). */
export function shouldTripCircuitBreaker(
  taskStatuses: FieldTaskStatus[],
  threshold = 3,
): boolean {
  let consecutiveFailures = 0;
  // Check from most recent tasks backward
  for (let i = taskStatuses.length - 1; i >= 0; i--) {
    if (taskStatuses[i] === "failed") {
      consecutiveFailures++;
      if (consecutiveFailures >= threshold) return true;
    } else if (taskStatuses[i] === "completed") {
      break; // Reset on any success
    }
  }
  return false;
}

// ─── Vault Rate Limiter ────────────────────────────────────────────────────

/** In-memory rate limiter for vault decrypt brute-force protection. */
export class VaultRateLimiter {
  private failures: number[] = [];
  private lockedUntil: number | null = null;

  private static readonly WINDOW_MS = 5 * 60 * 1000; // 5 minutes
  private static readonly SOFT_LIMIT = 3; // start adding delays after this
  private static readonly HARD_LIMIT = 10; // lockout after this
  private static readonly LOCKOUT_MS = 15 * 60 * 1000; // 15 minutes
  private static readonly DELAY_PER_ATTEMPT_MS = 5000; // 5s per attempt past soft limit

  /** Check if a request is allowed. Returns allowed=true or retryAfterMs. */
  checkRateLimit(): { allowed: boolean; retryAfterMs?: number } {
    const now = Date.now();

    // Check lockout
    if (this.lockedUntil && now < this.lockedUntil) {
      return { allowed: false, retryAfterMs: this.lockedUntil - now };
    }

    // Clear expired lockout
    if (this.lockedUntil && now >= this.lockedUntil) {
      this.lockedUntil = null;
      this.failures = [];
    }

    // Prune old failures outside window
    this.failures = this.failures.filter((t) => now - t < VaultRateLimiter.WINDOW_MS);

    // Check hard limit
    if (this.failures.length >= VaultRateLimiter.HARD_LIMIT) {
      this.lockedUntil = now + VaultRateLimiter.LOCKOUT_MS;
      return { allowed: false, retryAfterMs: VaultRateLimiter.LOCKOUT_MS };
    }

    return { allowed: true };
  }

  /** Record a failed attempt. */
  recordFailure(): void {
    this.failures.push(Date.now());
  }

  /** Record a success — resets the failure counter. */
  recordSuccess(): void {
    this.failures = [];
    this.lockedUntil = null;
  }

  /** Get current failure count (for logging). */
  getFailureCount(): number {
    const now = Date.now();
    return this.failures.filter((t) => now - t < VaultRateLimiter.WINDOW_MS).length;
  }
}

/** Module-level singleton — shared across API route invocations in the same process. */
export const vaultRateLimiter = new VaultRateLimiter();

// ─── Execution Rate Limiter ─────────────────────────────────────────────────

/** In-memory rate limiter for task execution (per-service throttling). */
export class ExecutionRateLimiter {
  private executions: Map<string, number[]> = new Map();

  private static readonly WINDOW_MS = 5 * 60 * 1000; // 5 minutes
  private static readonly MAX_PER_SERVICE = 10; // max 10 executions per service per window

  /** Check if execution is allowed for a given service. */
  checkLimit(serviceId: string): { allowed: boolean; retryAfterMs?: number } {
    const now = Date.now();
    const timestamps = (this.executions.get(serviceId) ?? []).filter(
      (t) => now - t < ExecutionRateLimiter.WINDOW_MS,
    );
    this.executions.set(serviceId, timestamps);

    if (timestamps.length >= ExecutionRateLimiter.MAX_PER_SERVICE) {
      const oldestInWindow = timestamps[0];
      const retryAfterMs = ExecutionRateLimiter.WINDOW_MS - (now - oldestInWindow);
      return { allowed: false, retryAfterMs };
    }
    return { allowed: true };
  }

  /** Record an execution. */
  recordExecution(serviceId: string): void {
    const timestamps = this.executions.get(serviceId) ?? [];
    timestamps.push(Date.now());
    this.executions.set(serviceId, timestamps);
  }
}

/** Module-level singleton — execution throttle per service. */
export const executionRateLimiter = new ExecutionRateLimiter();

// ─── Payload & Config Validation ────────────────────────────────────────────

/** Maximum size for arbitrary payload/config fields (10KB). */
export const PAYLOAD_MAX_SIZE = 10240;

/** Check if a JSON-serializable object exceeds the max allowed size. */
export function isPayloadTooLarge(payload: Record<string, unknown>): boolean {
  try {
    return JSON.stringify(payload).length > PAYLOAD_MAX_SIZE;
  } catch {
    return true; // If it can't be serialized, reject it
  }
}

// ─── Secret Detection ───────────────────────────────────────────────────────

/** Common API key / token prefixes that should NOT be stored in plaintext config. */
const SECRET_PATTERNS: RegExp[] = [
  /^sk_/,         // Stripe secret keys
  /^pk_live_/,    // Stripe live publishable keys
  /^ghp_/,        // GitHub personal access tokens
  /^gho_/,        // GitHub OAuth tokens
  /^github_pat_/, // GitHub fine-grained PATs
  /^xoxb-/,       // Slack bot tokens
  /^xoxp-/,       // Slack user tokens
  /^AKIA/,        // AWS access key IDs
  /^glpat-/,      // GitLab PATs
  /^bearer\s/i,   // Bearer tokens
  /^token\s/i,    // Generic token prefix
];

/**
 * Scan a config object's string values for patterns that look like API secrets.
 * Returns an array of key names whose values match secret patterns.
 */
export function detectSecretsInConfig(config: Record<string, unknown>): string[] {
  const suspiciousKeys: string[] = [];
  for (const [key, value] of Object.entries(config)) {
    if (typeof value === "string" && value.length > 4) {
      for (const pattern of SECRET_PATTERNS) {
        if (pattern.test(value)) {
          suspiciousKeys.push(key);
          break;
        }
      }
    }
  }
  return suspiciousKeys;
}
