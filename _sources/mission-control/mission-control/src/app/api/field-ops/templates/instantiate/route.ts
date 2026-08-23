/**
 * Field Task Template Instantiation API
 *
 * POST /api/field-ops/templates/instantiate
 *
 * Creates a new field task from a template with variable substitution.
 * Variables use {{variableName}} syntax in the template payload and
 * are replaced with values from the request body.
 */

import { NextResponse } from "next/server";
import {
  getFieldTemplates,
  mutateFieldTemplates,
  mutateFieldTasks,
  mutateTasks,
} from "@/lib/data";
import { fieldTemplateInstantiateSchema, validateBody } from "@/lib/validations";
import { generateId } from "@/lib/utils";
import { addFieldActivityEvent } from "@/lib/field-ops-activity";
import type { FieldTask } from "@/lib/types";

export const dynamic = "force-dynamic";

/**
 * Recursively substitute {{variable}} placeholders in a value.
 */
function substituteVariables(
  value: unknown,
  variables: Record<string, string>,
): unknown {
  if (typeof value === "string") {
    let result = value;
    for (const [key, val] of Object.entries(variables)) {
      result = result.replaceAll(`{{${key}}}`, val);
    }
    return result;
  }
  if (Array.isArray(value)) {
    return value.map((item) => substituteVariables(item, variables));
  }
  if (value !== null && typeof value === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      result[key] = substituteVariables(val, variables);
    }
    return result;
  }
  return value;
}

export async function POST(request: Request) {
  const validation = await validateBody(request, fieldTemplateInstantiateSchema);
  if (!validation.success) return validation.error;
  const body = validation.data;

  // Look up template
  const templatesData = await getFieldTemplates();
  const template = templatesData.templates.find((t) => t.id === body.templateId);
  if (!template) {
    return NextResponse.json(
      { error: `Template "${body.templateId}" not found` },
      { status: 404 },
    );
  }

  // Substitute variables in payload
  const resolvedPayload = substituteVariables(
    template.payload,
    body.variables,
  ) as Record<string, unknown>;

  // Create field task from template
  const now = new Date().toISOString();

  const newTask = await mutateFieldTasks(async (data) => {
    const task: FieldTask = {
      id: generateId("ftask"),
      missionId: body.missionId,
      title: template.name,
      description: template.description,
      type: template.type,
      serviceId: template.serviceId,
      assignedTo: body.assignedTo,
      status: "draft",
      approvalRequired: true,
      payload: resolvedPayload,
      result: {},
      attachments: [],
      linkedTaskId: body.linkedTaskId,
      blockedBy: [],
      rejectionFeedback: null,
      approvedBy: null,
      rejectedBy: null,
      scheduledFor: null,
      createdAt: now,
      updatedAt: now,
      executedAt: null,
      completedAt: null,
    };
    data.tasks.push(task);
    return task;
  });

  // Increment template usage count
  await mutateFieldTemplates(async (data) => {
    const t = data.templates.find((t) => t.id === body.templateId);
    if (t) {
      t.usageCount += 1;
      t.updatedAt = now;
    }
  });

  // Log activity
  await addFieldActivityEvent({
    type: "field_task_created",
    actor: body.actor,
    taskId: newTask.id,
    serviceId: newTask.serviceId,
    missionId: newTask.missionId,
    summary: `Field task created from template "${template.name}"`,
    details: `Task "${newTask.title}" (${newTask.id}) instantiated from template "${template.id}". Variables: ${JSON.stringify(body.variables).slice(0, 300)}`,
    metadata: { templateId: template.id, variables: body.variables },
  });

  // Auto cross-link: add this field task ID to the linked regular task's fieldTaskIds
  if (newTask.linkedTaskId) {
    try {
      await mutateTasks(async (tasksData) => {
        const regularTask = tasksData.tasks.find((t) => t.id === newTask.linkedTaskId);
        if (regularTask) {
          if (!regularTask.fieldTaskIds) {
            regularTask.fieldTaskIds = [];
          }
          if (!regularTask.fieldTaskIds.includes(newTask.id)) {
            regularTask.fieldTaskIds.push(newTask.id);
            regularTask.updatedAt = new Date().toISOString();
          }
        }
      });
    } catch {
      // Best-effort — don't fail the field task creation if cross-link fails
    }
  }

  return NextResponse.json(newTask, { status: 201 });
}
