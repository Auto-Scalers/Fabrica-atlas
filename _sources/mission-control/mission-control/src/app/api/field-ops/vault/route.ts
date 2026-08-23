import { NextResponse } from "next/server";
import { getFieldCredentials, mutateFieldCredentials } from "@/lib/data";
import type { FieldOpsCredential } from "@/lib/types";
import { DEFAULT_LIMIT, vaultStoreSchema, validateBody } from "@/lib/validations";
import { generateId } from "@/lib/utils";
import {
  hashMasterPassword,
  verifyMasterPassword,
  encryptCredential,
  generateEncryptionSalt,
  isLegacyHash,
  isLegacyCredential,
  migrateLegacyCredential,
} from "@/lib/vault-crypto";
import { addFieldActivityEvent } from "@/lib/field-ops-activity";

// ─── GET: Credential metadata (never returns secrets) ───────────────────────

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  // Health check mode
  if (searchParams.get("health") === "true") {
    const data = await getFieldCredentials();
    const legacyCount = data.credentials.filter((c) => isLegacyCredential(c)).length;
    const encryptedCount = data.credentials.length - legacyCount;
    const masterKeyFormat = data.masterKeyHash
      ? isLegacyHash(data.masterKeyHash)
        ? "sha256"
        : "scrypt"
      : "none";

    return NextResponse.json({
      totalCredentials: data.credentials.length,
      legacyCredentials: legacyCount,
      encryptedCredentials: encryptedCount,
      masterKeyFormat,
      isHealthy:
        legacyCount === 0 &&
        (masterKeyFormat === "scrypt" || masterKeyFormat === "none"),
    });
  }

  const serviceId = searchParams.get("serviceId");
  const data = await getFieldCredentials();

  // Return credentials WITHOUT encryptedData/iv/authTag — only safe metadata
  let credentials = data.credentials.map((c) => ({
    id: c.id,
    serviceId: c.serviceId,
    createdAt: c.createdAt,
    expiresAt: c.expiresAt,
  }));

  // Apply filters
  if (serviceId) credentials = credentials.filter((c) => c.serviceId === serviceId);

  // Pagination
  const limitParam = searchParams.get("limit");
  const offsetParam = searchParams.get("offset");
  const totalFiltered = credentials.length;
  const limit = limitParam ? Math.max(1, parseInt(limitParam, 10) || 50) : DEFAULT_LIMIT;
  const offset = Math.max(0, parseInt(offsetParam ?? "0", 10));
  credentials = credentials.slice(offset, offset + limit);

  const meta = {
    total: data.credentials.length,
    filtered: totalFiltered,
    returned: credentials.length,
    limit,
    offset,
  };

  return NextResponse.json({ data: credentials, credentials, meta });
}

// ─── POST: Store credential with AES-256-GCM encryption ────────────────────

export async function POST(request: Request) {
  const validation = await validateBody(request, vaultStoreSchema);
  if (!validation.success) return validation.error;

  const body = validation.data;
  const vaultActor = body.actor ?? "system";
  const now = new Date().toISOString();

  const result = await mutateFieldCredentials(async (fileData) => {
    // ── First credential: initialize vault crypto ──
    if (fileData.masterKeyHash === null) {
      fileData.masterKeyHash = hashMasterPassword(body.masterPassword);
      fileData.masterKeySalt = generateEncryptionSalt();
    } else {
      // ── Verify master password ──
      const valid = verifyMasterPassword(body.masterPassword, fileData.masterKeyHash);
      if (!valid) return { error: "Invalid master password" } as const;

      // ── Migration: upgrade legacy SHA-256 hash to scrypt ──
      if (isLegacyHash(fileData.masterKeyHash)) {
        fileData.masterKeyHash = hashMasterPassword(body.masterPassword);

        // Generate encryption salt if missing (legacy vaults)
        if (!fileData.masterKeySalt) {
          fileData.masterKeySalt = generateEncryptionSalt();
        }

        // Re-encrypt all legacy credentials
        const salt = Buffer.from(fileData.masterKeySalt, "hex");
        let migratedCount = 0;
        for (const cred of fileData.credentials) {
          if (isLegacyCredential(cred)) {
            const upgraded = migrateLegacyCredential(cred, body.masterPassword, salt);
            cred.encryptedData = upgraded.encryptedData;
            cred.iv = upgraded.iv;
            cred.authTag = upgraded.authTag;
            migratedCount++;
          }
        }

        // Log migration event (async, best-effort — done outside mutex via return)
        if (migratedCount > 0) {
          return { migrated: migratedCount } as const;
        }
      }
    }

    // Ensure encryption salt exists
    if (!fileData.masterKeySalt) {
      fileData.masterKeySalt = generateEncryptionSalt();
    }

    // ── Encrypt the credential ──
    const salt = Buffer.from(fileData.masterKeySalt, "hex");
    const { encryptedData, iv, authTag } = encryptCredential(
      body.data,
      body.masterPassword,
      salt,
    );

    const credential: FieldOpsCredential = {
      id: generateId("cred"),
      serviceId: body.serviceId,
      encryptedData,
      iv,
      authTag,
      createdAt: now,
      expiresAt: body.expiresAt ?? null,
    };
    fileData.credentials.push(credential);

    return { credential } as const;
  });

  // Handle password mismatch
  if (result && "error" in result) {
    return NextResponse.json({ error: result.error }, { status: 403 });
  }

  // Handle migration (need to re-run to actually store the new credential)
  if (result && "migrated" in result) {
    // Log migration event
    await addFieldActivityEvent({
      type: "vault_migrated",
      actor: vaultActor,
      taskId: null,
      serviceId: null,
      summary: `Vault migrated: ${result.migrated} credential(s) upgraded to AES-256-GCM`,
      details: `Legacy SHA-256 hash upgraded to scrypt. ${result.migrated} credential(s) re-encrypted with AES-256-GCM.`,
      metadata: { migratedCount: result.migrated },
    });

    // Re-run to store the actual new credential (vault is now upgraded)
    const storeResult = await mutateFieldCredentials(async (fileData) => {
      const salt = Buffer.from(fileData.masterKeySalt!, "hex");
      const { encryptedData, iv, authTag } = encryptCredential(
        body.data,
        body.masterPassword,
        salt,
      );

      const credential: FieldOpsCredential = {
        id: generateId("cred"),
        serviceId: body.serviceId,
        encryptedData,
        iv,
        authTag,
        createdAt: now,
        expiresAt: body.expiresAt ?? null,
      };
      fileData.credentials.push(credential);
      return credential;
    });

    await addFieldActivityEvent({
      type: "credential_added",
      actor: vaultActor,
      taskId: null,
      serviceId: body.serviceId,
      credentialId: storeResult.id,
      summary: `Credential added for service: ${body.serviceId}`,
      details: `New credential (${storeResult.id}) stored with AES-256-GCM encryption.`,
      metadata: { serviceId: body.serviceId, hasExpiration: !!body.expiresAt },
    });

    return NextResponse.json(
      {
        id: storeResult.id,
        serviceId: storeResult.serviceId,
        createdAt: storeResult.createdAt,
        expiresAt: storeResult.expiresAt,
      },
      { status: 201 },
    );
  }

  // Normal path — credential was stored
  if (result && "credential" in result) {
    const cred = result.credential;

    await addFieldActivityEvent({
      type: "credential_added",
      actor: vaultActor,
      taskId: null,
      serviceId: body.serviceId,
      credentialId: cred.id,
      summary: `Credential added for service: ${body.serviceId}`,
      details: `New credential (${cred.id}) stored with AES-256-GCM encryption.`,
      metadata: { serviceId: body.serviceId, hasExpiration: !!body.expiresAt },
    });

    return NextResponse.json(
      {
        id: cred.id,
        serviceId: cred.serviceId,
        createdAt: cred.createdAt,
        expiresAt: cred.expiresAt,
      },
      { status: 201 },
    );
  }

  return NextResponse.json({ error: "Unexpected vault error" }, { status: 500 });
}

// ─── DELETE: Revoke credential ──────────────────────────────────────────────

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  const deletedServiceId = await mutateFieldCredentials(async (data) => {
    const idx = data.credentials.findIndex((c) => c.id === id);
    if (idx === -1) return null;
    const serviceId = data.credentials[idx].serviceId;
    data.credentials.splice(idx, 1);
    return serviceId;
  });

  if (deletedServiceId === null) {
    return NextResponse.json({ error: "Credential not found" }, { status: 404 });
  }

  const deleteActor = searchParams.get("actor") ?? "system";
  await addFieldActivityEvent({
    type: "credential_rotated",
    actor: deleteActor,
    taskId: null,
    serviceId: deletedServiceId,
    credentialId: id,
    summary: `Credential removed: ${id}`,
    details: `Credential "${id}" for service "${deletedServiceId}" was revoked.`,
    metadata: { serviceId: deletedServiceId },
  });

  return NextResponse.json({ ok: true });
}
