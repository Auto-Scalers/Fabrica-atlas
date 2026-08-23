import { NextResponse } from "next/server";
import { getTasks, getInbox, getDecisions, getAgents, getFieldTasks } from "@/lib/data";

export const dynamic = "force-dynamic";

export async function GET() {
  const [tasksData, inboxData, decisionsData, agentsData, fieldTasksData] = await Promise.all([
    getTasks(),
    getInbox(),
    getDecisions(),
    getAgents(),
    getFieldTasks(),
  ]);

  const tasks = tasksData.tasks.filter((t) => !t.deletedAt);
  const unreadInbox = inboxData.messages.filter((m) => m.status === "unread").length;
  const pendingDecisions = decisionsData.decisions.filter((d) => d.status === "pending").length;
  const agents = agentsData.agents;
  const pendingFieldApprovals = fieldTasksData.tasks.filter((t) => t.status === "pending-approval").length;

  return NextResponse.json(
    { tasks, unreadInbox, pendingDecisions, pendingFieldApprovals, agents },
    { headers: { "Cache-Control": "private, max-age=2, stale-while-revalidate=5" } },
  );
}
