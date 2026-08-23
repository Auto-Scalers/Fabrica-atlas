import { NextResponse } from "next/server";
import { mutateFieldCredentials } from "@/lib/data";
import { addFieldActivityEvent } from "@/lib/field-ops-activity";
import { clear as clearVaultSession } from "@/lib/vault-session";

// ─── POST: Reset entire vault (wipe master key + all credentials) ───────────

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const { confirm } = body as { confirm?: string };

  // Require explicit confirmation string to prevent accidental resets
  if (confirm !== "RESET_VAULT") {
    return NextResponse.json(
      { error: 'Must send { "confirm": "RESET_VAULT" } to proceed.' },
      { status: 400 },
    );
  }

  const credentialCount = await mutateFieldCredentials(async (data) => {
    const count = data.credentials.length;
    data.masterKeyHash = null;
    data.masterKeySalt = null;
    data.credentials = [];
    return count;
  });

  // Clear any active session
  clearVaultSession();

  await addFieldActivityEvent({
    type: "credential_rotated",
    actor: "me",
    taskId: null,
    serviceId: null,
    credentialId: null,
    summary: `Vault reset — master password and ${credentialCount} credential(s) wiped`,
    details:
      "Full vault reset performed. All credentials have been deleted and the master password has been cleared. Services will need to be re-configured with new credentials.",
    metadata: { credentialCount },
  });

  return NextResponse.json({
    ok: true,
    credentialsRemoved: credentialCount,
    message: "Vault has been reset. Set a new master password to start fresh.",
  });
}
