/**
 * Owner Guard — reusable authentication check for security-critical endpoints.
 *
 * Two authentication paths:
 * 1. Active vault session (user already entered master password recently)
 * 2. masterPassword in request body (for API callers without session)
 *
 * Rejects any request where actor !== "me" (blocks agents).
 */

import { NextResponse } from "next/server";
import { getFieldCredentials } from "@/lib/data";
import { verifyMasterPassword } from "@/lib/vault-crypto";
import * as vaultSession from "@/lib/vault-session";

/**
 * Verify the caller is the human owner.
 * Returns null if authorized, or a NextResponse error if not.
 */
export async function requireOwner(
  body: Record<string, unknown>,
): Promise<NextResponse | null> {
  // 1. If actor is specified and not "me", reject immediately
  const actor = body.actor as string | undefined;
  if (actor && actor !== "me") {
    return NextResponse.json(
      { error: "Only the owner can perform this action. Agents are not permitted." },
      { status: 403 },
    );
  }

  // 2. Check vault session first (user already authenticated in this process)
  if (vaultSession.isActive()) return null;

  // 3. Fall back to master password in request body
  const masterPassword = body.masterPassword as string | undefined;
  if (!masterPassword) {
    return NextResponse.json(
      {
        error:
          "Authentication required. Unlock the vault or provide masterPassword.",
      },
      { status: 401 },
    );
  }

  const credData = await getFieldCredentials();
  if (!credData.masterKeyHash) {
    return NextResponse.json(
      { error: "Vault not initialized. Set up vault first." },
      { status: 400 },
    );
  }

  const valid = verifyMasterPassword(masterPassword, credData.masterKeyHash);
  if (!valid) {
    return NextResponse.json(
      { error: "Invalid master password" },
      { status: 403 },
    );
  }

  return null; // Authorized
}
