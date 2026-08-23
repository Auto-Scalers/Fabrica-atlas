import { NextResponse } from "next/server";
import { getServiceCatalog, mutateFieldServices } from "@/lib/data";
import type { FieldOpsService } from "@/lib/types";
import { z } from "zod";
import { validateBody } from "@/lib/validations";
import { addFieldActivityEvent } from "@/lib/field-ops-activity";

const saveFromCatalogSchema = z.object({
  catalogId: z.string().min(1, "Catalog ID is required"),
});

export async function POST(request: Request) {
  const validation = await validateBody(request, saveFromCatalogSchema);
  if (!validation.success) return validation.error;
  const { catalogId } = validation.data;

  // Find the catalog entry
  const catalog = await getServiceCatalog();
  const catalogEntry = catalog.services.find((s) => s.id === catalogId);
  if (!catalogEntry) {
    return NextResponse.json({ error: "Service not found in catalog" }, { status: 404 });
  }

  // Create the service with "saved" status
  const newService = await mutateFieldServices(async (data) => {
    // Check for duplicate
    const existing = data.services.find((s) => s.id === catalogEntry.id || s.catalogId === catalogId);
    if (existing) return null;

    const service: FieldOpsService = {
      id: catalogEntry.id,
      name: catalogEntry.name,
      mcpPackage: catalogEntry.mcpPackage,
      status: "saved",
      authType: catalogEntry.authType,
      credentialId: null,
      riskLevel: catalogEntry.riskLevel,
      capabilities: catalogEntry.capabilities,
      allowedAgents: [],
      config: {},
      catalogId: catalogEntry.id,
      installedAt: new Date().toISOString(),
      lastUsed: null,
    };
    data.services.push(service);
    return service;
  });

  if (!newService) {
    return NextResponse.json({ error: "Service already saved" }, { status: 409 });
  }

  // Log activity
  await addFieldActivityEvent({
    type: "service_saved",
    actor: "system",
    taskId: null,
    serviceId: newService.id,
    summary: `Service saved: ${newService.name}`,
    details: `Service "${newService.name}" saved from catalog for future configuration.`,
  });

  return NextResponse.json(newService, { status: 201 });
}
