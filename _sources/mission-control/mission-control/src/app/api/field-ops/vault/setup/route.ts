import { NextResponse } from "next/server";
import { z } from "zod";
import { getFieldCredentials, mutateFieldCredentials } from "@/lib/data";
import { validateBody } from "@/lib/validations";
import { hashMasterPassword, generateEncryptionSalt } from "@/lib/vault-crypto";
import * as vaultSession from "@/lib/vault-session";
import { addFieldActivityEvent } from "@/lib/field-ops-activity";

// ─── Validation ─────────────────────────────────────────────────────────────

const vaultSetupSchema = z
  .object({
    masterPassword: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .max(500),
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((d) => d.masterPassword === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

// ─── POST: Initialize the vault (set master password) ───────────────────────

export async function POST(request: Request) {
  const validation = await validateBody(request, vaultSetupSchema);
  if (!validation.success) {
    return NextResponse.json(
      { error: validation.error },
      { status: 400 },
    );
  }

  const { masterPassword } = validation.data;

  // Ensure vault is not already initialized
  const data = await getFieldCredentials();
  if (data.masterKeyHash) {
    return NextResponse.json(
      { error: "Vault is already initialized. Use the existing master password." },
      { status: 409 },
    );
  }

  // Initialize: hash password + generate encryption salt
  const masterKeyHash = hashMasterPassword(masterPassword);
  const masterKeySalt = generateEncryptionSalt();

  await mutateFieldCredentials(async (d) => {
    d.masterKeyHash = masterKeyHash;
    d.masterKeySalt = masterKeySalt;
    return d;
  });

  // Start vault session so user doesn't need to re-enter immediately
  vaultSession.setPassword(masterPassword);

  // Log activity
  await addFieldActivityEvent({
    type: "credential_added" as const,
    actor: "system" as const,
    taskId: null,
    serviceId: null,
    summary: "Vault initialized with master password",
    details: "Master password set using scrypt KDF. Vault is ready for credential storage.",
  });

  return NextResponse.json({
    ok: true,
    session: vaultSession.getSessionInfo(),
  });
}
