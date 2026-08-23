/**
 * Field Task Templates API
 *
 * GET    /api/field-ops/templates           — List all templates
 * POST   /api/field-ops/templates           — Create a new template
 * DELETE /api/field-ops/templates?id=...    — Delete a template
 */

import { NextResponse } from "next/server";
import { getFieldTemplates, mutateFieldTemplates } from "@/lib/data";
import { fieldTemplateCreateSchema, validateBody } from "@/lib/validations";
import { generateId } from "@/lib/utils";
import type { FieldTaskTemplate } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  const data = await getFieldTemplates();
  return NextResponse.json({ data: data.templates, templates: data.templates });
}

export async function POST(request: Request) {
  const validation = await validateBody(request, fieldTemplateCreateSchema);
  if (!validation.success) return validation.error;
  const body = validation.data;

  const now = new Date().toISOString();

  const newTemplate = await mutateFieldTemplates(async (data) => {
    const template: FieldTaskTemplate = {
      id: generateId("ftpl"),
      name: body.name,
      description: body.description,
      type: body.type,
      serviceId: body.serviceId,
      payload: body.payload,
      tags: body.tags,
      createdBy: body.createdBy,
      usageCount: 0,
      createdAt: now,
      updatedAt: now,
    };
    data.templates.push(template);
    return template;
  });

  return NextResponse.json(newTemplate, { status: 201 });
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  const deleted = await mutateFieldTemplates(async (data) => {
    const idx = data.templates.findIndex((t) => t.id === id);
    if (idx === -1) return null;
    const template = data.templates[idx];
    data.templates.splice(idx, 1);
    return { id: template.id, name: template.name };
  });

  if (!deleted) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
