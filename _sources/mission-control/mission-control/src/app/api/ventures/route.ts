import { NextResponse } from "next/server";
import { getProjects, mutateProjects, mutateTasks, mutateGoals } from "@/lib/data";
import type { Project } from "@/lib/types";
import { projectCreateSchema, projectUpdateSchema, validateBody, DEFAULT_LIMIT } from "@/lib/validations";
import { generateId } from "@/lib/utils";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  const status = searchParams.get("status");
  const includeDeleted = searchParams.get("includeDeleted") === "true";

  const data = await getProjects();
  const total = data.projects.length;

  // Ensure backward compatibility for new fields
  let projects = data.projects.map((p) => ({
    ...p,
    teamMembers: p.teamMembers ?? [],
  }));

  // Filter out soft-deleted by default
  if (!includeDeleted) {
    projects = projects.filter((p) => !p.deletedAt);
  }

  if (id) {
    projects = projects.filter((p) => p.id === id);
  }
  if (status) {
    projects = projects.filter((p) => p.status === status);
  }

  // Pagination
  const limitParam = searchParams.get("limit");
  const offsetParam = searchParams.get("offset");
  const totalFiltered = projects.length;
  const limit = limitParam ? Math.max(1, parseInt(limitParam, 10) || 50) : DEFAULT_LIMIT;
  const offset = Math.max(0, parseInt(offsetParam ?? "0", 10));
  projects = projects.slice(offset, offset + limit);

  return NextResponse.json(
    {
      data: projects, projects,
      meta: { total, filtered: totalFiltered, returned: projects.length, limit, offset },
    },
    { headers: { "Cache-Control": "private, max-age=2, stale-while-revalidate=5" } },
  );
}

export async function POST(request: Request) {
  const validation = await validateBody(request, projectCreateSchema);
  if (!validation.success) return validation.error;
  const body = validation.data;

  const newProject = await mutateProjects(async (data) => {
    const project: Project = {
      id: generateId("proj"),
      name: body.name,
      description: body.description,
      status: body.status,
      color: body.color,
      teamMembers: body.teamMembers,
      createdAt: new Date().toISOString(),
      tags: body.tags,
      deletedAt: null,
    };
    data.projects.push(project);
    return project;
  });

  return NextResponse.json(newProject, { status: 201 });
}

export async function PUT(request: Request) {
  const validation = await validateBody(request, projectUpdateSchema);
  if (!validation.success) return validation.error;
  const body = validation.data;

  const updated = await mutateProjects(async (data) => {
    const idx = data.projects.findIndex((p) => p.id === body.id);
    if (idx === -1) return null;
    data.projects[idx] = { ...data.projects[idx], ...body };
    return data.projects[idx];
  });

  if (!updated) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
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
    // Hard delete: remove from projects
    const found = await mutateProjects(async (data) => {
      const idx = data.projects.findIndex((p) => p.id === id);
      if (idx === -1) return false;
      data.projects.splice(idx, 1);
      return true;
    });

    if (!found) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Referential integrity: clear projectId on tasks and goals that referenced this project
    await mutateTasks(async (data) => {
      for (const task of data.tasks) {
        if (task.projectId === id) {
          task.projectId = null;
        }
      }
    });

    await mutateGoals(async (data) => {
      for (const goal of data.goals) {
        if (goal.projectId === id) {
          goal.projectId = null;
        }
      }
    });

    return NextResponse.json({ ok: true, hard: true });
  }

  // Soft delete: set deletedAt timestamp
  const found = await mutateProjects(async (data) => {
    const idx = data.projects.findIndex((p) => p.id === id);
    if (idx === -1) return false;
    data.projects[idx].deletedAt = new Date().toISOString();
    return true;
  });

  if (!found) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, hard: false });
}
