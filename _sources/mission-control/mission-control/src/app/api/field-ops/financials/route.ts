/**
 * Financial Overview API
 *
 * GET /api/field-ops/financials
 *
 * Aggregates financial metrics across all configured services that
 * implement the `getFinancials` adapter method. Also returns a list
 * of available (but unconfigured) financial integrations from the catalog.
 */

import { NextResponse } from "next/server";
import { getFieldServices, getFieldCredentials, getServiceCatalog } from "@/lib/data";
import { decryptCredential } from "@/lib/vault-crypto";
import * as vaultSession from "@/lib/vault-session";
import { getAdapter, listFinancialAdapters } from "@/lib/adapters/registry";
import type { FinancialSnapshot } from "@/lib/adapters/types";

// Import adapters so they self-register
import "@/lib/adapters/ethereum-adapter";
import "@/lib/adapters/linkedin-adapter";
import "@/lib/adapters/stripe-adapter";

export const dynamic = "force-dynamic";

/** Categories in the service catalog considered "financial". */
const FINANCIAL_CATEGORIES = new Set([
  "ecommerce-payments",
]);

export async function GET() {
  try {
    const [servicesData, catalogData] = await Promise.all([
      getFieldServices(),
      getServiceCatalog(),
    ]);

    // Find configured services that have a financial adapter
    const financialAdapters = listFinancialAdapters();
    const financialAdapterIds = new Set(financialAdapters.map((a) => a.serviceId));

    const matchedServices = servicesData.services.filter(
      (s) => financialAdapterIds.has(s.id) || financialAdapterIds.has(s.catalogId ?? ""),
    );

    // Find available (unconfigured) financial integrations from catalog
    const configuredCatalogIds = new Set(
      servicesData.services.map((s) => s.catalogId).filter(Boolean),
    );
    const configuredServiceIds = new Set(
      servicesData.services.map((s) => s.id),
    );
    const availableIntegrations = catalogData.services
      .filter(
        (cs) =>
          (FINANCIAL_CATEGORIES.has(cs.category) || financialAdapterIds.has(cs.id)) &&
          !configuredCatalogIds.has(cs.id) &&
          !configuredServiceIds.has(cs.id),
      )
      .map((cs) => ({
        catalogId: cs.id,
        name: cs.name,
        category: cs.category,
        icon: cs.icon ?? undefined,
      }));

    // If no financial services configured, return early
    if (matchedServices.length === 0) {
      return NextResponse.json({
        vaultLocked: false,
        snapshots: [] as FinancialSnapshot[],
        availableIntegrations,
      });
    }

    // Check vault session
    const password = vaultSession.getPassword();
    if (!password) {
      return NextResponse.json({
        vaultLocked: true,
        snapshots: matchedServices.map((s) => ({
          serviceId: s.id,
          serviceName: s.name,
          icon: "Lock",
          metrics: [],
          fetchedAt: new Date().toISOString(),
        })) as FinancialSnapshot[],
        availableIntegrations,
      });
    }

    // Decrypt credentials and fetch financials in parallel
    const credData = await getFieldCredentials();

    const results = await Promise.allSettled(
      matchedServices.map(async (service): Promise<FinancialSnapshot> => {
        // Find the adapter
        const adapter = getAdapter(service.id) ?? getAdapter(service.catalogId ?? "");
        if (!adapter?.getFinancials) {
          return {
            serviceId: service.id,
            serviceName: service.name,
            metrics: [],
            error: "Adapter does not support financials",
            fetchedAt: new Date().toISOString(),
          };
        }

        // Decrypt credentials if available
        if (!service.credentialId || !credData.masterKeySalt) {
          return {
            serviceId: service.id,
            serviceName: service.name,
            icon: "Wallet",
            metrics: [],
            error: "No credentials stored — add credentials in Vault",
            fetchedAt: new Date().toISOString(),
          };
        }

        const credential = credData.credentials.find(
          (c) => c.id === service.credentialId,
        );
        if (!credential) {
          return {
            serviceId: service.id,
            serviceName: service.name,
            metrics: [],
            error: "Credential not found in vault",
            fetchedAt: new Date().toISOString(),
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

        return adapter.getFinancials(service, creds);
      }),
    );

    // Collect snapshots, converting rejected promises to error snapshots
    const snapshots: FinancialSnapshot[] = results.map((r, i) => {
      if (r.status === "fulfilled") return r.value;
      return {
        serviceId: matchedServices[i].id,
        serviceName: matchedServices[i].name,
        metrics: [],
        error: r.reason instanceof Error ? r.reason.message : "Failed to fetch financials",
        fetchedAt: new Date().toISOString(),
      };
    });

    return NextResponse.json({
      vaultLocked: false,
      snapshots,
      availableIntegrations,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 },
    );
  }
}
