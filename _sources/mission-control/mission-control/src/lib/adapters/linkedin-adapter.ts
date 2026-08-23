/**
 * LinkedIn Adapter
 *
 * Posts to LinkedIn via Community Management API v2 with OAuth 2.0 bearer token.
 * Also supports health checks via /v2/userinfo (OpenID Connect).
 *
 * Credential format in vault (JSON string):
 * {
 *   "accessToken": "..."          // OAuth 2.0 bearer token
 * }
 *
 * Supported operations:
 * - create-post: Create a text post on the user's LinkedIn feed
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

interface LinkedInCredentials {
  accessToken: string;
}

function parseCredentials(creds: Record<string, unknown>): LinkedInCredentials | null {
  const { accessToken } = creds;
  if (typeof accessToken === "string" && accessToken.length > 0) {
    return { accessToken };
  }
  return null;
}

/** Resolve credentials from vault or service.config fallback. */
function resolveCredentials(ctx: AdapterContext): LinkedInCredentials | null {
  const merged = { ...ctx.service.config, ...ctx.credentials };
  return (
    parseCredentials(merged as Record<string, unknown>) ??
    parseCredentials(ctx.credentials) ??
    parseCredentials(ctx.service.config as Record<string, unknown>)
  );
}

// ─── LinkedIn API Calls ─────────────────────────────────────────────────────

/** Get the user's LinkedIn person URN via /v2/userinfo. */
async function getPersonUrn(accessToken: string): Promise<string> {
  const response = await fetch("https://api.linkedin.com/v2/userinfo", {
    method: "GET",
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error("Access token expired or invalid. Re-authenticate with LinkedIn.");
    }
    throw new Error(`LinkedIn API error: ${response.status}`);
  }

  const data = (await response.json()) as Record<string, unknown>;
  const sub = data.sub;
  if (typeof sub !== "string") {
    throw new Error("Could not resolve LinkedIn person URN from /v2/userinfo");
  }
  return sub;
}

/** Create a text post on LinkedIn. */
async function createPost(
  text: string,
  creds: LinkedInCredentials,
): Promise<AdapterResult> {
  const start = Date.now();

  try {
    // Step 1: Get person URN
    const personUrn = await getPersonUrn(creds.accessToken);

    // Step 2: Create post via Community Management API
    const postBody = {
      author: `urn:li:person:${personUrn}`,
      commentary: text,
      visibility: "PUBLIC",
      distribution: {
        feedDistribution: "MAIN_FEED",
        targetEntities: [],
        thirdPartyDistributionChannels: [],
      },
      lifecycleState: "PUBLISHED",
    };

    const response = await fetch("https://api.linkedin.com/rest/posts", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${creds.accessToken}`,
        "Content-Type": "application/json",
        "LinkedIn-Version": "202401",
        "X-Restli-Protocol-Version": "2.0.0",
      },
      body: JSON.stringify(postBody),
    });

    const executionMs = Date.now() - start;

    if (!response.ok) {
      const errorData = (await response.json().catch(() => ({}))) as Record<string, unknown>;
      const errorMsg =
        (errorData.message as string) ??
        (errorData.error as string) ??
        `LinkedIn API error (HTTP ${response.status})`;
      return {
        success: false,
        data: errorData,
        error: errorMsg,
        apiResponseCode: response.status,
        executionMs,
      };
    }

    // LinkedIn returns the post URN in the x-restli-id header
    const postUrn = response.headers.get("x-restli-id") ?? null;

    return {
      success: true,
      data: {
        postUrn,
        author: `urn:li:person:${personUrn}`,
        text: text.substring(0, 100) + (text.length > 100 ? "..." : ""),
        operation: "create-post",
      },
      apiResponseCode: response.status,
      executionMs,
    };
  } catch (err) {
    return {
      success: false,
      data: {},
      error: err instanceof Error ? err.message : "Failed to post to LinkedIn",
      executionMs: Date.now() - start,
    };
  }
}

// ─── LinkedIn Adapter ───────────────────────────────────────────────────────

const linkedinAdapter: ServiceAdapter = {
  serviceId: "linkedin",
  name: "LinkedIn",
  supportedOperations: ["create-post"],

  validatePayload(payload: Record<string, unknown>): PayloadValidation {
    const errors: string[] = [];

    const text = payload.text;
    if (!text || typeof text !== "string" || text.trim().length === 0) {
      errors.push("'text' (post content) is required");
    } else if (text.length > 3000) {
      errors.push(`Post is ${text.length} characters (LinkedIn max is 3,000)`);
    }

    return { valid: errors.length === 0, errors };
  },

  async execute(ctx: AdapterContext): Promise<AdapterResult> {
    const creds = resolveCredentials(ctx);
    if (!creds) {
      const merged = { ...ctx.service.config, ...ctx.credentials } as Record<string, unknown>;
      const has = {
        accessToken: typeof merged.accessToken === "string" && (merged.accessToken as string).length > 0,
      };
      return {
        success: false,
        data: {},
        error: `Invalid LinkedIn credentials. Found: accessToken=${has.accessToken}`,
      };
    }

    const text = ctx.task.payload.text as string;

    // Dry run: validate credentials by calling userinfo, but don't post
    if (ctx.dryRun) {
      try {
        const personUrn = await getPersonUrn(creds.accessToken);
        return {
          success: true,
          data: {
            dryRun: true,
            operation: "create-post",
            personUrn,
            charCount: text.length,
            message: "Dry run — credentials valid, post not created.",
          },
        };
      } catch (err) {
        return {
          success: false,
          data: {},
          error: `Credential validation failed: ${err instanceof Error ? err.message : "unknown error"}`,
        };
      }
    }

    return createPost(text, creds);
  },

  async healthCheck(
    _service: FieldOpsService,
    credentials: Record<string, unknown>,
  ): Promise<HealthCheckResult> {
    const start = Date.now();
    const creds = parseCredentials(credentials);

    if (!creds) {
      return {
        ok: false,
        latencyMs: Date.now() - start,
        message: "Invalid credentials. Expected: { accessToken }",
      };
    }

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);

      const response = await fetch("https://api.linkedin.com/v2/userinfo", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${creds.accessToken}`,
        },
        signal: controller.signal,
      });

      clearTimeout(timeout);
      const latencyMs = Date.now() - start;

      if (!response.ok) {
        return {
          ok: false,
          latencyMs,
          message: response.status === 401
            ? "Access token expired or invalid. Re-authenticate with LinkedIn."
            : `LinkedIn API error: ${response.status}`,
          apiResponseCode: response.status,
        };
      }

      const data = (await response.json()) as Record<string, unknown>;

      return {
        ok: true,
        latencyMs,
        message: `Connected as ${data.name ?? data.email ?? "LinkedIn user"}`,
        details: {
          name: data.name,
          email: data.email,
          sub: data.sub,
        },
        apiResponseCode: response.status,
      };
    } catch (err) {
      return {
        ok: false,
        latencyMs: Date.now() - start,
        message: err instanceof Error
          ? (err.name === "AbortError" ? "Request timed out (5s)" : err.message)
          : "Network error connecting to LinkedIn API",
      };
    }
  },
};

// ─── Self-register ──────────────────────────────────────────────────────────

registerAdapter(linkedinAdapter);

export { linkedinAdapter };
