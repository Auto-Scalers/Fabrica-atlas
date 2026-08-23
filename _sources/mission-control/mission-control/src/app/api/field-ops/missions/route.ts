import { NextResponse } from "next/server";
import { getFieldMissions, mutateFieldMissions, mutateFieldTasks } from "@/lib/data";
import type { FieldMission } from "@/lib/types";
import { fieldMissionCreateSchema, fieldMissionUpdateSchema, validateBody, DEFAULT_LIMIT } from "@/lib/validations";
import { generateId } from "@/lib/utils";
import { addFieldActivityEvent } from "@/lib/field-ops-activity";
import { requireOwner } from "@/lib/owner-guard";

// ─── API Routes ─────────────────────────────────────────────────────────────

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  const status = searchParams.get("status");
  const linkedProjectId = searchParams.get("linkedProjectId");

  const data = await getFieldMissions();
  let missions = data.missions;

  // Apply filters
  if (id) missions = missions.filter((m) => m.id === id);
  if (status) missions = missions.filter((m) => m.status === status);
  if (linkedProjectId) missions = missions.filter((m) => m.linkedProjectId === linkedProjectId);

  // Pagination
  const limitParam = searchParams.get("limit");
  const offsetParam = searchParams.get("offset");
  const totalFiltered = missions.length;
  const limit = limitParam ? Math.max(1, parseInt(limitParam, 10) || 50) : DEFAULT_LIMIT;
  const offset = Math.max(0, parseInt(offsetParam ?? "0", 10));
  missions = missions.slice(offset, offset + limit);

  const meta = {
    total: data.missions.length,
    filtered: totalFiltered,
    returned: missions.length,
    limit,
    offset,
  };

  return NextResponse.json({ data: missions, missions, meta });
}

export async function POST(request: Request) {
  const validation = await validateBody(request, fieldMissionCreateSchema);
  if (!validation.success) return validation.error;
  const body = validation.data;

  // Creating an active mission requires owner authorization (drafts are fine)
  if (body.status === "active") {
    const ownerCheck = await requireOwner(body as Record<string, unknown>);
    if (ownerCheck) return ownerCheck;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { actor: _extractedPostActor, ...missionData } = body;

  const newMission = await mutateFieldMissions(async (data) => {
    const mission: FieldMission = {
      id: generateId("fmission"),
      title: missionData.title,
      description: missionData.description,
      status: missionData.status,
      autonomyLevel: missionData.autonomyLevel,
      linkedProjectId: missionData.linkedProjectId,
      tasks: missionData.tasks,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      completedAt: null,
    };
    data.missions.push(mission);
    return mission;
  });

  // Log activity (best-effort)
  const postActor = body.actor ?? "system";
  await addFieldActivityEvent({
    type: "mission_created",
    actor: postActor,
    taskId: null,
    serviceId: null,
    missionId: newMission.id,
    summary: `Mission created: ${newMission.title}`,
    details: `Mission "${newMission.title}" (${newMission.id}) was created with autonomy level "${newMission.autonomyLevel}".`,
    metadata: {
      autonomyLevel: newMission.autonomyLevel,
      linkedProjectId: newMission.linkedProjectId,
      taskCount: newMission.tasks.length,
    },
  });

  return NextResponse.json(newMission, { status: 201 });
}

export async function PUT(request: Request) {
  const validation = await validateBody(request, fieldMissionUpdateSchema);
  if (!validation.success) return validation.error;
  const body = validation.data;

  // Activating a mission or changing autonomy level requires owner authorization
  if (body.status === "active" || body.autonomyLevel) {
    const ownerCheck = await requireOwner(body as Record<string, unknown>);
    if (ownerCheck) return ownerCheck;
  }

  // Extract actor (not a FieldMission field — used only for activity logging)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { actor: _extractedActor, ...missionUpdates } = body;

  const result = await mutateFieldMissions(async (data) => {
    const idx = data.missions.findIndex((m) => m.id === missionUpdates.id);
    if (idx === -1) return null;

    const oldMission = { ...data.missions[idx] };
    const now = new Date().toISOString();

    const isCompleting = missionUpdates.status === "completed";
    const isChangingToNonCompleted = missionUpdates.status !== undefined && !isCompleting;

    data.missions[idx] = {
      ...data.missions[idx],
      ...missionUpdates,
      updatedAt: now,
      completedAt: isCompleting
        ? (data.missions[idx].completedAt ?? now)
        : isChangingToNonCompleted
          ? null
          : data.missions[idx].completedAt,
    };

    return { updatedMission: data.missions[idx], oldMission };
  });

  if (!result) {
    return NextResponse.json({ error: "Mission not found" }, { status: 404 });
  }

  const { updatedMission, oldMission } = result;
  const putActor = body.actor ?? "system";

  // Log status changes (best-effort)
  if (updatedMission.status !== oldMission.status) {
    await addFieldActivityEvent({
      type: "mission_status_changed",
      actor: putActor,
      taskId: null,
      serviceId: null,
      missionId: updatedMission.id,
      summary: `Mission status changed: ${updatedMission.title}`,
      details: `Mission "${updatedMission.title}" status changed from "${oldMission.status}" to "${updatedMission.status}".`,
      metadata: {
        previousStatus: oldMission.status,
        newStatus: updatedMission.status,
        linkedProjectId: updatedMission.linkedProjectId,
      },
    });
  }

  if (updatedMission.autonomyLevel !== oldMission.autonomyLevel) {
    await addFieldActivityEvent({
      type: "autonomy_changed",
      actor: putActor,
      taskId: null,
      serviceId: null,
      missionId: updatedMission.id,
      summary: `Mission autonomy changed: ${updatedMission.title}`,
      details: `Autonomy level for "${updatedMission.title}" changed from "${oldMission.autonomyLevel}" to "${updatedMission.autonomyLevel}".`,
      metadata: {
        previousLevel: oldMission.autonomyLevel,
        newLevel: updatedMission.autonomyLevel,
      },
    });
  }

  return NextResponse.json(updatedMission);
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  const deletedMission = await mutateFieldMissions(async (data) => {
    const idx = data.missions.findIndex((m) => m.id === id);
    if (idx === -1) return null;
    const mission = data.missions[idx];
    data.missions.splice(idx, 1);
    return { id: mission.id, title: mission.title, linkedProjectId: mission.linkedProjectId };
  });

  if (!deletedMission) {
    return NextResponse.json({ error: "Mission not found" }, { status: 404 });
  }

  // Cascade: orphan tasks that belonged to this mission (set missionId to null)
  const orphanedCount = await mutateFieldTasks(async (data) => {
    let count = 0;
    for (const task of data.tasks) {
      if (task.missionId === id) {
        task.missionId = null;
        task.updatedAt = new Date().toISOString();
        count++;
      }
    }
    return count;
  });

  await addFieldActivityEvent({
    type: "mission_deleted",
    actor: "system",
    taskId: null,
    serviceId: null,
    missionId: deletedMission.id,
    summary: `Mission deleted: ${deletedMission.title}`,
    details: `Mission "${deletedMission.title}" (${deletedMission.id}) was deleted.${orphanedCount > 0 ? ` ${orphanedCount} task(s) were unlinked from this mission.` : ""}`,
    metadata: {
      orphanedTaskCount: orphanedCount,
      linkedProjectId: deletedMission.linkedProjectId,
    },
  });

  return NextResponse.json({ ok: true });
}
