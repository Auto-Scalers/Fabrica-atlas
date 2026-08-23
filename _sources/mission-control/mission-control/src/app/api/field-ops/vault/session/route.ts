import { NextResponse } from "next/server";
import { getFieldCredentials } from "@/lib/data";
import { verifyMasterPassword } from "@/lib/vault-crypto";
import { vaultRateLimiter } from "@/lib/field-ops-security";
import * as vaultSession from "@/lib/vault-session";

export const dynamic = "force-dynamic";

// ─── GET: Check session status ──────────────────────────────────────────────

export async function GET() {
  return NextResponse.json(vaultSession.getSessionInfo());
}

// ─── POST: Unlock vault (cache master password) ─────────────────────────────

export async function POST(request: Request) {
  // Rate limit check
  const rateCheck = vaultRateLimiter.checkRateLimit();
  if (!rateCheck.allowed) {
    return NextResponse.json(
      {
        error: "Too many failed attempts. Try again later.",
        retryAfterMs: rateCheck.retryAfterMs,
      },
      { status: 429 },
    );
  }

  let body: { masterPassword?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { masterPassword } = body;
  if (!masterPassword || typeof masterPassword !== "string") {
    return NextResponse.json(
      { error: "masterPassword is required" },
      { status: 400 },
    );
  }

  // Load vault to get stored hash
  const credData = await getFieldCredentials();
  if (!credData.masterKeyHash) {
    return NextResponse.json(
      { error: "Vault not initialized. Store a credential first." },
      { status: 400 },
    );
  }

  // Verify password
  const valid = verifyMasterPassword(masterPassword, credData.masterKeyHash);
  if (!valid) {
    vaultRateLimiter.recordFailure();
    return NextResponse.json(
      {
        error: "Invalid master password",
        failureCount: vaultRateLimiter.getFailureCount(),
      },
      { status: 403 },
    );
  }

  // Password correct — cache it
  vaultRateLimiter.recordSuccess();
  vaultSession.setPassword(masterPassword);

  return NextResponse.json(vaultSession.getSessionInfo());
}

// ─── DELETE: Lock vault (clear session) ─────────────────────────────────────

export async function DELETE() {
  vaultSession.clear();
  return NextResponse.json({ ok: true, active: false });
}
