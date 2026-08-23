import { readFile, writeFile } from "fs/promises";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");

interface Task {
  id: string;
  title: string;
  importance: string;
  urgency: string;
  kanban: string;
  projectId: string | null;
  milestoneId: string | null;
  assignedTo: string | null;
  subtasks: { id: string; title: string; done: boolean }[];
  blockedBy: string[];
  estimatedMinutes: number | null;
  acceptanceCriteria: string[];
  tags: string[];
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}

interface Goal {
  id: string;
  title: string;
  type: string;
  timeframe: string;
  parentGoalId: string | null;
  projectId: string | null;
  status: string;
  milestones: string[];
  tasks: string[];
}

interface Project {
  id: string;
  name: string;
  status: string;
}

interface BrainDumpEntry {
  id: string;
  content: string;
  processed: boolean;
}

interface ActivityEvent {
  id: string;
  type: string;
  actor: string;
  taskId: string | null;
  summary: string;
  details: string;
  timestamp: string;
}

interface InboxMessage {
  id: string;
  from: string;
  to: string;
  type: string;
  taskId: string | null;
  subject: string;
  status: string;
  createdAt: string;
}

interface DecisionItem {
  id: string;
  requestedBy: string;
  taskId: string | null;
  question: string;
  options: string[];
  status: string;
  answer: string | null;
  createdAt: string;
}

const FIELD_OPS_DIR = path.join(DATA_DIR, "field-ops");

interface FieldMission {
  id: string;
  title: string;
  status: string;
  autonomyLevel: string;
  linkedProjectId: string | null;
  tasks: string[];
  createdAt: string;
}

interface FieldTask {
  id: string;
  missionId: string;
  title: string;
  type: string;
  status: string;
  serviceId: string | null;
  assignedTo: string | null;
  result: Record<string, unknown>;
  completedAt: string | null;
  executedAt: string | null;
}

interface FieldService {
  id: string;
  name: string;
  status: string;
  riskLevel: string;
  lastUsed: string | null;
}

interface FieldActivityEvent {
  id: string;
  type: string;
  actor: string;
  summary: string;
  timestamp: string;
}

async function readJSON<T>(filename: string): Promise<T> {
  const raw = await readFile(path.join(DATA_DIR, filename), "utf-8");
  return JSON.parse(raw) as T;
}

async function readFieldOpsJSON<T>(filename: string, fallback: T): Promise<T> {
  try {
    const raw = await readFile(path.join(FIELD_OPS_DIR, filename), "utf-8");
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function getQuadrant(task: Task): string {
  if (task.importance === "important" && task.urgency === "urgent") return "DO";
  if (task.importance === "important" && task.urgency === "not-urgent") return "SCHEDULE";
  if (task.importance === "not-important" && task.urgency === "urgent") return "DELEGATE";
  return "ELIMINATE";
}

async function main(): Promise<void> {
  const { tasks: currentTasks } = await readJSON<{ tasks: Task[] }>("tasks.json");
  let archivedTasks: Task[] = [];
  try {
    const archive = await readJSON<{ tasks: Task[] }>("tasks-archive.json");
    archivedTasks = archive.tasks;
  } catch {
    // Archive file may not exist yet
  }
  // Merge for complete stats (all tasks ever), but active filtering uses currentTasks
  const tasks = [...currentTasks, ...archivedTasks];
  const { goals } = await readJSON<{ goals: Goal[] }>("goals.json");
  const { projects } = await readJSON<{ projects: Project[] }>("projects.json");
  const { entries } = await readJSON<{ entries: BrainDumpEntry[] }>("brain-dump.json");
  const { events } = await readJSON<{ events: ActivityEvent[] }>("activity-log.json");
  const { messages } = await readJSON<{ messages: InboxMessage[] }>("inbox.json");
  const { decisions } = await readJSON<{ decisions: DecisionItem[] }>("decisions.json");

  const now = new Date().toISOString();
  const activeTasks = tasks.filter((t) => t.kanban !== "done");
  const doneTasks = tasks.filter((t) => t.kanban === "done");
  const inProgressTasks = tasks.filter((t) => t.kanban === "in-progress");
  const unprocessed = entries.filter((e) => !e.processed);

  // Eisenhower grouping
  const quadrants: Record<string, Task[]> = { DO: [], SCHEDULE: [], DELEGATE: [], ELIMINATE: [] };
  for (const task of activeTasks) {
    quadrants[getQuadrant(task)].push(task);
  }

  // Project summaries
  const activeProjects = projects.filter((p) => p.status === "active");

  // Goal hierarchy
  const longTermGoals = goals.filter((g) => g.type === "long-term");
  const milestones = goals.filter((g) => g.type === "medium-term");

  // Agent workload
  const workload: Record<string, number> = {};
  for (const task of activeTasks) {
    const agent = task.assignedTo ?? "unassigned";
    workload[agent] = (workload[agent] ?? 0) + 1;
  }

  // Comms stats
  const unreadMessages = messages.filter((m) => m.status === "unread");
  const pendingDecisions = decisions.filter((d) => d.status === "pending");
  const recentEvents = [...events]
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 10);

  // Build markdown
  const lines: string[] = [];
  lines.push("# Mission Control — AI Context Snapshot");
  lines.push(`Generated: ${now}`);
  lines.push("");

  // Active Projects
  lines.push("## Active Projects");
  for (const proj of activeProjects) {
    const projTasks = tasks.filter((t) => t.projectId === proj.id);
    const projDone = projTasks.filter((t) => t.kanban === "done").length;
    const projMilestones = milestones.filter((m) => m.projectId === proj.id);
    const milestoneDone = projMilestones.filter((m) => m.status === "completed").length;
    lines.push(`- ${proj.name} (${proj.id}) — ${proj.status}, ${projTasks.length} tasks (${projDone} done), ${milestoneDone}/${projMilestones.length} milestones`);
  }
  lines.push("");

  // Inbox Summary
  lines.push("## Inbox");
  lines.push(`Unread: ${unreadMessages.length} | Total: ${messages.length}`);
  if (unreadMessages.length > 0) {
    for (const msg of unreadMessages.slice(0, 5)) {
      lines.push(`- [${msg.type}] ${msg.from} -> ${msg.to}: "${msg.subject}"`);
    }
    if (unreadMessages.length > 5) {
      lines.push(`  ... and ${unreadMessages.length - 5} more`);
    }
  }
  lines.push("");

  // Pending Decisions
  lines.push("## Pending Decisions");
  lines.push(`Pending: ${pendingDecisions.length} | Answered: ${decisions.length - pendingDecisions.length}`);
  if (pendingDecisions.length > 0) {
    for (const dec of pendingDecisions) {
      lines.push(`- ${dec.id}: "${dec.question}" (from ${dec.requestedBy}, ${dec.options.length} options)`);
    }
  }
  lines.push("");

  // Recent Activity
  if (recentEvents.length > 0) {
    lines.push("## Recent Activity (last 10 events)");
    for (const evt of recentEvents) {
      lines.push(`- [${evt.type}] ${evt.actor}: ${evt.summary} (${new Date(evt.timestamp).toLocaleString()})`);
    }
    lines.push("");
  }

  // Eisenhower Summary
  lines.push("## Eisenhower Matrix (active tasks only)");
  for (const q of ["DO", "SCHEDULE", "DELEGATE", "ELIMINATE"]) {
    const qTasks = quadrants[q];
    if (qTasks.length > 0) {
      lines.push(`- ${q}: ${qTasks.length} — ${qTasks.map((t) => t.id).join(", ")}`);
    } else {
      lines.push(`- ${q}: 0`);
    }
  }
  lines.push("");

  // Kanban Pipeline
  const notStarted = tasks.filter((t) => t.kanban === "not-started").length;
  lines.push("## Kanban Pipeline");
  lines.push(`Not Started: ${notStarted} | In Progress: ${inProgressTasks.length} | Done: ${doneTasks.length}`);
  lines.push("");

  // In-Progress Tasks (detailed)
  if (inProgressTasks.length > 0) {
    lines.push("## In-Progress Tasks");
    for (const task of inProgressTasks) {
      const proj = task.projectId ? projects.find((p) => p.id === task.projectId) : null;
      const milestone = task.milestoneId ? goals.find((g) => g.id === task.milestoneId) : null;
      const parts = [`${task.id}: "${task.title}"`];
      if (task.assignedTo) parts.push(`[${task.assignedTo}]`);
      if (proj) parts.push(`-> ${proj.name}`);
      if (milestone) parts.push(`/ ${milestone.title}`);
      // Subtask progress
      if (task.subtasks && task.subtasks.length > 0) {
        const done = task.subtasks.filter((s) => s.done).length;
        parts.push(`(${done}/${task.subtasks.length} subtasks)`);
      }
      // Blocked indicator
      if (task.blockedBy && task.blockedBy.length > 0) {
        const blockers = task.blockedBy.filter((depId) => {
          const dep = tasks.find((t) => t.id === depId);
          return dep && dep.kanban !== "done";
        });
        if (blockers.length > 0) {
          parts.push(`BLOCKED by ${blockers.join(", ")}`);
        }
      }
      lines.push(`- ${parts.join(" ")}`);
    }
    lines.push("");
  }

  // Goal Progress
  if (longTermGoals.length > 0) {
    lines.push("## Goal Progress");
    for (const goal of longTermGoals) {
      const goalMilestones = milestones.filter((m) => m.parentGoalId === goal.id);
      lines.push(`- ${goal.id}: "${goal.title}" (${goal.timeframe}) — ${goal.status}`);
      for (const m of goalMilestones) {
        const mTasks = tasks.filter((t) => m.tasks.includes(t.id));
        const mDone = mTasks.filter((t) => t.kanban === "done").length;
        lines.push(`  - ${m.id}: "${m.title}" — ${m.status} (${mDone}/${mTasks.length} tasks done)`);
      }
    }
    lines.push("");
  }

  // Unprocessed Brain Dump
  if (unprocessed.length > 0) {
    lines.push(`## Unprocessed Brain Dump (${unprocessed.length} items)`);
    for (const entry of unprocessed) {
      lines.push(`- ${entry.id}: ${entry.content}`);
    }
    lines.push("");
  }

  // Agent Workload
  const agents = Object.entries(workload).sort((a, b) => b[1] - a[1]);
  if (agents.length > 0) {
    lines.push("## Agent Workload (active tasks)");
    const inProgressByAgent: Record<string, number> = {};
    for (const task of inProgressTasks) {
      const agent = task.assignedTo ?? "unassigned";
      inProgressByAgent[agent] = (inProgressByAgent[agent] ?? 0) + 1;
    }
    for (const [agent, count] of agents) {
      const ip = inProgressByAgent[agent] ?? 0;
      lines.push(`- ${agent}: ${count} tasks${ip > 0 ? ` (${ip} in-progress)` : ""}`);
    }
    lines.push("");
  }

  // ─── Field Ops Status ───────────────────────────────────────────────────
  const foMissions = await readFieldOpsJSON<{ missions: FieldMission[] }>("missions.json", { missions: [] });
  const foTasks = await readFieldOpsJSON<{ tasks: FieldTask[] }>("tasks.json", { tasks: [] });
  const foServices = await readFieldOpsJSON<{ services: FieldService[] }>("services.json", { services: [] });
  const foEvents = await readFieldOpsJSON<{ events: FieldActivityEvent[] }>("activity-log.json", { events: [] });

  const hasFieldOps = foMissions.missions.length > 0 || foServices.services.length > 0 || foTasks.tasks.length > 0;

  if (hasFieldOps) {
    lines.push("## Field Ops Status");

    // Services overview
    const connectedServices = foServices.services.filter((s) => s.status === "connected");
    const savedServices = foServices.services.filter((s) => s.status === "saved");
    const servicesList = foServices.services
      .map((s) => `${s.name} (${s.status})`)
      .join(", ");
    if (servicesList) {
      lines.push(`Services: ${servicesList}`);
    }

    // Missions overview
    const activeMissions = foMissions.missions.filter((m) => m.status === "active");
    const completedMissions = foMissions.missions.filter((m) => m.status === "completed");
    const pausedMissions = foMissions.missions.filter((m) => m.status === "paused");
    lines.push(`Missions: ${activeMissions.length} active${pausedMissions.length > 0 ? `, ${pausedMissions.length} paused` : ""}${completedMissions.length > 0 ? `, ${completedMissions.length} completed` : ""}`);

    // Task status breakdown
    const foStatusCounts: Record<string, number> = {};
    for (const t of foTasks.tasks) {
      foStatusCounts[t.status] = (foStatusCounts[t.status] ?? 0) + 1;
    }
    if (foTasks.tasks.length > 0) {
      const statusParts: string[] = [];
      for (const [status, count] of Object.entries(foStatusCounts)) {
        statusParts.push(`${count} ${status}`);
      }
      lines.push(`Tasks: ${foTasks.tasks.length} total — ${statusParts.join(", ")}`);
    }
    lines.push("");

    // Approval queue (critical for human visibility)
    const pendingApproval = foTasks.tasks.filter((t) => t.status === "pending-approval");
    if (pendingApproval.length > 0) {
      lines.push(`### Approval Queue (${pendingApproval.length} awaiting review)`);
      for (const t of pendingApproval) {
        const mission = foMissions.missions.find((m) => m.id === t.missionId);
        lines.push(`- "${t.title}" (${t.type}) — mission: ${mission?.title ?? t.missionId}`);
      }
      lines.push("");
    }

    // Recent field ops executions (last 5 completed or failed)
    const recentExecutions = foTasks.tasks
      .filter((t) => t.status === "completed" || t.status === "failed")
      .filter((t) => t.completedAt)
      .sort((a, b) => new Date(b.completedAt!).getTime() - new Date(a.completedAt!).getTime())
      .slice(0, 5);
    if (recentExecutions.length > 0) {
      lines.push("### Recent Executions");
      for (const t of recentExecutions) {
        const icon = t.status === "completed" ? "✅" : "❌";
        const date = new Date(t.completedAt!).toLocaleString();
        const resultSummary = t.result && Object.keys(t.result).length > 0
          ? ` — ${Object.entries(t.result).slice(0, 2).map(([k, v]) => `${k}: ${v}`).join(", ")}`
          : "";
        lines.push(`- ${icon} "${t.title}" ${t.status}${resultSummary} (${date})`);
      }
      lines.push("");
    }

    // Recent field ops activity (last 5 events)
    const recentFoEvents = [...foEvents.events]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 5);
    if (recentFoEvents.length > 0) {
      lines.push("### Recent Field Ops Activity");
      for (const evt of recentFoEvents) {
        lines.push(`- [${evt.type}] ${evt.summary} (${new Date(evt.timestamp).toLocaleString()})`);
      }
      lines.push("");
    }
  }

  // Summary stats
  lines.push("## Quick Stats");
  const archivedCount = archivedTasks.length;
  lines.push(`Total tasks: ${tasks.length} | Active: ${activeTasks.length} | Done: ${doneTasks.length}${archivedCount > 0 ? ` | Archived: ${archivedCount}` : ""}`);
  lines.push(`Goals: ${longTermGoals.length} long-term, ${milestones.length} milestones`);
  lines.push(`Projects: ${activeProjects.length} active`);
  lines.push(`Brain dump: ${unprocessed.length} unprocessed`);
  lines.push(`Inbox: ${unreadMessages.length} unread | Decisions: ${pendingDecisions.length} pending`);
  if (hasFieldOps) {
    const foPending = foTasks.tasks.filter((t) => t.status === "pending-approval").length;
    const foExecuting = foTasks.tasks.filter((t) => t.status === "executing").length;
    lines.push(`Field Ops: ${foServices.services.length} services, ${foMissions.missions.filter((m) => m.status === "active").length} active missions, ${foPending} pending approval${foExecuting > 0 ? `, ${foExecuting} executing` : ""}`);
  }

  const content = lines.join("\n") + "\n";
  await writeFile(path.join(DATA_DIR, "ai-context.md"), content, "utf-8");
  console.log(`Generated ai-context.md (${content.length} bytes)`);
}

main().catch((err) => {
  console.error("Failed to generate context:", err);
  process.exit(1);
});
