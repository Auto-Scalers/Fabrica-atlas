/**
 * Vault Session — Server-Side In-Memory Master Password Cache
 *
 * Caches the master password in Node.js process memory with a 30-minute TTL.
 * The password is never persisted to disk, never sent to the client,
 * and auto-expires via setTimeout.
 *
 * This works for local-first development (Next.js dev server = single long-lived
 * process). It would NOT work in serverless deployments (each invocation is
 * a fresh process). For serverless, you'd need encrypted session cookies or
 * a KMS solution.
 *
 * DO NOT import from client components — this is server-only.
 */

// ─── Configuration ──────────────────────────────────────────────────────────

/** Session TTL in milliseconds (30 minutes). */
const SESSION_TTL_MS = 30 * 60 * 1000;

// ─── Session State (module-level singleton) ─────────────────────────────────

let cachedPassword: string | null = null;
let expiryTimer: ReturnType<typeof setTimeout> | null = null;
let sessionStartedAt: number | null = null;

// ─── Session API ────────────────────────────────────────────────────────────

/**
 * Cache the master password for the session TTL.
 * Resets the expiry timer if already active.
 */
export function setPassword(password: string): void {
  // Clear any existing timer
  if (expiryTimer) {
    clearTimeout(expiryTimer);
  }

  cachedPassword = password;
  sessionStartedAt = Date.now();

  // Auto-expire after TTL
  expiryTimer = setTimeout(() => {
    clear();
  }, SESSION_TTL_MS);
}

/**
 * Retrieve the cached master password.
 * Returns null if no session is active or it has expired.
 */
export function getPassword(): string | null {
  return cachedPassword;
}

/**
 * Clear the session — removes password and cancels the expiry timer.
 */
export function clear(): void {
  cachedPassword = null;
  sessionStartedAt = null;
  if (expiryTimer) {
    clearTimeout(expiryTimer);
    expiryTimer = null;
  }
}

/**
 * Check if a vault session is currently active.
 */
export function isActive(): boolean {
  return cachedPassword !== null;
}

/**
 * Get remaining session time in milliseconds.
 * Returns 0 if no session is active.
 */
export function getRemainingMs(): number {
  if (!sessionStartedAt) return 0;
  const elapsed = Date.now() - sessionStartedAt;
  const remaining = SESSION_TTL_MS - elapsed;
  return Math.max(0, remaining);
}

/**
 * Get session info for the API response (no password exposed).
 */
export function getSessionInfo(): {
  active: boolean;
  remainingMs: number;
  ttlMs: number;
} {
  return {
    active: isActive(),
    remainingMs: getRemainingMs(),
    ttlMs: SESSION_TTL_MS,
  };
}
