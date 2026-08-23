/**
 * Field Ops → Agent Notification Bridge
 *
 * Posts field ops events to the regular agent inbox and activity log,
 * closing the feedback loop between Field Ops and the agent system.
 *
 * When field tasks are executed, approved, or rejected, agents receive
 * inbox messages with results and activity log entries for visibility.
 */

import { mutateInbox, mutateActivityLog } from "@/lib/data";
import { generateId } from "@/lib/utils";
import type { FieldTask, InboxMessage, ActivityEvent, EventType } from "@/lib/types";

// ─── Inbox Notifications ────────────────────────────────────────────────────

/**
 * Post a field task execution result to the regular inbox.
 * The recipient is the agent who created/assigned the field task,
 * or "me" if no assignee.
 */
export async function notifyFieldTaskCompleted(task: FieldTask): Promise<void> {
  const recipient = task.assignedTo || "me";
  const resultSummary = task.result
    ? JSON.stringify(task.result).slice(0, 500)
    : "No result data";

  await mutateInbox(async (data) => {
    const msg: InboxMessage = {
      id: generateId("msg"),
      from: "system",
      to: recipient,
      type: "report",
      taskId: task.linkedTaskId,
      subject: `Field Ops: "${task.title}" completed`,
      body: [
        `Field task "${task.title}" (${task.id}) executed successfully.`,
        "",
        `**Type:** ${task.type}`,
        task.serviceId ? `**Service:** ${task.serviceId}` : null,
        `**Result:** ${resultSummary}`,
        task.linkedTaskId ? `**Linked Task:** ${task.linkedTaskId}` : null,
      ].filter(Boolean).join("\n"),
      status: "unread",
      createdAt: new Date().toISOString(),
      readAt: null,
    };
    data.messages.push(msg);
  });
}

/**
 * Post a field task failure notification to the regular inbox.
 */
export async function notifyFieldTaskFailed(task: FieldTask): Promise<void> {
  const recipient = task.assignedTo || "me";
  const errorMsg = task.result?.error
    ? String(task.result.error)
    : "Unknown error";

  await mutateInbox(async (data) => {
    const msg: InboxMessage = {
      id: generateId("msg"),
      from: "system",
      to: recipient,
      type: "report",
      taskId: task.linkedTaskId,
      subject: `Field Ops: "${task.title}" failed`,
      body: [
        `Field task "${task.title}" (${task.id}) failed during execution.`,
        "",
        `**Type:** ${task.type}`,
        task.serviceId ? `**Service:** ${task.serviceId}` : null,
        `**Error:** ${errorMsg}`,
        task.linkedTaskId ? `**Linked Task:** ${task.linkedTaskId}` : null,
        "",
        "Review the error and consider retrying or adjusting the approach.",
      ].filter(Boolean).join("\n"),
      status: "unread",
      createdAt: new Date().toISOString(),
      readAt: null,
    };
    data.messages.push(msg);
  });
}

/**
 * Post a field task approval notification to the regular inbox.
 */
export async function notifyFieldTaskApproved(task: FieldTask): Promise<void> {
  const recipient = task.assignedTo || "me";

  await mutateInbox(async (data) => {
    const msg: InboxMessage = {
      id: generateId("msg"),
      from: "system",
      to: recipient,
      type: "update",
      taskId: task.linkedTaskId,
      subject: `Field Ops: "${task.title}" approved`,
      body: [
        `Field task "${task.title}" (${task.id}) has been approved and is ready for execution.`,
        "",
        `**Type:** ${task.type}`,
        task.serviceId ? `**Service:** ${task.serviceId}` : null,
        task.approvedBy ? `**Approved by:** ${task.approvedBy}` : null,
        task.linkedTaskId ? `**Linked Task:** ${task.linkedTaskId}` : null,
      ].filter(Boolean).join("\n"),
      status: "unread",
      createdAt: new Date().toISOString(),
      readAt: null,
    };
    data.messages.push(msg);
  });
}

/**
 * Post a field task rejection notification to the regular inbox.
 */
export async function notifyFieldTaskRejected(task: FieldTask): Promise<void> {
  const recipient = task.assignedTo || "me";

  await mutateInbox(async (data) => {
    const msg: InboxMessage = {
      id: generateId("msg"),
      from: "system",
      to: recipient,
      type: "update",
      taskId: task.linkedTaskId,
      subject: `Field Ops: "${task.title}" rejected`,
      body: [
        `Field task "${task.title}" (${task.id}) was rejected.`,
        "",
        `**Type:** ${task.type}`,
        task.rejectedBy ? `**Rejected by:** ${task.rejectedBy}` : null,
        task.rejectionFeedback ? `**Feedback:** ${task.rejectionFeedback}` : null,
        task.linkedTaskId ? `**Linked Task:** ${task.linkedTaskId}` : null,
        "",
        "Review the feedback and adjust your approach before resubmitting.",
      ].filter(Boolean).join("\n"),
      status: "unread",
      createdAt: new Date().toISOString(),
      readAt: null,
    };
    data.messages.push(msg);
  });
}

// ─── Activity Log Notifications ─────────────────────────────────────────────

/**
 * Log a field ops event to the regular activity log.
 * This makes field ops visible in the unified activity timeline.
 */
export async function logFieldOpsActivity(
  type: EventType,
  actor: string,
  taskId: string | null,
  summary: string,
  details: string,
): Promise<void> {
  await mutateActivityLog(async (data) => {
    const event: ActivityEvent = {
      id: generateId("evt"),
      type,
      actor,
      taskId,
      summary,
      details,
      timestamp: new Date().toISOString(),
    };
    data.events.push(event);
  });
}
