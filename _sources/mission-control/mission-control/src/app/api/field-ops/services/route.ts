import { NextResponse } from "next/server";
import { getFieldServices, mutateFieldServices } from "@/lib/data";
import type { FieldOpsService } from "@/lib/types";
import { fieldServiceCreateSchema, fieldServiceUpdateSchema, validateBody, DEFAULT_LIMIT } from "@/lib/validations";
import { detectSecretsInConfig } from "@/lib/field-ops-security";
import { addFieldActivityEvent } from "@/lib/field-ops-activity";
import { requireOwner } from "@/lib/owner-guard";

// ─── API Routes ─────────────────────────────────────────────────────────────

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  const status = searchParams.get("status");
  const riskLevel = searchParams.get("riskLevel");

  const data = await getFieldServices();
  let services = data.services;

  // Apply filters
  if (id) services = services.filter((s) => s.id === id);
  if (status) services = services.filter((s) => s.status === status);
  if (riskLevel) services = services.filter((s) => s.riskLevel === riskLevel);

  // Pagination
  const limitParam = searchParams.get("limit");
  const offsetParam = searchParams.get("offset");
  const totalFiltered = services.length;
  const limit = limitParam ? Math.max(1, parseInt(limitParam, 10) || 50) : DEFAULT_LIMIT;
  const offset = Math.max(0, parseInt(offsetParam ?? "0", 10));
  services = services.slice(offset, offset + limit);

  const meta = {
    total: data.services.length,
    filtered: totalFiltered,
    returned: services.length,
    limit,
    offset,
  };

  return NextResponse.json({ data: services, services, meta });
}

export async function POST(request: Request) {
  const validation = await validateBody(request, fieldServiceCreateSchema);
  if (!validation.success) return validation.error;
  const body = validation.data;
  const postActor = body.actor ?? "system";

  const newService = await mutateFieldServices(async (data) => {
    // Check for duplicate ID
    const existing = data.services.find((s) => s.id === body.id);
    if (existing) return null;

    const service: FieldOpsService = {
      id: body.id,
      name: body.name,
      mcpPackage: body.mcpPackage,
      status: body.status,
      authType: body.authType,
      credentialId: body.credentialId,
      riskLevel: body.riskLevel,
      capabilities: body.capabilities,
      allowedAgents: body.allowedAgents,
      config: body.config,
      catalogId: body.catalogId,
      installedAt: new Date().toISOString(),
      lastUsed: null,
    };
    data.services.push(service);
    return service;
  });

  if (!newService) {
    return NextResponse.json({ error: "Service with this ID already exists" }, { status: 409 });
  }

  // Check for secrets accidentally stored in plaintext config
  const suspiciousKeys = detectSecretsInConfig(body.config);
  if (suspiciousKeys.length > 0) {
    await addFieldActivityEvent({
      type: "credential_access_denied",
      actor: postActor,
      taskId: null,
      serviceId: newService.id,
      summary: `Warning: possible API key in service config`,
      details: `Service "${newService.name}" config contains values that look like API secrets in fields: ${suspiciousKeys.join(", ")}. Use the Credential Vault instead for secure storage.`,
      metadata: { suspiciousKeys },
    });
  }

  // Log activity (best-effort)
  await addFieldActivityEvent({
    type: "service_connected",
    actor: postActor,
    taskId: null,
    serviceId: newService.id,
    summary: `Service installed: ${newService.name}`,
    details: `Service "${newService.name}" (${newService.id}) installed with auth type "${newService.authType}" and risk level "${newService.riskLevel}".`,
    metadata: { authType: newService.authType, riskLevel: newService.riskLevel, capabilities: newService.capabilities },
  });

  const warnings: string[] = suspiciousKeys.length > 0
    ? [`Possible API key detected in config fields: ${suspiciousKeys.join(", ")}. Consider using the Credential Vault for secure storage.`]
    : [];

  return NextResponse.json({ ...newService, warnings }, { status: 201 });
}

export async function PUT(request: Request) {
  const validation = await validateBody(request, fieldServiceUpdateSchema);
  if (!validation.success) return validation.error;
  const body = validation.data;

  // Owner-only: changing riskLevel or allowedAgents requires authorization
  if (body.riskLevel !== undefined || body.allowedAgents !== undefined) {
    const ownerCheck = await requireOwner(body as Record<string, unknown>);
    if (ownerCheck) return ownerCheck;
  }

  // Extract actor (not a FieldOpsService field — used only for activity logging)
  const putActor = body.actor ?? "system";
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { actor: _extractedActor, ...serviceUpdates } = body;

  const result = await mutateFieldServices(async (data) => {
    const idx = data.services.findIndex((s) => s.id === serviceUpdates.id);
    if (idx === -1) return null;

    const oldService = { ...data.services[idx] };

    data.services[idx] = {
      ...data.services[idx],
      ...serviceUpdates,
    };

    return { updatedService: data.services[idx], oldService };
  });

  if (!result) {
    return NextResponse.json({ error: "Service not found" }, { status: 404 });
  }

  const { updatedService, oldService } = result;

  // Log status transitions (best-effort)
  if (updatedService.status !== oldService.status) {
    let eventType: "service_connected" | "service_disconnected" | "service_saved" | "service_activated" = "service_disconnected";
    if (updatedService.status === "connected" && oldService.status === "saved") {
      eventType = "service_activated";
    } else if (updatedService.status === "connected") {
      eventType = "service_connected";
    } else if (updatedService.status === "saved") {
      eventType = "service_saved";
    }
    await addFieldActivityEvent({
      type: eventType,
      actor: putActor,
      taskId: null,
      serviceId: updatedService.id,
      summary: `Service ${updatedService.status}: ${updatedService.name}`,
      details: `Service "${updatedService.name}" status changed from "${oldService.status}" to "${updatedService.status}".`,
      metadata: { previousStatus: oldService.status, newStatus: updatedService.status },
    });
  }

  return NextResponse.json(updatedService);
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  const found = await mutateFieldServices(async (data) => {
    const idx = data.services.findIndex((s) => s.id === id);
    if (idx === -1) return false;
    data.services.splice(idx, 1);
    return true;
  });

  if (!found) {
    return NextResponse.json({ error: "Service not found" }, { status: 404 });
  }

  // Log activity (best-effort)
  const deleteActor = searchParams.get("actor") ?? "system";
  await addFieldActivityEvent({
    type: "service_disconnected",
    actor: deleteActor,
    taskId: null,
    serviceId: id,
    summary: `Service removed: ${id}`,
    details: `Service "${id}" was deleted.`,
  });

  return NextResponse.json({ ok: true });
}
