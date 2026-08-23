/**
 * Service Adapter Interface
 *
 * Every external integration (Twitter, Ethereum, email, etc.) implements
 * this contract. Adapters are stateless — they receive everything via
 * AdapterContext and return a standardized AdapterResult.
 */

import type { FieldTask, FieldOpsService } from "@/lib/types";

// ─── Adapter Context ────────────────────────────────────────────────────────

/** Everything an adapter needs to execute a task. */
export interface AdapterContext {
  /** The field task being executed. */
  task: FieldTask;
  /** The service configuration (rpcUrl, network, etc.). */
  service: FieldOpsService;
  /** Decrypted credentials (parsed JSON from vault). */
  credentials: Record<string, unknown>;
  /** When true, validate everything but skip the actual external API call. */
  dryRun?: boolean;
}

// ─── Adapter Result ─────────────────────────────────────────────────────────

/** Standardized result from any adapter execution. */
export interface AdapterResult {
  /** Whether the operation succeeded. */
  success: boolean;
  /** Adapter-specific result data (tweet URL, tx hash, etc.). */
  data: Record<string, unknown>;
  /** Human-readable error message on failure. */
  error?: string;
  /** HTTP status code from the external API (if applicable). */
  apiResponseCode?: number;
  /** Wall-clock execution time in milliseconds. */
  executionMs?: number;
}

// ─── Payload Validation ─────────────────────────────────────────────────────

export interface PayloadValidation {
  valid: boolean;
  errors: string[];
}

// ─── Health Check Result ───────────────────────────────────────────────────

/** Result from a lightweight, read-only connection test. */
export interface HealthCheckResult {
  /** Whether the service is reachable and authenticated. */
  ok: boolean;
  /** Latency of the health check call in milliseconds. */
  latencyMs: number;
  /** Human-readable status message. */
  message: string;
  /** Service-specific details (username, balance, account name, etc.). */
  details?: Record<string, unknown>;
  /** HTTP status code from the external API (if applicable). */
  apiResponseCode?: number;
}

// ─── Financial Types ────────────────────────────────────────────────────────

/** A single financial metric reported by a service adapter. */
export interface FinancialMetric {
  /** Display label, e.g. "ETH Balance", "Monthly Revenue", "API Credits". */
  label: string;
  /** Formatted display value, e.g. "1.2345", "$4,200.00". */
  value: string;
  /** Currency code, e.g. "ETH", "USDC", "USD". */
  currency?: string;
  /** Metric category for UI grouping. */
  type: "balance" | "revenue" | "spend" | "credit";
  /** Secondary info, e.g. "Sepolia testnet", "Last 30 days". */
  detail?: string;
}

/** Aggregated financial snapshot from a single service. */
export interface FinancialSnapshot {
  serviceId: string;
  serviceName: string;
  /** Lucide icon name for UI display. */
  icon?: string;
  /** For crypto: network identifier (e.g. "ethereum", "base", "sepolia"). */
  network?: string;
  /** For crypto: wallet address. */
  address?: string;
  /** Block explorer or dashboard URL. */
  explorerUrl?: string;
  /** Financial metrics for this service. */
  metrics: FinancialMetric[];
  /** Error message if fetching failed. */
  error?: string;
  /** ISO timestamp of when this data was fetched. */
  fetchedAt: string;
}

// ─── Service Adapter Interface ──────────────────────────────────────────────

export interface ServiceAdapter {
  /** Unique adapter identifier (matches service catalogId or serviceId). */
  readonly serviceId: string;
  /** Human-readable adapter name. */
  readonly name: string;
  /** Operations this adapter supports (e.g., "post-tweet", "send-usdc"). */
  readonly supportedOperations: string[];

  /**
   * Validate task payload before execution.
   * Called before any credentials are decrypted — fail fast on bad input.
   */
  validatePayload(payload: Record<string, unknown>): PayloadValidation;

  /**
   * Execute the task against the external API.
   * Receives decrypted credentials and full task context.
   * Must not throw — return AdapterResult with success=false on error.
   */
  execute(ctx: AdapterContext): Promise<AdapterResult>;

  /**
   * Lightweight, read-only connection test.
   * Makes a real API call to verify credentials are valid and the service is reachable.
   * Must not produce side effects (no posts, no transactions, no state changes).
   * Should complete within 5 seconds.
   */
  healthCheck(
    service: FieldOpsService,
    credentials: Record<string, unknown>,
  ): Promise<HealthCheckResult>;

  /**
   * Optional: Return financial metrics for this service.
   * Only implement if the service has financial data to display
   * (balances, revenue, spend, API credits, etc.).
   * Called without a task context — only needs service config + credentials.
   */
  getFinancials?(
    service: FieldOpsService,
    credentials: Record<string, unknown>,
  ): Promise<FinancialSnapshot>;
}
