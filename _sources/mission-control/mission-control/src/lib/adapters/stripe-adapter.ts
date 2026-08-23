/**
 * Stripe Adapter
 *
 * Health-check-only adapter for verifying Stripe API keys.
 * Uses GET /v1/balance (read-only, no side effects).
 *
 * Credential format in vault (JSON string):
 * {
 *   "secretKey": "sk_test_... or sk_live_...",
 *   "mode": "test" | "live"
 * }
 *
 * Supported operations: (none yet - health check only)
 */

import type {
  ServiceAdapter,
  AdapterContext,
  AdapterResult,
  PayloadValidation,
  HealthCheckResult,
} from "./types";
import type { FieldOpsService } from "@/lib/types";
import { registerAdapter } from "./registry";

// ─── Credential Parsing ─────────────────────────────────────────────────────

interface StripeCredentials {
  secretKey: string;
  mode: "test" | "live";
}

function parseCredentials(creds: Record<string, unknown>): StripeCredentials | null {
  const { secretKey, mode } = creds;
  if (typeof secretKey === "string" && secretKey.length > 0) {
    const resolvedMode = mode === "live" ? "live" as const : "test" as const;
    return { secretKey, mode: resolvedMode };
  }
  return null;
}

// ─── Stripe Adapter ─────────────────────────────────────────────────────────

const stripeAdapter: ServiceAdapter = {
  serviceId: "stripe",
  name: "Stripe",
  supportedOperations: [], // Health check only for now

  validatePayload(_payload: Record<string, unknown>): PayloadValidation {
    return { valid: false, errors: ["Stripe adapter does not support task execution yet."] };
  },

  async execute(_ctx: AdapterContext): Promise<AdapterResult> {
    return {
      success: false,
      data: {},
      error: "Stripe adapter does not support task execution yet. Only health checks are available.",
    };
  },

  async healthCheck(
    _service: FieldOpsService,
    credentials: Record<string, unknown>,
  ): Promise<HealthCheckResult> {
    const start = Date.now();
    const creds = parseCredentials(credentials);

    if (!creds) {
      const has = {
        secretKey: typeof credentials.secretKey === "string" && (credentials.secretKey as string).length > 0,
        mode: typeof credentials.mode === "string" && (credentials.mode as string).length > 0,
      };
      return {
        ok: false,
        latencyMs: Date.now() - start,
        message: `Invalid Stripe credentials. Found: secretKey=${has.secretKey}, mode=${has.mode}`,
      };
    }

    // Validate key prefix
    const isTestKey = creds.secretKey.startsWith("sk_test_");
    const isLiveKey = creds.secretKey.startsWith("sk_live_");

    if (!isTestKey && !isLiveKey) {
      return {
        ok: false,
        latencyMs: Date.now() - start,
        message: "Secret key should start with sk_test_ or sk_live_",
      };
    }

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);

      // Stripe uses Basic auth: secret key as username, empty password
      const basicAuth = Buffer.from(`${creds.secretKey}:`).toString("base64");

      const response = await fetch("https://api.stripe.com/v1/balance", {
        method: "GET",
        headers: {
          Authorization: `Basic ${basicAuth}`,
          "User-Agent": "MissionControl/1.0",
        },
        signal: controller.signal,
      });

      clearTimeout(timeout);
      const latencyMs = Date.now() - start;

      if (!response.ok) {
        const errorData = (await response.json().catch(() => ({}))) as Record<string, unknown>;
        const errorObj = errorData.error as Record<string, unknown> | undefined;
        return {
          ok: false,
          latencyMs,
          message: (errorObj?.message as string) ?? `Stripe API error: ${response.status}`,
          apiResponseCode: response.status,
        };
      }

      const data = (await response.json()) as Record<string, unknown>;
      const livemode = data.livemode as boolean;
      const available = data.available as Array<Record<string, unknown>> | undefined;

      // Build a summary of available balances
      const balanceSummary = available?.map((b) => {
        const amount = Number(b.amount ?? 0) / 100; // Stripe amounts are in cents
        return `${amount.toFixed(2)} ${(b.currency as string)?.toUpperCase() ?? "???"}`;
      }).join(", ") ?? "0.00";

      return {
        ok: true,
        latencyMs,
        message: `Connected (${livemode ? "LIVE" : "test"} mode). Balance: ${balanceSummary}`,
        details: {
          livemode,
          balanceSummary,
          keyPrefix: isTestKey ? "sk_test_" : "sk_live_",
        },
        apiResponseCode: response.status,
      };
    } catch (err) {
      return {
        ok: false,
        latencyMs: Date.now() - start,
        message: err instanceof Error
          ? (err.name === "AbortError" ? "Request timed out (5s)" : err.message)
          : "Network error connecting to Stripe API",
      };
    }
  },
};

// ─── Self-register ──────────────────────────────────────────────────────────

registerAdapter(stripeAdapter);

export { stripeAdapter };
