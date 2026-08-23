import { NextResponse } from "next/server";
import { getActivityLog, mutateActivityLog } from "@/lib/data";
import type { ActivityEvent } from "@/lib/types";
import { activityEventCreateSchema, validateBody, DEFAULT_LIMIT } from "@/lib/validations";
import { generateId } from "@/lib/utils";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const actor = searchParams.get("actor");
  const data = await getActivityLog();

  const total = data.events.length;
  let events = data.events;

  // Filter by actor if provided
  if (actor) {
    events = events.filter((e) => e.actor === actor);
  }

  // Sort newest first
  events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  // Pagination
  const limitParam = searchParams.get("limit");
  const offsetParam = searchParams.get("offset");
  const totalFiltered = events.length;
  const limit = limitParam ? Math.max(1, parseInt(limitParam, 10) || 50) : DEFAULT_LIMIT;
  const offset = Math.max(0, parseInt(offsetParam ?? "0", 10));
  events = events.slice(offset, offset + limit);

  return NextResponse.json(
    {
      data: events, events,
      meta: { total, filtered: totalFiltered, returned: events.length, limit, offset },
    },
    { headers: { "Cache-Control": "private, max-age=2, stale-while-revalidate=5" } },
  );
}

export async function POST(request: Request) {
  const validation = await validateBody(request, activityEventCreateSchema);
  if (!validation.success) return validation.error;
  const body = validation.data;

  const newEvent = await mutateActivityLog(async (data) => {
    const event: ActivityEvent = {
      id: generateId("evt"),
      type: body.type,
      actor: body.actor,
      taskId: body.taskId,
      summary: body.summary,
      details: body.details,
      timestamp: body.timestamp ?? new Date().toISOString(),
    };
    data.events.push(event);
    return event;
  });

  return NextResponse.json(newEvent, { status: 201 });
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  await mutateActivityLog(async (data) => {
    data.events = data.events.filter((e) => e.id !== id);
  });

  return NextResponse.json({ ok: true });
}
