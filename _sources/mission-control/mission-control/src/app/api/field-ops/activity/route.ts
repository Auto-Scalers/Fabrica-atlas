import { NextResponse } from "next/server";
import { getFieldActivityLog } from "@/lib/data";
import { DEFAULT_LIMIT } from "@/lib/validations";

// ─── API Routes (read-only) ────────────────────────────────────────────────

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");
  const serviceId = searchParams.get("serviceId");
  const taskId = searchParams.get("taskId");
  const missionId = searchParams.get("missionId");
  const actor = searchParams.get("actor");
  const credentialId = searchParams.get("credentialId");

  const data = await getFieldActivityLog();

  // Sort by timestamp descending (most recent first)
  let events = [...data.events].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  // Apply filters
  if (type) events = events.filter((e) => e.type === type);
  if (serviceId) events = events.filter((e) => e.serviceId === serviceId);
  if (taskId) events = events.filter((e) => e.taskId === taskId);
  if (missionId) events = events.filter((e) => e.missionId === missionId);
  if (actor) events = events.filter((e) => e.actor === actor);
  if (credentialId) events = events.filter((e) => e.credentialId === credentialId);

  // Pagination
  const limitParam = searchParams.get("limit");
  const offsetParam = searchParams.get("offset");
  const totalFiltered = events.length;
  const limit = limitParam ? Math.max(1, parseInt(limitParam, 10) || 50) : DEFAULT_LIMIT;
  const offset = Math.max(0, parseInt(offsetParam ?? "0", 10));
  events = events.slice(offset, offset + limit);

  const meta = {
    total: data.events.length,
    filtered: totalFiltered,
    returned: events.length,
    limit,
    offset,
  };

  return NextResponse.json({ data: events, events, meta });
}
