/**
 * Wallet Balance API
 *
 * GET /api/field-ops/wallet
 *
 * Reads wallet balance from a connected ethereum-wallet service.
 * Requires vault session to be active (master password cached).
 */

import { NextResponse } from "next/server";
import { getFieldServices, getFieldCredentials } from "@/lib/data";
import { decryptCredential } from "@/lib/vault-crypto";
import * as vaultSession from "@/lib/vault-session";
import { getAdapter } from "@/lib/adapters/registry";
import type { FieldOpsService } from "@/lib/types";

// Import adapter so it self-registers
import "@/lib/adapters/ethereum-adapter";

export const dynamic = "force-dynamic";

export async function GET() {
  // Find wallet service(s)
  const servicesData = await getFieldServices();
  const walletServices = servicesData.services.filter(
    (s) => s.catalogId === "ethereum-wallet" || s.id === "ethereum-wallet",
  );

  if (walletServices.length === 0) {
    return NextResponse.json(
      { error: "No wallet service configured", wallets: [] },
      { status: 200 },
    );
  }

  // Check vault session
  const password = vaultSession.getPassword();
  if (!password) {
    // Return service info without balances
    return NextResponse.json({
      vaultLocked: true,
      wallets: walletServices.map((s) => ({
        serviceId: s.id,
        name: s.name,
        network: s.config.network ?? "ethereum",
        address: null,
        ethBalance: null,
        usdcBalance: null,
      })),
    });
  }

  // Decrypt credentials and fetch balances
  const credData = await getFieldCredentials();
  const wallets = await Promise.all(
    walletServices.map(async (service: FieldOpsService) => {
      try {
        if (!service.credentialId || !credData.masterKeySalt) {
          return {
            serviceId: service.id,
            name: service.name,
            network: service.config.network ?? "ethereum",
            address: null,
            ethBalance: null,
            usdcBalance: null,
            error: "No credentials stored",
          };
        }

        const credential = credData.credentials.find(
          (c) => c.id === service.credentialId,
        );
        if (!credential) {
          return {
            serviceId: service.id,
            name: service.name,
            network: service.config.network ?? "ethereum",
            address: null,
            ethBalance: null,
            usdcBalance: null,
            error: "Credential not found",
          };
        }

        const salt = Buffer.from(credData.masterKeySalt, "hex");
        const plaintext = decryptCredential(
          credential.encryptedData,
          credential.iv,
          credential.authTag,
          password,
          salt,
        );

        let creds: Record<string, unknown>;
        try {
          creds = JSON.parse(plaintext);
        } catch {
          creds = { raw: plaintext };
        }

        // Get adapter and read balance
        const adapter = getAdapter("ethereum-wallet");
        if (!adapter) {
          return {
            serviceId: service.id,
            name: service.name,
            network: service.config.network ?? "ethereum",
            address: null,
            ethBalance: null,
            usdcBalance: null,
            error: "Ethereum adapter not available",
          };
        }

        // Create a minimal task for the adapter
        const result = await adapter.execute({
          task: {
            id: "wallet-balance-check",
            missionId: null,
            title: "Balance Check",
            description: "",
            type: "crypto-transfer",
            serviceId: service.id,
            assignedTo: null,
            status: "approved",
            approvalRequired: false,
            payload: { operation: "read-balance" },
            result: {},
            attachments: [],
            linkedTaskId: null,
            blockedBy: [],
            rejectionFeedback: null,
            approvedBy: null,
            rejectedBy: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            executedAt: null,
            completedAt: null,
          },
          service,
          credentials: creds,
        });

        if (result.success) {
          return {
            serviceId: service.id,
            name: service.name,
            network: result.data.network ?? service.config.network ?? "ethereum",
            address: result.data.address,
            ethBalance: result.data.ethBalance,
            usdcBalance: result.data.usdcBalance,
            error: null,
          };
        }

        return {
          serviceId: service.id,
          name: service.name,
          network: service.config.network ?? "ethereum",
          address: null,
          ethBalance: null,
          usdcBalance: null,
          error: result.error,
        };
      } catch (err) {
        return {
          serviceId: service.id,
          name: service.name,
          network: service.config.network ?? "ethereum",
          address: null,
          ethBalance: null,
          usdcBalance: null,
          error: err instanceof Error ? err.message : "Unknown error",
        };
      }
    }),
  );

  return NextResponse.json({ vaultLocked: false, wallets });
}
