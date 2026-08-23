/**
 * Twitter/X Adapter
 *
 * Posts tweets via Twitter API v2 with OAuth 1.0a HMAC-SHA1 signing.
 * Uses only Node.js built-in `crypto` — zero external dependencies.
 *
 * Credential format in vault (JSON string):
 * {
 *   "apiKey": "...",
 *   "apiSecret": "...",
 *   "accessToken": "...",
 *   "accessTokenSecret": "..."
 * }
 *
 * Supported operations:
 * - post-tweet: Create a new tweet (text, optional media)
 * - reply-tweet: Reply to an existing tweet
 * - delete-tweet: Delete a tweet by ID
 */

import { createHmac, randomBytes } from "crypto";
import type { ServiceAdapter, AdapterContext, AdapterResult, PayloadValidation, HealthCheckResult } from "./types";
import type { FieldOpsService } from "@/lib/types";
import { registerAdapter } from "./registry";

// ─── Twitter API v2 Endpoints ───────────────────────────────────────────────

const TWITTER_API_BASE = "https://api.twitter.com/2";

// ─── OAuth 1.0a HMAC-SHA1 Signing ──────────────────────────────────────────

interface OAuthCredentials {
  apiKey: string;
  apiSecret: string;
  accessToken: string;
  accessTokenSecret: string;
}

/** Percent-encode a string per RFC 3986 (required by OAuth 1.0a). */
function percentEncode(str: string): string {
  return encodeURIComponent(str).replace(
    /[!'()*]/g,
    (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`,
  );
}

/** Generate the OAuth 1.0a Authorization header for a request. */
function generateOAuthHeader(
  method: string,
  url: string,
  creds: OAuthCredentials,
  bodyParams: Record<string, string> = {},
): string {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const nonce = randomBytes(16).toString("hex");

  // OAuth parameters (no token_secret — that goes in the signing key)
  const oauthParams: Record<string, string> = {
    oauth_consumer_key: creds.apiKey,
    oauth_nonce: nonce,
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: timestamp,
    oauth_token: creds.accessToken,
    oauth_version: "1.0",
  };

  // Combine all parameters for the signature base string
  const allParams = { ...oauthParams, ...bodyParams };
  const sortedKeys = Object.keys(allParams).sort();
  const paramString = sortedKeys
    .map((k) => `${percentEncode(k)}=${percentEncode(allParams[k])}`)
    .join("&");

  // Signature base string: METHOD&url&params
  const baseString = [
    method.toUpperCase(),
    percentEncode(url),
    percentEncode(paramString),
  ].join("&");

  // Signing key: consumerSecret&tokenSecret
  const signingKey = `${percentEncode(creds.apiSecret)}&${percentEncode(creds.accessTokenSecret)}`;

  // HMAC-SHA1 signature
  const signature = createHmac("sha1", signingKey)
    .update(baseString)
    .digest("base64");

  oauthParams["oauth_signature"] = signature;

  // Build Authorization header
  const headerParts = Object.keys(oauthParams)
    .sort()
    .map((k) => `${percentEncode(k)}="${percentEncode(oauthParams[k])}"`)
    .join(", ");

  return `OAuth ${headerParts}`;
}

// ─── Twitter API Calls ──────────────────────────────────────────────────────

async function postTweet(
  text: string,
  creds: OAuthCredentials,
  replyToId?: string,
): Promise<AdapterResult> {
  const start = Date.now();
  const url = `${TWITTER_API_BASE}/tweets`;

  const requestBody: Record<string, unknown> = { text };
  if (replyToId) {
    requestBody.reply = { in_reply_to_tweet_id: replyToId };
  }

  const authHeader = generateOAuthHeader("POST", url, creds);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/json",
        "User-Agent": "MissionControl/1.0",
      },
      body: JSON.stringify(requestBody),
    });

    const executionMs = Date.now() - start;
    const responseData = await response.json();

    if (!response.ok) {
      return {
        success: false,
        data: responseData,
        error: responseData?.detail || responseData?.title || `Twitter API error: ${response.status}`,
        apiResponseCode: response.status,
        executionMs,
      };
    }

    const tweetId = responseData?.data?.id;
    return {
      success: true,
      data: {
        tweetId,
        text: responseData?.data?.text ?? text,
        url: tweetId ? `https://x.com/i/web/status/${tweetId}` : null,
        operation: replyToId ? "reply-tweet" : "post-tweet",
        replyToId: replyToId ?? null,
      },
      apiResponseCode: response.status,
      executionMs,
    };
  } catch (err) {
    return {
      success: false,
      data: {},
      error: err instanceof Error ? err.message : "Network error connecting to Twitter API",
      executionMs: Date.now() - start,
    };
  }
}

async function deleteTweet(
  tweetId: string,
  creds: OAuthCredentials,
): Promise<AdapterResult> {
  const start = Date.now();
  const url = `${TWITTER_API_BASE}/tweets/${tweetId}`;
  const authHeader = generateOAuthHeader("DELETE", url, creds);

  try {
    const response = await fetch(url, {
      method: "DELETE",
      headers: {
        Authorization: authHeader,
        "User-Agent": "MissionControl/1.0",
      },
    });

    const executionMs = Date.now() - start;
    const responseData = await response.json();

    if (!response.ok) {
      return {
        success: false,
        data: responseData,
        error: responseData?.detail || `Twitter API error: ${response.status}`,
        apiResponseCode: response.status,
        executionMs,
      };
    }

    return {
      success: true,
      data: {
        tweetId,
        deleted: responseData?.data?.deleted ?? true,
        operation: "delete-tweet",
      },
      apiResponseCode: response.status,
      executionMs,
    };
  } catch (err) {
    return {
      success: false,
      data: {},
      error: err instanceof Error ? err.message : "Network error connecting to Twitter API",
      executionMs: Date.now() - start,
    };
  }
}

// ─── Twitter Adapter ────────────────────────────────────────────────────────

function parseCredentials(creds: Record<string, unknown>): OAuthCredentials | null {
  const { apiKey, apiSecret, accessToken, accessTokenSecret } = creds;
  if (
    typeof apiKey === "string" &&
    typeof apiSecret === "string" &&
    typeof accessToken === "string" &&
    typeof accessTokenSecret === "string"
  ) {
    return { apiKey, apiSecret, accessToken, accessTokenSecret };
  }
  return null;
}

const twitterAdapter: ServiceAdapter = {
  serviceId: "twitter",
  name: "Twitter / X",
  supportedOperations: ["post-tweet", "reply-tweet", "delete-tweet"],

  validatePayload(payload: Record<string, unknown>): PayloadValidation {
    const errors: string[] = [];
    const operation = (payload.operation as string) ?? "post-tweet";

    if (!["post-tweet", "reply-tweet", "delete-tweet"].includes(operation)) {
      errors.push(`Unsupported operation: "${operation}". Supported: post-tweet, reply-tweet, delete-tweet`);
      return { valid: false, errors };
    }

    if (operation === "delete-tweet") {
      if (!payload.tweetId || typeof payload.tweetId !== "string") {
        errors.push("tweetId is required for delete-tweet operation");
      }
    } else {
      // post-tweet or reply-tweet
      const text = payload.text;
      if (!text || typeof text !== "string") {
        errors.push("text is required");
      } else if (text.length === 0) {
        errors.push("text cannot be empty");
      } else if (text.length > 280) {
        errors.push(`text is ${text.length} characters (max 280)`);
      }

      if (operation === "reply-tweet") {
        if (!payload.replyToId || typeof payload.replyToId !== "string") {
          errors.push("replyToId is required for reply-tweet operation");
        }
      }
    }

    return { valid: errors.length === 0, errors };
  },

  async healthCheck(
    _service: FieldOpsService,
    credentials: Record<string, unknown>,
  ): Promise<HealthCheckResult> {
    const start = Date.now();
    const oauthCreds = parseCredentials(credentials);

    if (!oauthCreds) {
      return {
        ok: false,
        latencyMs: Date.now() - start,
        message: "Invalid credentials. Expected: { apiKey, apiSecret, accessToken, accessTokenSecret }",
      };
    }

    const url = `${TWITTER_API_BASE}/users/me`;
    const authHeader = generateOAuthHeader("GET", url, oauthCreds);

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(url, {
        method: "GET",
        headers: {
          Authorization: authHeader,
          "User-Agent": "MissionControl/1.0",
        },
        signal: controller.signal,
      });

      clearTimeout(timeout);
      const latencyMs = Date.now() - start;

      if (!response.ok) {
        const errorData = (await response.json().catch(() => ({}))) as Record<string, unknown>;
        return {
          ok: false,
          latencyMs,
          message: (errorData?.detail as string) ?? (errorData?.title as string) ?? `Twitter API error: ${response.status}`,
          apiResponseCode: response.status,
        };
      }

      const data = (await response.json()) as Record<string, unknown>;
      const userData = data.data as Record<string, unknown> | undefined;

      return {
        ok: true,
        latencyMs,
        message: `Connected as @${userData?.username ?? "unknown"}`,
        details: {
          username: userData?.username,
          name: userData?.name,
          id: userData?.id,
        },
        apiResponseCode: response.status,
      };
    } catch (err) {
      return {
        ok: false,
        latencyMs: Date.now() - start,
        message: err instanceof Error
          ? (err.name === "AbortError" ? "Request timed out (5s)" : err.message)
          : "Network error connecting to Twitter API",
      };
    }
  },

  async execute(ctx: AdapterContext): Promise<AdapterResult> {
    const merged = { ...ctx.service.config, ...ctx.credentials };
    const oauthCreds = parseCredentials(merged as Record<string, unknown>) ?? parseCredentials(ctx.credentials);
    if (!oauthCreds) {
      const has = {
        apiKey: typeof merged.apiKey === "string" && (merged.apiKey as string).length > 0,
        apiSecret: typeof merged.apiSecret === "string" && (merged.apiSecret as string).length > 0,
        accessToken: typeof merged.accessToken === "string" && (merged.accessToken as string).length > 0,
        accessTokenSecret: typeof merged.accessTokenSecret === "string" && (merged.accessTokenSecret as string).length > 0,
      };
      return {
        success: false,
        data: {},
        error: `Invalid Twitter credentials. Found: apiKey=${has.apiKey}, apiSecret=${has.apiSecret}, accessToken=${has.accessToken}, accessTokenSecret=${has.accessTokenSecret}`,
      };
    }

    const operation = (ctx.task.payload.operation as string) ?? "post-tweet";

    // Dry run: validate credentials and payload, return simulated result
    if (ctx.dryRun) {
      const dryRunData: Record<string, unknown> = {
        dryRun: true,
        operation,
        message: "Dry run — validation passed, API call not made.",
      };

      if (operation === "post-tweet" || operation === "reply-tweet") {
        dryRunData.text = ctx.task.payload.text;
        dryRunData.charCount = (ctx.task.payload.text as string).length;
        if (operation === "reply-tweet") {
          dryRunData.replyToId = ctx.task.payload.replyToId;
        }
      } else if (operation === "delete-tweet") {
        dryRunData.tweetId = ctx.task.payload.tweetId;
      }

      return {
        success: true,
        data: dryRunData,
      };
    }

    switch (operation) {
      case "post-tweet":
        return postTweet(ctx.task.payload.text as string, oauthCreds);

      case "reply-tweet":
        return postTweet(
          ctx.task.payload.text as string,
          oauthCreds,
          ctx.task.payload.replyToId as string,
        );

      case "delete-tweet":
        return deleteTweet(ctx.task.payload.tweetId as string, oauthCreds);

      default:
        return {
          success: false,
          data: {},
          error: `Unknown operation: ${operation}`,
        };
    }
  },
};

// ─── Self-register ──────────────────────────────────────────────────────────

registerAdapter(twitterAdapter);

export { twitterAdapter };
