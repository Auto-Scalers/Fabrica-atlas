/**
 * Field Ops Batch Operations API
 *
 * POST /api/field-ops/batch
 *
 * Applies bulk status transitions to multiple field tasks at once.
 * Supports: submit-for-approval, approve, reject
 *
 * All transitions are applied atomically in a single mutateFieldTasks call.
 */

import { NextResponse } from "next/server";
import { mutateFieldTasks } from "@/lib/data";
import { fieldBatchSchema, validateBody } from "@/lib/validations";
import { isValidTransition } from "@/lib/field-ops-security";
import { addFieldActivityEvent } from "@/lib/field-ops-activity";
import { requireOwner } from "@/lib/owner-guard";
import {
  notifyFieldTaskApproved,
  notifyFieldTaskRejected,
  logFieldOpsActivity,
} from "@/lib/field-ops-notify";
import type { FieldTaskStatus, FieldTask } from "@/lib/types";

export const dynamic = "force-dynamic";

// Map batch actions to target status
const actionStatusMap: Record<string, FieldTaskStatus> = {
  "submit-for-approval": "pending-approval",
  "approve": "approved",
  "reject": "rejected",
};

export async function POST(request: Request) {
  const validation = await validateBody(request, fieldBatchSchema);
  if (!validation.success) return validation.error;
  const { action, taskIds, actor, rejectionFeedback } = validation.data;

  // All batch operations require owner authorization
  const ownerCheck = await requireOwner(validation.data as Record<string, unknown>);
  if (ownerCheck) return ownerCheck;

  const targetStatus = actionStatusMap[action];
  if (!targetStatus) {
    return NextResponse.json(
      { error: `Unknown action: ${action}` },
      { status: 400 },
    );
  }

  const now = new Date().toISOString();

  // Apply all transitions atomically
  const result = await mutateFieldTasks(async (data) => {
    const succeeded: string[] = [];
    const failed: Array<{ id: string; error: string }> = [];
    const updatedTasks: FieldTask[] = [];

    for (const taskId of taskIds) {
      const task = data.tasks.find((t) => t.id === taskId);
      if (!task) {
        failed.push({ id: taskId, error: "Task not found" });
        continue;
      }

      if (!isValidTransition(task.status as FieldTaskStatus, targetStatus)) {
        failed.push({
          id: taskId,
          error: `Invalid transition: ${task.status} → ${targetStatus}`,
        });
        continue;
      }

      // Apply the transition
      task.status = targetStatus;
      task.updatedAt = now;

      if (action === "approve") {
        task.approvedBy = actor;
      } else if (action === "reject") {
        task.rejectedBy = actor;
        if (rejectionFeedback) {
          task.rejectionFeedback = rejectionFeedback;
        }
      }

      succeeded.push(taskId);
      updatedTasks.push({ ...task });
    }

    return { succeeded, failed, updatedTasks };
  });

  // Log batch activity event
  if (result.succeeded.length > 0) {
    await addFieldActivityEvent({
      type: action === "approve"
        ? "field_task_approved"
        : action === "reject"
          ? "field_task_rejected"
          : "field_task_created",
      actor,
      taskId: null,
      serviceId: null,
      missionId: null,
      summary: `Batch ${action}: ${result.succeeded.length} task(s)`,
      details: `Batch operation "${action}" applied to ${result.succeeded.length} task(s). IDs: ${result.succeeded.join(", ")}`,
      metadata: {
        action,
        succeededCount: result.succeeded.length,
        failedCount: result.failed.length,
        taskIds: result.succeeded,
      },
    });

    // Send individual notifications for approvals/rejections
    for (const task of result.updatedTasks) {
      if (action === "approve") {
        await notifyFieldTaskApproved(task);
        await logFieldOpsActivity(
          "field_task_approved",
          actor,
          task.linkedTaskId,
          `Field task approved: ${task.title}`,
          `Field task "${task.title}" (${task.id}) batch-approved by ${actor}.`,
        );
      } else if (action === "reject") {
        await notifyFieldTaskRejected(task);
        await logFieldOpsActivity(
          "field_task_rejected",
          actor,
          task.linkedTaskId,
          `Field task rejected: ${task.title}`,
          `Field task "${task.title}" (${task.id}) batch-rejected.${rejectionFeedback ? ` Feedback: ${rejectionFeedback}` : ""}`,
        );
      }
    }
  }

  return NextResponse.json({
    action,
    targetStatus,
    succeeded: result.succeeded,
    failed: result.failed,
    total: taskIds.length,
  });
}
