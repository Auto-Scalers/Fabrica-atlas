/**
 * Adapter Registry
 *
 * Central registry mapping service IDs to their adapter implementations.
 * Adapters self-register on import. The execute API route looks up
 * adapters from this registry at runtime.
 */

import type { ServiceAdapter } from "./types";

// ─── Registry Store ─────────────────────────────────────────────────────────

const adapters = new Map<string, ServiceAdapter>();

// ─── Registry API ───────────────────────────────────────────────────────────

/** Register an adapter. Overwrites if the same serviceId already exists. */
export function registerAdapter(adapter: ServiceAdapter): void {
  adapters.set(adapter.serviceId, adapter);
}

/** Look up an adapter by service ID or catalog ID. */
export function getAdapter(serviceId: string): ServiceAdapter | undefined {
  return adapters.get(serviceId);
}

/** Check if an adapter is registered for a given service ID. */
export function hasAdapter(serviceId: string): boolean {
  return adapters.has(serviceId);
}

/** List all registered adapters (for debugging / catalog display). */
export function listAdapters(): ServiceAdapter[] {
  return Array.from(adapters.values());
}

/** Get the count of registered adapters. */
export function adapterCount(): number {
  return adapters.size;
}

/** List adapters that support financial reporting (implement getFinancials). */
export function listFinancialAdapters(): ServiceAdapter[] {
  return Array.from(adapters.values()).filter(
    (a) => typeof a.getFinancials === "function",
  );
}
