import { NextResponse } from "next/server";
import { getFieldCredentials, mutateFieldCredentials } from "@/lib/data";
import { vaultDecryptSchema, validateBody } from "@/lib/validations";
import {
  verifyMasterPassword,
  decryptCredential,
  isLegacyCredential,
  migrateLegacyCredential,
} from "@/lib/vault-crypto";
import { vaultRateLimiter } from "@/lib/field-ops-security";
import { addFieldActivityEvent } from "@/lib/field-ops-activity";

// ─── POST: Decrypt a credential ─────────────────────────────────────────────

export async function POST(request: Request) {
  // ── Rate limiting: brute-force protection ──
  const rateCheck = vaultRateLimiter.checkRateLimit();
  if (!rateCheck.allowed) {
    const retryAfterSeconds = Math.ceil((rateCheck.retryAfterMs ?? 0) / 1000);

    await addFieldActivityEvent({
      type: "credential_access_denied",
      actor: "system",
      taskId: null,
      serviceId: null,
      credentialId: null,
      summary: `Vault rate-limited: too many failed attempts`,
      details: `Vault decryption blocked due to excessive failed password attempts. Retry after ${retryAfterSeconds} seconds.`,
      metadata: { reason: "rate_limited", retryAfterSeconds },
    });

    return NextResponse.json(
      { error: `Too many failed attempts. Try again in ${retryAfterSeconds} seconds.` },
      { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } },
    );
  }

  const validation = await validateBody(request, vaultDecryptSchema);
  if (!validation.success) return validation.error;

  const { credentialId, masterPassword, actor: requestActor } = validation.data;
  const actor = requestActor ?? "system";

  const data = await getFieldCredentials();

  // ── Verify master password ──
  if (!data.masterKeyHash) {
    return NextResponse.json(
      { error: "Vault is empty — no master password set" },
      { status: 400 },
    );
  }

  const passwordValid = verifyMasterPassword(masterPassword, data.masterKeyHash);
  if (!passwordValid) {
    vaultRateLimiter.recordFailure();

    await addFieldActivityEvent({
      type: "credential_access_denied",
      actor,
      taskId: null,
      serviceId: null,
      credentialId,
      summary: `Vault access denied: invalid master password (attempt ${vaultRateLimiter.getFailureCount()})`,
      details: `Failed attempt to decrypt credential "${credentialId}" — incorrect master password.`,
      metadata: { reason: "invalid_password", attemptCount: vaultRateLimiter.getFailureCount() },
    });

    return NextResponse.json(
      { error: "Invalid master password" },
      { status: 403 },
    );
  }

  // Password verified — reset rate limiter
  vaultRateLimiter.recordSuccess();

  // ── Find credential ──
  const credential = data.credentials.find((c) => c.id === credentialId);
  if (!credential) {
    await addFieldActivityEvent({
      type: "credential_access_denied",
      actor,
      taskId: null,
      serviceId: null,
      credentialId,
      summary: `Vault access denied: credential not found`,
      details: `Attempted to decrypt non-existent credential "${credentialId}".`,
      metadata: { reason: "not_found" },
    });

    return NextResponse.json(
      { error: "Credential not found" },
      { status: 404 },
    );
  }

  // ── Check expiration ──
  if (credential.expiresAt && new Date(credential.expiresAt) < new Date()) {
    await addFieldActivityEvent({
      type: "credential_access_denied",
      actor,
      taskId: null,
      serviceId: credential.serviceId,
      credentialId,
      summary: `Vault access denied: credential expired`,
      details: `Credential "${credentialId}" for service "${credential.serviceId}" expired at ${credential.expiresAt}.`,
      metadata: { reason: "expired", serviceId: credential.serviceId, expiresAt: credential.expiresAt },
    });

    return NextResponse.json(
      { error: "Credential has expired. Revoke and re-add with a fresh key." },
      { status: 410 },
    );
  }

  // ── Handle legacy (base64) credentials ──
  if (isLegacyCredential(credential)) {
    // Decode base64 plaintext
    const plaintext = Buffer.from(credential.encryptedData, "base64").toString("utf-8");

    // Opportunistic migration: re-encrypt in place
    if (data.masterKeySalt) {
      const salt = Buffer.from(data.masterKeySalt, "hex");
      const upgraded = migrateLegacyCredential(credential, masterPassword, salt);

      await mutateFieldCredentials(async (fileData) => {
        const cred = fileData.credentials.find((c) => c.id === credentialId);
        if (cred) {
          cred.encryptedData = upgraded.encryptedData;
          cred.iv = upgraded.iv;
          cred.authTag = upgraded.authTag;
        }
      });
    }

    await addFieldActivityEvent({
      type: "credential_accessed",
      actor,
      taskId: null,
      serviceId: credential.serviceId,
      credentialId,
      summary: `Credential accessed: ${credential.serviceId} (migrated from legacy)`,
      details: `Credential "${credentialId}" decrypted and migrated from base64 to AES-256-GCM.`,
      metadata: { serviceId: credential.serviceId, wasLegacy: true },
    });

    return NextResponse.json({
      id: credential.id,
      serviceId: credential.serviceId,
      data: plaintext,
    });
  }

  // ── Decrypt with AES-256-GCM ──
  if (!data.masterKeySalt) {
    return NextResponse.json(
      { error: "Vault encryption salt missing — vault may be corrupted" },
      { status: 500 },
    );
  }

  const salt = Buffer.from(data.masterKeySalt, "hex");

  try {
    const plaintext = decryptCredential(
      credential.encryptedData,
      credential.iv,
      credential.authTag,
      masterPassword,
      salt,
    );

    await addFieldActivityEvent({
      type: "credential_accessed",
      actor,
      taskId: null,
      serviceId: credential.serviceId,
      credentialId,
      summary: `Credential accessed: ${credential.serviceId}`,
      details: `Credential "${credentialId}" decrypted successfully.`,
      metadata: { serviceId: credential.serviceId, wasLegacy: false },
    });

    return NextResponse.json({
      id: credential.id,
      serviceId: credential.serviceId,
      data: plaintext,
    });
  } catch {
    // Auth tag verification failed — tampered data or wrong key derivation
    await addFieldActivityEvent({
      type: "credential_access_denied",
      actor,
      taskId: null,
      serviceId: credential.serviceId,
      credentialId,
      summary: `Vault integrity check failed: ${credential.serviceId}`,
      details: `Credential "${credentialId}" — AES-256-GCM auth tag verification failed. Data may have been tampered with.`,
      metadata: { reason: "integrity_failed", serviceId: credential.serviceId },
    });

    return NextResponse.json(
      { error: "Credential data integrity check failed — possible tampering detected" },
      { status: 403 },
    );
  }
}
