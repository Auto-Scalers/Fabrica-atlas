import { NextResponse } from "next/server";
import { mutateFieldServices, getServiceCatalog, mutateFieldCredentials } from "@/lib/data";
import { z } from "zod";
import { validateBody } from "@/lib/validations";
import { addFieldActivityEvent } from "@/lib/field-ops-activity";
import { generateId } from "@/lib/utils";
import {
  hashMasterPassword,
  verifyMasterPassword,
  encryptCredential,
  decryptCredential,
  generateEncryptionSalt,
} from "@/lib/vault-crypto";

const activateServiceSchema = z.object({
  actor: z.string().max(50).optional(),
  serviceId: z.string().min(1, "Service ID is required"),
  config: z.record(z.string(), z.unknown()).optional().default({}).refine(
    (val) => JSON.stringify(val).length <= 10240,
    "Config exceeds 10KB limit",
  ),
  masterPassword: z.string().max(500).optional(),
});

export async function POST(request: Request) {
  const validation = await validateBody(request, activateServiceSchema);
  if (!validation.success) return validation.error;
  const { serviceId, config, actor: requestActor, masterPassword } = validation.data;
  const activateActor = requestActor ?? "system";

  // ── Look up catalog to identify sensitive fields ──
  const catalog = await getServiceCatalog();
  const catalogEntry = catalog.services.find(
    (c) => c.id === serviceId
  );
  const sensitiveKeys = new Set(
    (catalogEntry?.configFields ?? [])
      .filter((f) => f.type === "password")
      .map((f) => f.key)
  );

  // Split config into safe (non-sensitive) and sensitive buckets
  const safeConfig: Record<string, unknown> = {};
  const sensitiveConfig: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(config)) {
    if (sensitiveKeys.has(key)) {
      sensitiveConfig[key] = value;
    } else {
      safeConfig[key] = value;
    }
  }

  const hasSensitiveFields = Object.keys(sensitiveConfig).length > 0;

  // ── If sensitive fields present, require master password & store in vault ──
  let credentialId: string | null = null;

  if (hasSensitiveFields) {
    if (!masterPassword) {
      return NextResponse.json(
        { error: "Master password is required to securely store credentials. Sensitive fields will be encrypted in the vault." },
        { status: 401 },
      );
    }

    // Store in vault
    const vaultResult = await mutateFieldCredentials(async (fileData) => {
      // Initialize vault if first credential
      if (fileData.masterKeyHash === null) {
        fileData.masterKeyHash = hashMasterPassword(masterPassword);
        fileData.masterKeySalt = generateEncryptionSalt();
      } else {
        // Verify master password
        const valid = verifyMasterPassword(masterPassword, fileData.masterKeyHash);
        if (!valid) return { error: "invalid-password" as const };
      }

      if (!fileData.masterKeySalt) {
        fileData.masterKeySalt = generateEncryptionSalt();
      }

      // Merge with existing credential if updating (preserves fields left blank)
      const salt = Buffer.from(fileData.masterKeySalt, "hex");
      let mergedSensitive: Record<string, unknown> = sensitiveConfig;
      const existingIdx = fileData.credentials.findIndex((c) => c.serviceId === serviceId);
      if (existingIdx !== -1) {
        try {
          const existing = fileData.credentials[existingIdx];
          const plaintext = decryptCredential(
            existing.encryptedData, existing.iv, existing.authTag,
            masterPassword, salt,
          );
          const existingData = JSON.parse(plaintext) as Record<string, unknown>;
          // New values override old — empty values already filtered by dialog
          mergedSensitive = { ...existingData, ...sensitiveConfig };
        } catch {
          // Decryption of existing credential failed — check if user provided ALL sensitive fields
          const providedKeys = Object.keys(sensitiveConfig);
          const allSensitiveKeys = [...sensitiveKeys];
          const missingKeys = allSensitiveKeys.filter(
            (k) => !providedKeys.includes(k) || !(sensitiveConfig[k] as string)?.trim(),
          );
          if (missingKeys.length > 0) {
            return { error: "decrypt-failed-partial" as const, missingKeys };
          }
          // All fields provided — proceed with fresh data only
        }
        fileData.credentials.splice(existingIdx, 1);
      }

      // Encrypt and store (merged data)
      const encrypted = encryptCredential(
        JSON.stringify(mergedSensitive),
        masterPassword,
        salt,
      );

      const newCred = {
        id: generateId("cred"),
        serviceId,
        encryptedData: encrypted.encryptedData,
        iv: encrypted.iv,
        authTag: encrypted.authTag,
        createdAt: new Date().toISOString(),
        expiresAt: null,
      };
      fileData.credentials.push(newCred);
      return { credentialId: newCred.id } as const;
    });

    if (vaultResult && "error" in vaultResult) {
      if (vaultResult.error === "decrypt-failed-partial") {
        return NextResponse.json(
          { error: `Could not merge with existing credentials (decryption failed). Please re-enter ALL fields: ${(vaultResult as { error: string; missingKeys: string[] }).missingKeys.join(", ")}` },
          { status: 400 },
        );
      }
      return NextResponse.json({ error: "Invalid master password" }, { status: 403 });
    }

    credentialId = vaultResult.credentialId;
  }

  // ── Update service status ──
  const result = await mutateFieldServices(async (data) => {
    const idx = data.services.findIndex((s) => s.id === serviceId);
    if (idx === -1) return { error: "not-found" as const };

    const service = data.services[idx];
    // Allow re-activation for connected services (credential update)
    if (service.status !== "saved" && service.status !== "disconnected" && service.status !== "connected") {
      return { error: "invalid-status" as const, currentStatus: service.status };
    }

    data.services[idx] = {
      ...service,
      status: "connected",
      config: { ...service.config, ...safeConfig },
      credentialId: credentialId ?? service.credentialId,
    };

    // Clear any sensitive fields that were previously in plaintext config
    if (hasSensitiveFields) {
      for (const key of sensitiveKeys) {
        delete (data.services[idx].config as Record<string, unknown>)[key];
      }
    }

    return { service: data.services[idx] };
  });

  if ("error" in result) {
    if (result.error === "not-found") {
      return NextResponse.json({ error: "Service not found" }, { status: 404 });
    }
    return NextResponse.json(
      { error: `Cannot activate service with status "${result.currentStatus}". Must be "saved", "disconnected", or "connected".` },
      { status: 400 }
    );
  }

  const { service } = result;

  // Log activity
  await addFieldActivityEvent({
    type: "service_activated",
    actor: activateActor,
    taskId: null,
    serviceId: service.id,
    summary: `Service ${service.status === "connected" ? "credentials updated" : "activated"}: ${service.name}`,
    details: `Service "${service.name}" configured and activated. Auth type: ${service.authType}, Risk level: ${service.riskLevel}.${hasSensitiveFields ? ` Credentials stored in encrypted vault (${credentialId}).` : ""}`,
    metadata: {
      authType: service.authType,
      riskLevel: service.riskLevel,
      configKeys: Object.keys(safeConfig),
      credentialId,
      vaultEncrypted: hasSensitiveFields,
    },
  });

  if (hasSensitiveFields && credentialId) {
    await addFieldActivityEvent({
      type: "credential_added",
      actor: activateActor,
      taskId: null,
      serviceId: service.id,
      credentialId,
      summary: `Credential stored in vault for: ${service.name}`,
      details: `Sensitive fields (${[...sensitiveKeys].join(", ")}) encrypted with AES-256-GCM and stored in vault.`,
      metadata: { serviceId: service.id, sensitiveFieldCount: sensitiveKeys.size },
    });
  }

  return NextResponse.json({
    ...service,
    vaultEncrypted: hasSensitiveFields,
    credentialId,
  });
}
