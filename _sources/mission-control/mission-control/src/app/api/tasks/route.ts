import { NextResponse } from "next/server";
import { getTasks, getTasksArchive, mutateTasks, mutateInbox, mutateActivityLog, mutateGoals } from "@/lib/data";
import type { Task, AgentRole, InboxMessage, ActivityEvent } from "@/lib/types";
import { taskCreateSchema, taskUpdateSchema, validateBody, DEFAULT_LIMIT } from "@/lib/validations";
import { generateId } from "@/lib/utils";

// ─── Side-effect helpers (now atomic via mutate*) ───────────────────────────

async function addInboxMessage(msg: Omit<InboxMessage, "id" | "createdAt" | "readAt" | "status">) {
  await mutateInbox(async (data) => {
    const message: InboxMessage = {
      id: generateId("msg"),
      ...msg,
      status: "unread",
      createdAt: new Date().toISOString(),
      readAt: null,
    };
    data.messages.push(message);
  });
}

async function addActivityEvent(evt: Omit<ActivityEvent, "id" | "timestamp">) {
  await mutateActivityLog(async (data) => {
    const event: ActivityEvent = {
      id: generateId("evt"),
      ...evt,
      timestamp: new Date().toISOString(),
    };
    data.events.push(event);
  });
}

function isAgent(role: AgentRole | null): role is AgentRole {
  return role !== null && role !== "me";
}

// ─── Notification logic ──────────────────────────────────────────────────────

async function handleDelegation(task: Task, previousAssignee: AgentRole | null) {
  if (!isAgent(task.assignedTo)) return;
  if (task.assignedTo === previousAssignee) return;

  await addInboxMessage({
    from: "system",
    to: task.assignedTo,
    type: "delegation",
    taskId: task.id,
    subject: `New assignment: ${task.title}`,
    body: `You have been assigned as lead to: "${task.title}"\n\n${task.description || "No description provided."}${task.collaborators?.length ? `\n\nCollaborators: ${task.collaborators.join(", ")}` : ""}`,
  });

  await addActivityEvent({
    type: "task_delegated",
    actor: "system",
    taskId: task.id,
    summary: `Task delegated to ${task.assignedTo}: ${task.title}`,
    details: `"${task.title}" was assigned to ${task.assignedTo}${previousAssignee ? ` (previously: ${previousAssignee})` : ""}${task.collaborators?.length ? ` with collaborators: ${task.collaborators.join(", ")}` : ""}.`,
  });
}

async function handleCollaboratorChanges(task: Task, previousCollaborators: string[]) {
  const currentCollabs = task.collaborators ?? [];
  const newCollabs = currentCollabs.filter((c) => !previousCollaborators.includes(c));
  const removedCollabs = previousCollaborators.filter((c) => !currentCollabs.includes(c));

  for (const collab of newCollabs) {
    if (!isAgent(collab)) continue;
    await addInboxMessage({
      from: "system",
      to: collab,
      type: "delegation",
      taskId: task.id,
      subject: `Added as collaborator: ${task.title}`,
      body: `You have been added as a collaborator on: "${task.title}"\n\nLead: ${task.assignedTo ?? "unassigned"}\n\n${task.description || "No description provided."}`,
    });
  }

  for (const collab of removedCollabs) {
    if (!isAgent(collab)) continue;
    await addInboxMessage({
      from: "system",
      to: collab,
      type: "update",
      taskId: task.id,
      subject: `Removed from: ${task.title}`,
      body: `You have been removed as a collaborator from: "${task.title}".`,
    });
  }

  if (newCollabs.length > 0 || removedCollabs.length > 0) {
    const parts: string[] = [];
    if (newCollabs.length > 0) parts.push(`added: ${newCollabs.join(", ")}`);
    if (removedCollabs.length > 0) parts.push(`removed: ${removedCollabs.join(", ")}`);
    await addActivityEvent({
      type: "task_updated",
      actor: "system",
      taskId: task.id,
      summary: `Collaborators updated on: ${task.title}`,
      details: `Collaborator changes for "${task.title}": ${parts.join("; ")}.`,
    });
  }
}

async function handleCompletion(task: Task, wasCompleted: boolean) {
  const isNowDone = task.kanban === "done";
  if (isNowDone && !wasCompleted) {
    await addActivityEvent({
      type: "task_completed",
      actor: isAgent(task.assignedTo) ? task.assignedTo : "system",
      taskId: task.id,
      summary: `Task completed: ${task.title}`,
      details: `"${task.title}" was marked as done${task.assignedTo ? ` by ${task.assignedTo}` : ""}.`,
    });

    if (isAgent(task.assignedTo)) {
      await addInboxMessage({
        from: task.assignedTo,
        to: "me",
        type: "report",
        taskId: task.id,
        subject: `Completed: ${task.title}`,
        body: `Task "${task.title}" has been completed.\n\n${task.notes || "No additional notes."}`,
      });
    }

    await handleUnblocking(task);
  }
}

async function handleUnblocking(completedTask: Task) {
  const data = await getTasks();
  const allDoneIds = new Set(
    data.tasks.filter((t) => t.kanban === "done").map((t) => t.id)
  );
  allDoneIds.add(completedTask.id);

  for (const task of data.tasks) {
    if (task.kanban === "done") continue;
    if (!task.blockedBy || task.blockedBy.length === 0) continue;
    if (!task.blockedBy.includes(completedTask.id)) continue;

    const allUnblocked = task.blockedBy.every((id) => allDoneIds.has(id));
    if (allUnblocked && isAgent(task.assignedTo)) {
      await addInboxMessage({
        from: "system",
        to: task.assignedTo,
        type: "update",
        taskId: task.id,
        subject: `Unblocked: ${task.title}`,
        body: `All dependencies for "${task.title}" have been resolved. This task is now ready to work on.`,
      });

      await addActivityEvent({
        type: "task_updated",
        actor: "system",
        taskId: task.id,
        summary: `Task unblocked: ${task.title}`,
        details: `All blockers resolved for "${task.title}" after "${completedTask.title}" was completed.`,
      });
    }
  }
}

// ─── API Routes ──────────────────────────────────────────────────────────────

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  const assignedTo = searchParams.get("assignedTo");
  const kanban = searchParams.get("kanban");
  const projectId = searchParams.get("projectId");
  const quadrant = searchParams.get("quadrant");
  const fields = searchParams.get("fields");
  const include = searchParams.get("include");
  const includeDeleted = searchParams.get("includeDeleted") === "true";

  const data = await getTasks();

  // Merge archived tasks if requested
  let allTasks = data.tasks;
  if (include === "archived") {
    try {
      const archive = await getTasksArchive();
      allTasks = [...data.tasks, ...archive.tasks];
    } catch {
      // Archive file may not exist yet
    }
  }

  // Filter soft-deleted unless explicitly requested
  if (!includeDeleted) {
    allTasks = allTasks.filter((t) => !t.deletedAt);
  }

  // Ensure backward compatibility
  let tasks = allTasks.map((t) => ({
    ...t,
    collaborators: t.collaborators ?? [],
    subtasks: t.subtasks ?? [],
    blockedBy: t.blockedBy ?? [],
    estimatedMinutes: t.estimatedMinutes ?? null,
    actualMinutes: t.actualMinutes ?? null,
    acceptanceCriteria: t.acceptanceCriteria ?? [],
    comments: t.comments ?? [],
    deletedAt: t.deletedAt ?? null,
  }));

  // Apply filters
  if (id) tasks = tasks.filter((t) => t.id === id);
  if (assignedTo) tasks = tasks.filter((t) => t.assignedTo === assignedTo);
  if (kanban) tasks = tasks.filter((t) => t.kanban === kanban);
  if (projectId) tasks = tasks.filter((t) => t.projectId === projectId);
  if (quadrant) {
    const q = quadrant.toLowerCase();
    tasks = tasks.filter((t) => {
      if (q === "do") return t.importance === "important" && t.urgency === "urgent";
      if (q === "schedule") return t.importance === "important" && t.urgency === "not-urgent";
      if (q === "delegate") return t.importance === "not-important" && t.urgency === "urgent";
      if (q === "eliminate") return t.importance === "not-important" && t.urgency === "not-urgent";
      return true;
    });
  }

  // Pagination
  const limitParam = searchParams.get("limit");
  const offsetParam = searchParams.get("offset");
  const totalFiltered = tasks.length;
  const limit = limitParam ? Math.max(1, parseInt(limitParam, 10) || 50) : DEFAULT_LIMIT;
  const offset = Math.max(0, parseInt(offsetParam ?? "0", 10));
  tasks = tasks.slice(offset, offset + limit);

  const meta = {
    total: allTasks.length,
    filtered: totalFiltered,
    returned: tasks.length,
    limit,
    offset,
  };

  // Sparse field selection
  if (fields) {
    const fieldList = fields.split(",").map((f) => f.trim());
    if (!fieldList.includes("id")) fieldList.unshift("id");
    const sparse = tasks.map((t) => {
      const picked: Record<string, unknown> = {};
      for (const f of fieldList) {
        if (f in t) picked[f] = t[f as keyof typeof t];
      }
      return picked;
    });
    return NextResponse.json(
      { data: sparse, tasks: sparse, meta },
      { headers: { "Cache-Control": "private, max-age=2, stale-while-revalidate=5" } },
    );
  }

  return NextResponse.json(
    { data: tasks, tasks, meta },
    { headers: { "Cache-Control": "private, max-age=2, stale-while-revalidate=5" } },
  );
}

export async function POST(request: Request) {
  const validation = await validateBody(request, taskCreateSchema);
  if (!validation.success) return validation.error;
  const body = validation.data;

  // Atomic: lock → read → create → write → unlock
  const newTask = await mutateTasks(async (data) => {
    const task: Task = {
      id: generateId("task"),
      title: body.title,
      description: body.description,
      importance: body.importance,
      urgency: body.urgency,
      kanban: body.kanban,
      projectId: body.projectId,
      milestoneId: body.milestoneId,
      assignedTo: body.assignedTo,
      collaborators: body.collaborators,
      dailyActions: body.dailyActions,
      subtasks: body.subtasks,
      blockedBy: body.blockedBy,
      estimatedMinutes: body.estimatedMinutes,
      actualMinutes: body.actualMinutes,
      acceptanceCriteria: body.acceptanceCriteria,
      fieldTaskIds: body.fieldTaskIds,
      comments: body.comments,
      tags: body.tags,
      notes: body.notes,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      dueDate: null,
      completedAt: null,
      deletedAt: null,
    };
    data.tasks.push(task);
    return task;
  });

  // Side effects (best-effort, after atomic write)
  if (isAgent(newTask.assignedTo)) {
    await handleDelegation(newTask, null);
  }
  if (newTask.collaborators?.length) {
    await handleCollaboratorChanges(newTask, []);
  }

  return NextResponse.json(newTask, { status: 201 });
}

export async function PUT(request: Request) {
  const validation = await validateBody(request, taskUpdateSchema);
  if (!validation.success) return validation.error;
  const body = validation.data;

  // Atomic: lock → read → update → write → unlock
  const result = await mutateTasks(async (data) => {
    const idx = data.tasks.findIndex((t) => t.id === body.id);
    if (idx === -1) return null;

    const oldTask = { ...data.tasks[idx] };
    const wasCompleted = oldTask.kanban === "done";

    data.tasks[idx] = {
      ...data.tasks[idx],
      ...body,
      updatedAt: new Date().toISOString(),
      completedAt: body.kanban === "done" ? (data.tasks[idx].completedAt ?? new Date().toISOString()) : null,
    };

    return { updatedTask: data.tasks[idx], oldTask, wasCompleted };
  });

  if (!result) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  const { updatedTask, oldTask, wasCompleted } = result;

  // Side effects (best-effort)
  if (updatedTask.assignedTo !== oldTask.assignedTo) {
    await handleDelegation(updatedTask, oldTask.assignedTo);
  }
  const oldCollabs = oldTask.collaborators ?? [];
  const newCollabs = updatedTask.collaborators ?? [];
  if (JSON.stringify(oldCollabs) !== JSON.stringify(newCollabs)) {
    await handleCollaboratorChanges(updatedTask, oldCollabs);
  }
  await handleCompletion(updatedTask, wasCompleted);

  return NextResponse.json(updatedTask);
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  const hard = searchParams.get("hard") === "true";
  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  if (hard) {
    // Hard delete: permanently remove + clean up references
    await mutateTasks(async (data) => {
      for (const task of data.tasks) {
        if (task.blockedBy) {
          task.blockedBy = task.blockedBy.filter((bid) => bid !== id);
        }
      }
      data.tasks = data.tasks.filter((t) => t.id !== id);
    });

    // Clean up goal task references (best-effort)
    await mutateGoals(async (goalsData) => {
      for (const goal of goalsData.goals) {
        goal.tasks = goal.tasks.filter((tid) => tid !== id);
      }
    });

    return NextResponse.json({ ok: true });
  }

  // Soft delete: set deletedAt timestamp
  const found = await mutateTasks(async (data) => {
    const task = data.tasks.find((t) => t.id === id);
    if (!task) return false;
    task.deletedAt = new Date().toISOString();
    task.updatedAt = new Date().toISOString();
    return true;
  });

  if (!found) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
