import { NextResponse } from "next/server";
import { getGoals, mutateGoals, mutateTasks } from "@/lib/data";
import type { Goal } from "@/lib/types";
import { goalCreateSchema, goalUpdateSchema, validateBody, DEFAULT_LIMIT } from "@/lib/validations";
import { generateId } from "@/lib/utils";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  const status = searchParams.get("status");
  const type = searchParams.get("type");
  const projectId = searchParams.get("projectId");
  const includeDeleted = searchParams.get("includeDeleted") === "true";

  const data = await getGoals();
  const total = data.goals.length;
  let goals = data.goals;

  // Filter out soft-deleted by default
  if (!includeDeleted) {
    goals = goals.filter((g) => !g.deletedAt);
  }

  if (id) {
    goals = goals.filter((g) => g.id === id);
  }
  if (status) {
    goals = goals.filter((g) => g.status === status);
  }
  if (type) {
    goals = goals.filter((g) => g.type === type);
  }
  if (projectId) {
    goals = goals.filter((g) => g.projectId === projectId);
  }

  // Pagination
  const limitParam = searchParams.get("limit");
  const offsetParam = searchParams.get("offset");
  const totalFiltered = goals.length;
  const limit = limitParam ? Math.max(1, parseInt(limitParam, 10) || 50) : DEFAULT_LIMIT;
  const offset = Math.max(0, parseInt(offsetParam ?? "0", 10));
  goals = goals.slice(offset, offset + limit);

  return NextResponse.json(
    {
      data: goals, goals,
      meta: { total, filtered: totalFiltered, returned: goals.length, limit, offset },
    },
    { headers: { "Cache-Control": "private, max-age=2, stale-while-revalidate=5" } },
  );
}

export async function POST(request: Request) {
  const validation = await validateBody(request, goalCreateSchema);
  if (!validation.success) return validation.error;
  const body = validation.data;

  const newGoal = await mutateGoals(async (data) => {
    const goal: Goal = {
      id: generateId("goal"),
      title: body.title,
      type: body.type,
      timeframe: body.timeframe,
      parentGoalId: body.parentGoalId,
      projectId: body.projectId,
      status: body.status,
      milestones: body.milestones,
      tasks: body.tasks,
      createdAt: new Date().toISOString(),
      deletedAt: null,
    };
    data.goals.push(goal);
    return goal;
  });

  return NextResponse.json(newGoal, { status: 201 });
}

export async function PUT(request: Request) {
  const validation = await validateBody(request, goalUpdateSchema);
  if (!validation.success) return validation.error;
  const body = validation.data;

  const updated = await mutateGoals(async (data) => {
    const idx = data.goals.findIndex((g) => g.id === body.id);
    if (idx === -1) return null;
    data.goals[idx] = { ...data.goals[idx], ...body };
    return data.goals[idx];
  });

  if (!updated) {
    return NextResponse.json({ error: "Goal not found" }, { status: 404 });
  }
  return NextResponse.json(updated);
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  const hard = searchParams.get("hard") === "true";

  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  if (hard) {
    // Hard delete: remove from goals and clean up milestoneId references in tasks
    const found = await mutateGoals(async (data) => {
      const idx = data.goals.findIndex((g) => g.id === id);
      if (idx === -1) return false;
      data.goals.splice(idx, 1);
      return true;
    });

    if (!found) {
      return NextResponse.json({ error: "Goal not found" }, { status: 404 });
    }

    // Referential integrity: clear milestoneId on tasks that referenced this goal
    await mutateTasks(async (data) => {
      for (const task of data.tasks) {
        if (task.milestoneId === id) {
          task.milestoneId = null;
        }
      }
    });

    return NextResponse.json({ ok: true, hard: true });
  }

  // Soft delete: set deletedAt timestamp
  const found = await mutateGoals(async (data) => {
    const idx = data.goals.findIndex((g) => g.id === id);
    if (idx === -1) return false;
    data.goals[idx].deletedAt = new Date().toISOString();
    return true;
  });

  if (!found) {
    return NextResponse.json({ error: "Goal not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, hard: false });
}
