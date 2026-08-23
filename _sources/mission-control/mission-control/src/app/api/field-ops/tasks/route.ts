import { NextResponse } from "next/server";
import { getFieldTasks, getFieldServices, getApprovalConfig, getFieldMissions, mutateFieldTasks, mutateFieldMissions, mutateTasks } from "@/lib/data";
import { requireOwner } from "@/lib/owner-guard";
import type { FieldTask, FieldTaskStatus, FieldOpsEventType, ServiceRiskLevel } from "@/lib/types";
import { fieldTaskCreateSchema, fieldTaskUpdateSchema, validateBody, DEFAULT_LIMIT } from "@/lib/validations";
import { generateId } from "@/lib/utils";
import {
  isValidTransition,
  getTransitionError,
  isApprovalBypassAttempt,
  getApprovalBypassError,
  shouldTripCircuitBreaker,
  requiresApproval,
} from "@/lib/field-ops-security";
import { addFieldActivityEvent } from "@/lib/field-ops-activity";
import {
  notifyFieldTaskApproved,
  notifyFieldTaskRejected,
  logFieldOpsActivity,
} from "@/lib/field-ops-notify";

// ─── API Routes ─────────────────────────────────────────────────────────────

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  const missionId = searchParams.get("missionId");
  const status = searchParams.get("status");
  const type = searchParams.get("type");
  const serviceId = searchParams.get("serviceId");
  const assignedTo = searchParams.get("assignedTo");

  const data = await getFieldTasks();
  let tasks = data.tasks;

  // Apply filters
  if (id) tasks = tasks.filter((t) => t.id === id);
  if (missionId) tasks = tasks.filter((t) => t.missionId === missionId);
  if (status) tasks = tasks.filter((t) => t.status === status);
  if (type) tasks = tasks.filter((t) => t.type === type);
  if (serviceId) tasks = tasks.filter((t) => t.serviceId === serviceId);
  if (assignedTo) tasks = tasks.filter((t) => t.assignedTo === assignedTo);

  // Pagination
  const limitParam = searchParams.get("limit");
  const offsetParam = searchParams.get("offset");
  const totalFiltered = tasks.length;
  const limit = limitParam ? Math.max(1, parseInt(limitParam, 10) || 50) : DEFAULT_LIMIT;
  const offset = Math.max(0, parseInt(offsetParam ?? "0", 10));
  tasks = tasks.slice(offset, offset + limit);

  const meta = {
    total: data.tasks.length,
    filtered: totalFiltered,
    returned: tasks.length,
    limit,
    offset,
  };

  return NextResponse.json({ data: tasks, tasks, meta });
}

export async function POST(request: Request) {
  const validation = await validateBody(request, fieldTaskCreateSchema);
  if (!validation.success) return validation.error;
  const body = validation.data;

  // Field tasks must belong to a mission
  if (!body.missionId) {
    return NextResponse.json(
      { error: "Field tasks must belong to a mission. Provide a missionId." },
      { status: 400 },
    );
  }

  // If the target mission is already active, require owner authorization
  const missionsData = await getFieldMissions();
  const targetMission = missionsData.missions.find(m => m.id === body.missionId);
  if (targetMission && targetMission.status === "active") {
    const ownerCheck = await requireOwner(body as Record<string, unknown>);
    if (ownerCheck) return ownerCheck;
  }

  // Server-side approval enforcement — never trust client input
  const approvalConfig = await getApprovalConfig();
  let serviceRiskLevel: ServiceRiskLevel = "medium";
  if (body.serviceId) {
    const servicesData = await getFieldServices();
    const svc = servicesData.services.find((s) => s.id === body.serviceId);
    if (svc) serviceRiskLevel = svc.riskLevel;
  }
  const serverApprovalRequired = requiresApproval(
    body.type,
    serviceRiskLevel,
    approvalConfig.config.mode,
  );

  const now = new Date().toISOString();

  const newTask = await mutateFieldTasks(async (data) => {
    const task: FieldTask = {
      id: generateId("ftask"),
      missionId: body.missionId,
      title: body.title,
      description: body.description,
      type: body.type,
      serviceId: body.serviceId,
      assignedTo: body.assignedTo,
      status: body.status,
      approvalRequired: serverApprovalRequired,
      payload: body.payload,
      result: {},
      attachments: [],
      linkedTaskId: body.linkedTaskId,
      blockedBy: body.blockedBy,
      rejectionFeedback: null,
      approvedBy: null,
      rejectedBy: null,
      scheduledFor: body.scheduledFor ?? null,
      createdAt: now,
      updatedAt: now,
      executedAt: null,
      completedAt: null,
    };
    data.tasks.push(task);
    return task;
  });

  // Log activity (best-effort)
  const postActor = body.actor ?? "system";
  await addFieldActivityEvent({
    type: "field_task_created",
    actor: postActor,
    taskId: newTask.id,
    serviceId: newTask.serviceId,
    missionId: newTask.missionId,
    summary: `Field task created: ${newTask.title}`,
    details: `Task "${newTask.title}" (${newTask.id}) created with type "${newTask.type}" and status "${newTask.status}".`,
    metadata: {
      taskType: newTask.type,
      approvalRequired: newTask.approvalRequired,
      serviceId: newTask.serviceId,
      assignedTo: newTask.assignedTo,
    },
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

export async function PUT(request: Request) {
  const validation = await validateBody(request, fieldTaskUpdateSchema);
  if (!validation.success) return validation.error;
  const body = validation.data;

  // Owner-only: approve/reject actions require human authorization
  if (body.status === "approved" || body.status === "rejected") {
    const ownerCheck = await requireOwner(body as Record<string, unknown>);
    if (ownerCheck) return ownerCheck;
  }

  // ── State machine enforcement (OWASP ASI02: prevent invalid transitions) ──
  if (body.status) {
    const currentData = await getFieldTasks();
    const currentTask = currentData.tasks.find((t) => t.id === body.id);
    if (currentTask && currentTask.status !== body.status) {
      if (!isValidTransition(currentTask.status as FieldTaskStatus, body.status as FieldTaskStatus)) {
        // Log invalid transition attempt as security event
        await addFieldActivityEvent({
          type: "field_task_failed",
          actor: body.actor ?? "system",
          taskId: body.id,
          serviceId: currentTask.serviceId,
          missionId: currentTask.missionId,
          summary: `Invalid transition blocked: ${currentTask.status} → ${body.status}`,
          details: getTransitionError(currentTask.status as FieldTaskStatus, body.status as FieldTaskStatus),
          metadata: { previousStatus: currentTask.status, attemptedStatus: body.status },
        });
        return NextResponse.json(
          { error: getTransitionError(currentTask.status as FieldTaskStatus, body.status as FieldTaskStatus) },
          { status: 400 },
        );
      }

      // ── Approval enforcement: prevent draft → approved bypass when approval required ──
      if (isApprovalBypassAttempt(currentTask.status as FieldTaskStatus, body.status as FieldTaskStatus, currentTask.approvalRequired)) {
        await addFieldActivityEvent({
          type: "field_task_failed",
          actor: body.actor ?? "system",
          taskId: body.id,
          serviceId: currentTask.serviceId,
          missionId: currentTask.missionId,
          summary: `Approval bypass blocked: ${currentTask.title}`,
          details: getApprovalBypassError(),
          metadata: { attemptedBypass: "draft→approved", approvalRequired: true },
        });
        return NextResponse.json(
          { error: getApprovalBypassError() },
          { status: 403 },
        );
      }

      // ── Circuit breaker: prevent execution when mission has 3+ consecutive failures ──
      if (body.status === "executing" && currentTask.missionId) {
        const allTasks = await getFieldTasks();
        const missionTaskStatuses = allTasks.tasks
          .filter((t) => t.missionId === currentTask.missionId && t.id !== currentTask.id)
          .map((t) => t.status as FieldTaskStatus);

        if (shouldTripCircuitBreaker(missionTaskStatuses)) {
          // Auto-pause the parent mission
          await mutateFieldMissions(async (mData) => {
            const mission = mData.missions.find((m) => m.id === currentTask.missionId);
            if (mission && mission.status === "active") {
              mission.status = "paused";
              mission.updatedAt = new Date().toISOString();
            }
          });

          await addFieldActivityEvent({
            type: "circuit_breaker_tripped",
            actor: body.actor ?? "system",
            taskId: body.id,
            serviceId: currentTask.serviceId,
            missionId: currentTask.missionId,
            summary: `Circuit breaker tripped: mission auto-paused`,
            details: `3+ consecutive task failures detected in mission "${currentTask.missionId}". Mission auto-paused to prevent cascading failures. Review and resolve failed tasks before resuming.`,
            metadata: { missionId: currentTask.missionId, taskType: currentTask.type },
          });

          return NextResponse.json(
            { error: "Circuit breaker tripped: 3+ consecutive task failures. Mission has been auto-paused." },
            { status: 409 },
          );
        }
      }
    }
  }

  // Extract actor from body (not a FieldTask field — used only for activity logging)
  const actor = body.actor ?? "system";
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { actor: _extractedActor, ...taskUpdates } = body;

  const result = await mutateFieldTasks(async (data) => {
    const idx = data.tasks.findIndex((t) => t.id === taskUpdates.id);
    if (idx === -1) return null;

    const oldTask = { ...data.tasks[idx] };
    const now = new Date().toISOString();

    const isExecuting = taskUpdates.status === "executing" && oldTask.status !== "executing";
    const isCompleting = taskUpdates.status === "completed";
    const isChangingToNonCompleted = taskUpdates.status !== undefined && !isCompleting;
    const isApproving = taskUpdates.status === "approved" && oldTask.status !== "approved";
    const isRejecting = taskUpdates.status === "rejected" && oldTask.status !== "rejected";

    data.tasks[idx] = {
      ...data.tasks[idx],
      ...taskUpdates,
      updatedAt: now,
      // Set executedAt when status transitions to "executing"
      executedAt: isExecuting ? now : data.tasks[idx].executedAt,
      // Set completedAt when status transitions to "completed"
      completedAt: isCompleting
        ? (data.tasks[idx].completedAt ?? now)
        : isChangingToNonCompleted
          ? null
          : data.tasks[idx].completedAt,
      // Track who approved/rejected
      approvedBy: isApproving ? actor : data.tasks[idx].approvedBy,
      rejectedBy: isRejecting ? actor : data.tasks[idx].rejectedBy,
    };

    return { updatedTask: data.tasks[idx], oldTask };
  });

  if (!result) {
    return NextResponse.json({ error: "Field task not found" }, { status: 404 });
  }

  const { updatedTask, oldTask } = result;

  // Log status transitions (best-effort)
  if (updatedTask.status !== oldTask.status) {
    const eventTypeMap: Record<string, FieldOpsEventType> = {
      "approved": "field_task_approved",
      "rejected": "field_task_rejected",
      "executing": "field_task_executing",
      "completed": "field_task_completed",
      "failed": "field_task_failed",
    };
    const eventType = eventTypeMap[updatedTask.status] ?? "field_task_created";

    // Build structured metadata based on the transition type
    const transitionMeta: Record<string, unknown> = {
      previousStatus: oldTask.status,
      newStatus: updatedTask.status,
      taskType: updatedTask.type,
    };
    if (updatedTask.status === "approved") {
      transitionMeta.approvedBy = updatedTask.approvedBy;
    }
    if (updatedTask.status === "rejected") {
      transitionMeta.rejectedBy = updatedTask.rejectedBy;
      if (updatedTask.rejectionFeedback) transitionMeta.rejectionFeedback = updatedTask.rejectionFeedback;
    }
    if (updatedTask.status === "completed" || updatedTask.status === "failed") {
      transitionMeta.serviceId = updatedTask.serviceId;
      // Calculate duration if both timestamps exist
      if (updatedTask.executedAt && updatedTask.completedAt) {
        const durationMs = new Date(updatedTask.completedAt).getTime() - new Date(updatedTask.executedAt).getTime();
        transitionMeta.durationMs = durationMs;
      }
    }

    await addFieldActivityEvent({
      type: eventType,
      actor,
      taskId: updatedTask.id,
      serviceId: updatedTask.serviceId,
      missionId: updatedTask.missionId,
      summary: `Field task ${updatedTask.status}: ${updatedTask.title}`,
      details: `Task "${updatedTask.title}" status changed from "${oldTask.status}" to "${updatedTask.status}".${updatedTask.rejectionFeedback ? ` Feedback: ${updatedTask.rejectionFeedback}` : ""}`,
      metadata: transitionMeta,
    });

    // ── Post to regular agent inbox + activity log (notification bridge) ──
    if (updatedTask.status === "approved") {
      await notifyFieldTaskApproved(updatedTask);
      await logFieldOpsActivity(
        "field_task_approved",
        actor,
        updatedTask.linkedTaskId,
        `Field task approved: ${updatedTask.title}`,
        `Field task "${updatedTask.title}" (${updatedTask.id}) approved by ${updatedTask.approvedBy ?? actor}. Ready for execution.`,
      );
    } else if (updatedTask.status === "rejected") {
      await notifyFieldTaskRejected(updatedTask);
      await logFieldOpsActivity(
        "field_task_rejected",
        actor,
        updatedTask.linkedTaskId,
        `Field task rejected: ${updatedTask.title}`,
        `Field task "${updatedTask.title}" (${updatedTask.id}) rejected.${updatedTask.rejectionFeedback ? ` Feedback: ${updatedTask.rejectionFeedback}` : ""}`,
      );
    }
  }

  return NextResponse.json(updatedTask);
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  const deletedTask = await mutateFieldTasks(async (data) => {
    const idx = data.tasks.findIndex((t) => t.id === id);
    if (idx === -1) return null;
    const task = data.tasks[idx];
    data.tasks.splice(idx, 1);
    return { id: task.id, title: task.title, serviceId: task.serviceId, missionId: task.missionId };
  });

  if (!deletedTask) {
    return NextResponse.json({ error: "Field task not found" }, { status: 404 });
  }

  await addFieldActivityEvent({
    type: "field_task_deleted",
    actor: "system",
    taskId: deletedTask.id,
    serviceId: deletedTask.serviceId,
    missionId: deletedTask.missionId,
    summary: `Field task deleted: ${deletedTask.title}`,
    details: `Task "${deletedTask.title}" (${deletedTask.id}) was permanently deleted.${deletedTask.missionId ? ` Was part of mission "${deletedTask.missionId}".` : ""}`,
  });

  return NextResponse.json({ ok: true });
}
