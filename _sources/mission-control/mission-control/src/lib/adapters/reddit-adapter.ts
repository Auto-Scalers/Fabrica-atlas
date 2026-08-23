/**
 * Reddit Adapter
 *
 * Submits posts, comments, and deletions via Reddit's API with OAuth2
 * "script" app authentication (username/password grant).
 * Uses only Node.js built-ins — zero external dependencies.
 *
 * Credential format in vault (JSON string):
 * {
 *   "clientId": "...",
 *   "clientSecret": "...",
 *   "username": "...",
 *   "password": "...",
 *   "userAgent": "MissionControl:fieldops:1.0 (by /u/username)"
 * }
 *
 * Supported operations:
 * - post-text: Submit a text/self post to a subreddit
 * - post-link: Submit a link post to a subreddit
 * - comment: Comment on a post or reply to a comment
 * - delete: Delete a post or comment
 */

import type { ServiceAdapter, AdapterContext, AdapterResult, PayloadValidation, HealthCheckResult } from "./types";
import type { FieldOpsService } from "@/lib/types";
import { registerAdapter } from "./registry";

// ─── Reddit API Endpoints ───────────────────────────────────────────────────

const REDDIT_TOKEN_URL = "https://www.reddit.com/api/v1/access_token";
const REDDIT_API_BASE = "https://oauth.reddit.com";

// ─── OAuth2 Token Cache ─────────────────────────────────────────────────────

interface RedditCredentials {
  clientId: string;
  clientSecret: string;
  username: string;
  password: string;
  userAgent: string;
}

interface CachedToken {
  accessToken: string;
  expiresAt: number; // Unix ms timestamp
}

let tokenCache: CachedToken | null = null;

/** Acquire an OAuth2 access token, using cached token if still valid. */
async function acquireToken(creds: RedditCredentials): Promise<string> {
  // Return cached token if it has at least 60 seconds of life left
  if (tokenCache && tokenCache.expiresAt > Date.now() + 60_000) {
    return tokenCache.accessToken;
  }

  const basicAuth = Buffer.from(`${creds.clientId}:${creds.clientSecret}`).toString("base64");

  const body = new URLSearchParams({
    grant_type: "password",
    username: creds.username,
    password: creds.password,
  });

  const response = await fetch(REDDIT_TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basicAuth}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": creds.userAgent,
    },
    body: body.toString(),
  });

  if (!response.ok) {
    const errorData = (await response.json().catch(() => ({}))) as Record<string, unknown>;
    const code = (errorData.error as string) ?? "unknown";
    const desc = (errorData.error_description as string) ?? "";
    throw new Error(
      `Reddit OAuth failed (HTTP ${response.status}): ${code}${desc ? ` — ${desc}` : ""}`,
    );
  }

  const data = (await response.json()) as Record<string, unknown>;
  const accessToken = data.access_token as string;
  const expiresIn = (data.expires_in as number) ?? 3600;

  // Before setting new token, clear old from memory
  if (tokenCache?.accessToken) {
    tokenCache.accessToken = "";
  }

  tokenCache = {
    accessToken,
    expiresAt: Date.now() + expiresIn * 1000,
  };

  return accessToken;
}

// ─── Reddit API Calls ───────────────────────────────────────────────────────

async function submitPost(
  kind: "self" | "link",
  subreddit: string,
  title: string,
  content: string, // text for self, url for link
  creds: RedditCredentials,
): Promise<AdapterResult> {
  const start = Date.now();

  try {
    const token = await acquireToken(creds);

    const params = new URLSearchParams({
      api_type: "json",
      kind,
      sr: subreddit,
      title,
    });

    if (kind === "self") {
      params.set("text", content);
    } else {
      params.set("url", content);
    }

    const response = await fetch(`${REDDIT_API_BASE}/api/submit`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": creds.userAgent,
      },
      body: params.toString(),
    });

    const executionMs = Date.now() - start;
    const responseData = (await response.json()) as Record<string, unknown>;

    if (!response.ok) {
      const errMsg = (responseData.message as string)
        ?? (responseData.error as string)
        ?? `Reddit API error (HTTP ${response.status})`;
      return {
        success: false,
        data: responseData,
        error: errMsg,
        apiResponseCode: response.status,
        executionMs,
      };
    }

    // Reddit wraps submit responses in json.data
    const jsonWrapper = responseData.json as Record<string, unknown> | undefined;
    const errors = jsonWrapper?.errors as unknown[] | undefined;

    if (errors && errors.length > 0) {
      return {
        success: false,
        data: responseData,
        error: `Reddit submit error: ${JSON.stringify(errors)}`,
        apiResponseCode: response.status,
        executionMs,
      };
    }

    const postData = jsonWrapper?.data as Record<string, unknown> | undefined;
    const postUrl = (postData?.url as string) ?? null;
    const postId = (postData?.id as string) ?? null;
    const postName = (postData?.name as string) ?? null;

    return {
      success: true,
      data: {
        postId,
        postName,
        url: postUrl,
        subreddit,
        title,
        kind,
        operation: kind === "self" ? "post-text" : "post-link",
      },
      apiResponseCode: response.status,
      executionMs,
    };
  } catch (err) {
    return {
      success: false,
      data: {},
      error: err instanceof Error ? err.message : "Network error connecting to Reddit API",
      executionMs: Date.now() - start,
    };
  }
}

async function postComment(
  thingId: string,
  text: string,
  creds: RedditCredentials,
): Promise<AdapterResult> {
  const start = Date.now();

  try {
    const token = await acquireToken(creds);

    const params = new URLSearchParams({
      api_type: "json",
      thing_id: thingId,
      text,
    });

    const response = await fetch(`${REDDIT_API_BASE}/api/comment`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": creds.userAgent,
      },
      body: params.toString(),
    });

    const executionMs = Date.now() - start;
    const responseData = (await response.json()) as Record<string, unknown>;

    if (!response.ok) {
      const errMsg = (responseData.message as string)
        ?? (responseData.error as string)
        ?? `Reddit API error (HTTP ${response.status})`;
      return {
        success: false,
        data: responseData,
        error: errMsg,
        apiResponseCode: response.status,
        executionMs,
      };
    }

    const jsonWrapper = responseData.json as Record<string, unknown> | undefined;
    const errors = jsonWrapper?.errors as unknown[] | undefined;

    if (errors && errors.length > 0) {
      return {
        success: false,
        data: responseData,
        error: `Reddit comment error: ${JSON.stringify(errors)}`,
        apiResponseCode: response.status,
        executionMs,
      };
    }

    // Extract comment data from response
    const commentData = jsonWrapper?.data as Record<string, unknown> | undefined;
    const things = commentData?.things as Record<string, unknown>[] | undefined;
    const commentThing = things?.[0];
    const commentThingData = commentThing?.data as Record<string, unknown> | undefined;

    return {
      success: true,
      data: {
        commentId: commentThingData?.id ?? null,
        commentName: commentThingData?.name ?? null,
        parentId: thingId,
        operation: "comment",
      },
      apiResponseCode: response.status,
      executionMs,
    };
  } catch (err) {
    return {
      success: false,
      data: {},
      error: err instanceof Error ? err.message : "Network error connecting to Reddit API",
      executionMs: Date.now() - start,
    };
  }
}

async function deleteThing(
  thingId: string,
  creds: RedditCredentials,
): Promise<AdapterResult> {
  const start = Date.now();

  try {
    const token = await acquireToken(creds);

    const params = new URLSearchParams({
      id: thingId,
    });

    const response = await fetch(`${REDDIT_API_BASE}/api/del`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": creds.userAgent,
      },
      body: params.toString(),
    });

    const executionMs = Date.now() - start;

    if (!response.ok) {
      const responseData = (await response.json().catch(() => ({}))) as Record<string, unknown>;
      const errMsg = (responseData.message as string)
        ?? (responseData.error as string)
        ?? `Reddit API error (HTTP ${response.status})`;
      return {
        success: false,
        data: responseData,
        error: errMsg,
        apiResponseCode: response.status,
        executionMs,
      };
    }

    // Reddit's delete endpoint returns an empty JSON object on success
    return {
      success: true,
      data: {
        thingId,
        deleted: true,
        operation: "delete",
      },
      apiResponseCode: response.status,
      executionMs,
    };
  } catch (err) {
    return {
      success: false,
      data: {},
      error: err instanceof Error ? err.message : "Network error connecting to Reddit API",
      executionMs: Date.now() - start,
    };
  }
}

// ─── Reddit Adapter ─────────────────────────────────────────────────────────

function parseCredentials(creds: Record<string, unknown>): RedditCredentials | null {
  const { clientId, clientSecret, username, password, userAgent } = creds;
  if (
    typeof clientId === "string" &&
    typeof clientSecret === "string" &&
    typeof username === "string" &&
    typeof password === "string" &&
    typeof userAgent === "string"
  ) {
    return { clientId, clientSecret, username, password, userAgent };
  }
  return null;
}

const redditAdapter: ServiceAdapter = {
  serviceId: "reddit",
  name: "Reddit",
  supportedOperations: ["post-text", "post-link", "comment", "delete"],

  validatePayload(payload: Record<string, unknown>): PayloadValidation {
    const errors: string[] = [];
    const operation = (payload.operation as string) ?? "post-text";

    if (!["post-text", "post-link", "comment", "delete"].includes(operation)) {
      errors.push(`Unsupported operation: "${operation}". Supported: post-text, post-link, comment, delete`);
      return { valid: false, errors };
    }

    if (operation === "post-text" || operation === "post-link") {
      // Subreddit validation
      const subreddit = payload.subreddit;
      if (!subreddit || typeof subreddit !== "string") {
        errors.push("subreddit is required for post operations");
      } else if (subreddit.length === 0) {
        errors.push("subreddit cannot be empty");
      } else if (subreddit.startsWith("r/")) {
        errors.push('subreddit should not include "r/" prefix');
      } else if (!/^[a-zA-Z0-9_]+$/.test(subreddit)) {
        errors.push("subreddit must contain only alphanumeric characters and underscores");
      }

      // Title validation
      const title = payload.title;
      if (!title || typeof title !== "string") {
        errors.push("title is required for post operations");
      } else if (title.length === 0) {
        errors.push("title cannot be empty");
      } else if (title.length > 300) {
        errors.push(`title is ${title.length} characters (max 300)`);
      }

      if (operation === "post-text") {
        const text = payload.text;
        if (text !== undefined && typeof text !== "string") {
          errors.push("text must be a string if provided");
        }
      }

      if (operation === "post-link") {
        const url = payload.url;
        if (!url || typeof url !== "string") {
          errors.push("url is required for post-link operation");
        } else if (url.length === 0) {
          errors.push("url cannot be empty");
        } else {
          try {
            new URL(url);
          } catch {
            errors.push("url must be a valid URL");
          }
        }
      }
    }

    if (operation === "comment") {
      const thingId = payload.thingId;
      if (!thingId || typeof thingId !== "string") {
        errors.push("thingId is required for comment operation");
      } else if (!thingId.startsWith("t3_") && !thingId.startsWith("t1_")) {
        errors.push('thingId must start with "t3_" (post) or "t1_" (comment)');
      }

      const text = payload.text;
      if (!text || typeof text !== "string") {
        errors.push("text is required for comment operation");
      } else if (text.length === 0) {
        errors.push("text cannot be empty");
      }
    }

    if (operation === "delete") {
      const thingId = payload.thingId;
      if (!thingId || typeof thingId !== "string") {
        errors.push("thingId is required for delete operation");
      } else if (!thingId.startsWith("t3_") && !thingId.startsWith("t1_")) {
        errors.push('thingId must start with "t3_" (post) or "t1_" (comment)');
      }
    }

    return { valid: errors.length === 0, errors };
  },

  async healthCheck(
    _service: FieldOpsService,
    credentials: Record<string, unknown>,
  ): Promise<HealthCheckResult> {
    const start = Date.now();
    const redditCreds = parseCredentials(credentials);

    if (!redditCreds) {
      return {
        ok: false,
        latencyMs: Date.now() - start,
        message: "Invalid credentials. Expected: { clientId, clientSecret, username, password, userAgent }",
      };
    }

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);

      const token = await acquireToken(redditCreds);

      const response = await fetch(`${REDDIT_API_BASE}/api/v1/me`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "User-Agent": redditCreds.userAgent,
        },
        signal: controller.signal,
      });

      clearTimeout(timeout);
      const latencyMs = Date.now() - start;

      if (!response.ok) {
        return {
          ok: false,
          latencyMs,
          message: `Reddit API error: ${response.status}`,
          apiResponseCode: response.status,
        };
      }

      const data = (await response.json()) as Record<string, unknown>;

      return {
        ok: true,
        latencyMs,
        message: `Connected as /u/${data.name ?? "unknown"}`,
        details: {
          username: data.name,
          commentKarma: data.comment_karma,
          linkKarma: data.link_karma,
        },
        apiResponseCode: response.status,
      };
    } catch (err) {
      return {
        ok: false,
        latencyMs: Date.now() - start,
        message: err instanceof Error
          ? (err.name === "AbortError" ? "Request timed out (5s)" : err.message)
          : "Network error connecting to Reddit API",
      };
    }
  },

  async execute(ctx: AdapterContext): Promise<AdapterResult> {
    const redditCreds = parseCredentials(ctx.credentials);
    if (!redditCreds) {
      const merged = ctx.credentials as Record<string, unknown>;
      const has = {
        clientId: typeof merged.clientId === "string" && (merged.clientId as string).length > 0,
        clientSecret: typeof merged.clientSecret === "string" && (merged.clientSecret as string).length > 0,
        username: typeof merged.username === "string" && (merged.username as string).length > 0,
        password: typeof merged.password === "string" && (merged.password as string).length > 0,
        userAgent: typeof merged.userAgent === "string" && (merged.userAgent as string).length > 0,
      };
      return {
        success: false,
        data: {},
        error: `Invalid Reddit credentials. Found: clientId=${has.clientId}, clientSecret=${has.clientSecret}, username=${has.username}, password=${has.password}, userAgent=${has.userAgent}`,
      };
    }

    // Bot disclosure footer (from service config, non-sensitive)
    const botDisclosure = typeof ctx.credentials.botDisclosure === "string"
      ? (ctx.credentials.botDisclosure as string).trim()
      : "";

    const operation = (ctx.task.payload.operation as string) ?? "post-text";

    /** Append bot disclosure footer to text content if configured. */
    function withDisclosure(text: string): string {
      return botDisclosure ? `${text}\n\n${botDisclosure}` : text;
    }

    // Dry run: validate credentials and payload, return simulated result
    if (ctx.dryRun) {
      const dryRunData: Record<string, unknown> = {
        dryRun: true,
        operation,
        message: "Dry run — validation passed, API call not made.",
      };

      if (operation === "post-text") {
        dryRunData.subreddit = ctx.task.payload.subreddit;
        dryRunData.title = ctx.task.payload.title;
        dryRunData.textLength = ((ctx.task.payload.text as string) ?? "").length;
      } else if (operation === "post-link") {
        dryRunData.subreddit = ctx.task.payload.subreddit;
        dryRunData.title = ctx.task.payload.title;
        dryRunData.url = ctx.task.payload.url;
      } else if (operation === "comment") {
        dryRunData.thingId = ctx.task.payload.thingId;
        dryRunData.textLength = (ctx.task.payload.text as string).length;
      } else if (operation === "delete") {
        dryRunData.thingId = ctx.task.payload.thingId;
      }

      if (botDisclosure) {
        dryRunData.botDisclosure = botDisclosure;
      }

      return {
        success: true,
        data: dryRunData,
      };
    }

    switch (operation) {
      case "post-text":
        return submitPost(
          "self",
          ctx.task.payload.subreddit as string,
          ctx.task.payload.title as string,
          withDisclosure((ctx.task.payload.text as string) ?? ""),
          redditCreds,
        );

      case "post-link":
        return submitPost(
          "link",
          ctx.task.payload.subreddit as string,
          ctx.task.payload.title as string,
          ctx.task.payload.url as string,
          redditCreds,
        );

      case "comment":
        return postComment(
          ctx.task.payload.thingId as string,
          withDisclosure(ctx.task.payload.text as string),
          redditCreds,
        );

      case "delete":
        return deleteThing(
          ctx.task.payload.thingId as string,
          redditCreds,
        );

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

registerAdapter(redditAdapter);

export { redditAdapter };
