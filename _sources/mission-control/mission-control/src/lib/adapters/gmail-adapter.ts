/**
 * Gmail Adapter
 *
 * Sends emails via Gmail API v1 with OAuth 2.0 refresh token flow.
 * Uses only Node.js built-ins — zero external dependencies.
 *
 * Credential format (in service.config or vault):
 * {
 *   "clientId": "...",
 *   "clientSecret": "...",
 *   "refreshToken": "..."
 * }
 *
 * Supported operations:
 * - send-email: Send an email (to, subject, body)
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

// ─── Constants ──────────────────────────────────────────────────────────────

const GMAIL_API_BASE = "https://gmail.googleapis.com/gmail/v1";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";

// ─── Credential Parsing ─────────────────────────────────────────────────────

interface GmailCredentials {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
}

function parseCredentials(creds: Record<string, unknown>): GmailCredentials | null {
  const { clientId, clientSecret, refreshToken } = creds;
  if (
    typeof clientId === "string" && clientId.length > 0 &&
    typeof clientSecret === "string" && clientSecret.length > 0 &&
    typeof refreshToken === "string" && refreshToken.length > 0
  ) {
    return { clientId, clientSecret, refreshToken };
  }
  return null;
}

/** Resolve credentials — merge vault credentials with service config for complete resolution. */
function resolveCredentials(ctx: AdapterContext): GmailCredentials | null {
  const merged = { ...ctx.service.config, ...ctx.credentials };
  return (
    parseCredentials(merged as Record<string, unknown>) ??
    parseCredentials(ctx.credentials) ??
    parseCredentials(ctx.service.config as Record<string, unknown>)
  );
}

// ─── OAuth2 Token Exchange ──────────────────────────────────────────────────

async function getAccessToken(creds: GmailCredentials): Promise<string> {
  const body = new URLSearchParams({
    client_id: creds.clientId,
    client_secret: creds.clientSecret,
    refresh_token: creds.refreshToken,
    grant_type: "refresh_token",
  });

  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!response.ok) {
    const err = (await response.json().catch(() => ({}))) as Record<string, unknown>;
    const code = (err.error as string) ?? "unknown";
    const desc = (err.error_description as string) ?? "";
    throw new Error(
      `OAuth token exchange failed (HTTP ${response.status}): ${code}${desc ? ` — ${desc}` : ""}`,
    );
  }

  const data = (await response.json()) as Record<string, unknown>;
  const accessToken = data.access_token;
  if (typeof accessToken !== "string") {
    throw new Error("No access_token in token response");
  }
  return accessToken;
}

// ─── Email Construction ─────────────────────────────────────────────────────

/** Build an RFC 2822 email and base64url-encode it for the Gmail API. */
function buildRawEmail(to: string, subject: string, body: string): string {
  const lines = [
    `To: ${to}`,
    `Subject: ${subject}`,
    "MIME-Version: 1.0",
    "Content-Type: text/plain; charset=utf-8",
    "",
    body,
  ];
  const raw = lines.join("\r\n");
  // base64url encode (Gmail API requirement)
  return Buffer.from(raw, "utf-8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

// ─── Gmail API Calls ────────────────────────────────────────────────────────

async function sendEmail(
  to: string,
  subject: string,
  body: string,
  creds: GmailCredentials,
): Promise<AdapterResult> {
  const start = Date.now();

  try {
    const accessToken = await getAccessToken(creds);
    const raw = buildRawEmail(to, subject, body);

    const response = await fetch(`${GMAIL_API_BASE}/users/me/messages/send`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ raw }),
    });

    const executionMs = Date.now() - start;
    const responseData = (await response.json().catch(() => ({}))) as Record<string, unknown>;

    if (!response.ok) {
      const errorMsg =
        ((responseData.error as Record<string, unknown>)?.message as string) ??
        `Gmail API error: ${response.status}`;
      return {
        success: false,
        data: responseData,
        error: errorMsg,
        apiResponseCode: response.status,
        executionMs,
      };
    }

    return {
      success: true,
      data: {
        messageId: responseData.id,
        threadId: responseData.threadId,
        to,
        subject,
        operation: "send-email",
      },
      apiResponseCode: response.status,
      executionMs,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to send email via Gmail API";
    return {
      success: false,
      data: {
        phase: msg.toLowerCase().includes("token") || msg.toLowerCase().includes("oauth") ? "oauth-token-exchange" : "api-call",
        credentialCheck: {
          hasClientId: creds.clientId.length > 0,
          hasClientSecret: creds.clientSecret.length > 0,
          hasRefreshToken: creds.refreshToken.length > 0,
          clientIdPrefix: creds.clientId.slice(0, 12) + "...",
        },
      },
      error: msg,
      executionMs: Date.now() - start,
    };
  }
}

// ─── Gmail Adapter ──────────────────────────────────────────────────────────

const gmailAdapter: ServiceAdapter = {
  serviceId: "gmail",
  name: "Gmail",
  supportedOperations: ["send-email"],

  validatePayload(payload: Record<string, unknown>): PayloadValidation {
    const errors: string[] = [];

    const to = payload.to;
    if (!to || typeof to !== "string") {
      errors.push("'to' (recipient email address) is required");
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
      errors.push(`Invalid email address: "${to}"`);
    }

    const subject = payload.subject;
    if (!subject || typeof subject !== "string" || subject.trim().length === 0) {
      errors.push("'subject' is required");
    }

    const body = payload.body;
    if (!body || typeof body !== "string" || body.trim().length === 0) {
      errors.push("'body' is required");
    }

    return { valid: errors.length === 0, errors };
  },

  async execute(ctx: AdapterContext): Promise<AdapterResult> {
    const creds = resolveCredentials(ctx);
    if (!creds) {
      const merged = { ...ctx.service.config, ...ctx.credentials } as Record<string, unknown>;
      const has = {
        clientId: typeof merged.clientId === "string" && (merged.clientId as string).length > 0,
        clientSecret: typeof merged.clientSecret === "string" && (merged.clientSecret as string).length > 0,
        refreshToken: typeof merged.refreshToken === "string" && (merged.refreshToken as string).length > 0,
      };
      return {
        success: false,
        data: {},
        error: `Invalid Gmail credentials. Found: clientId=${has.clientId}, clientSecret=${has.clientSecret}, refreshToken=${has.refreshToken}`,
      };
    }

    const to = ctx.task.payload.to as string;
    const subject = ctx.task.payload.subject as string;
    const body = ctx.task.payload.body as string;

    // Dry run: validate credentials by exchanging token, but don't send
    if (ctx.dryRun) {
      try {
        await getAccessToken(creds);
        return {
          success: true,
          data: {
            dryRun: true,
            operation: "send-email",
            to,
            subject,
            message: "Dry run — credentials valid, email not sent.",
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

    return sendEmail(to, subject, body, creds);
  },

  async healthCheck(
    service: FieldOpsService,
    credentials: Record<string, unknown>,
  ): Promise<HealthCheckResult> {
    const start = Date.now();
    const creds =
      parseCredentials(credentials) ??
      parseCredentials(service.config as Record<string, unknown>);

    if (!creds) {
      return {
        ok: false,
        latencyMs: Date.now() - start,
        message: "Invalid credentials. Expected: { clientId, clientSecret, refreshToken }",
      };
    }

    try {
      const accessToken = await getAccessToken(creds);

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(`${GMAIL_API_BASE}/users/me/profile`, {
        method: "GET",
        headers: { Authorization: `Bearer ${accessToken}` },
        signal: controller.signal,
      });

      clearTimeout(timeout);
      const latencyMs = Date.now() - start;

      if (!response.ok) {
        return {
          ok: false,
          latencyMs,
          message: `Gmail API error: ${response.status}`,
          apiResponseCode: response.status,
        };
      }

      const data = (await response.json()) as Record<string, unknown>;

      return {
        ok: true,
        latencyMs,
        message: `Connected as ${data.emailAddress ?? "Gmail user"}`,
        details: {
          emailAddress: data.emailAddress,
          messagesTotal: data.messagesTotal,
          threadsTotal: data.threadsTotal,
        },
        apiResponseCode: response.status,
      };
    } catch (err) {
      return {
        ok: false,
        latencyMs: Date.now() - start,
        message: err instanceof Error
          ? (err.name === "AbortError" ? "Request timed out (5s)" : err.message)
          : "Failed to connect to Gmail API",
      };
    }
  },
};

// ─── Self-register ──────────────────────────────────────────────────────────

registerAdapter(gmailAdapter);

export { gmailAdapter };
