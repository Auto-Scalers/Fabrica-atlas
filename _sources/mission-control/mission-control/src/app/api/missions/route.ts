import { NextResponse } from "next/server";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { spawn } from "child_process";
import path from "path";

export const dynamic = "force-dynamic";

const DATA_DIR = path.resolve(process.cwd(), "data");

// ─── Helpers ─────────────────────────────────────────────────────────────────

interface MissionEntry {
  id: string;
  projectId: string;
  status: string;
  startedAt: string;
  stoppedAt: string | null;
  completedAt: string | null;
  lastTaskCompletedAt: string | null;
  totalTasks: number;
  completedTasks: number;
  failedTasks: number;
  skippedTasks: number;
  taskHistory: Array<{
    taskId: string;
    taskTitle: string;
    agentId: string;
    status: string;
    summary: string;
    attempt: number;
  }>;
  loopDetection: { taskAttempts: Record<string, number>; taskErrors: Record<string, string[]> };
}

interface RunEntry {
  id: string;
  taskId: string;
  missionId: string | null;
  pid: number;
  status: string;
}

interface TaskEntry {
  id: string;
  kanban: string;
  assignedTo: string | null;
  projectId: string | null;
  blockedBy?: string[];
  deletedAt?: string | null;
}

interface DecisionEntry {
  taskId: string | null;
  status: string;
}

function readJSON<T>(filename: string): T | null {
  try {
    const filePath = path.join(DATA_DIR, filename);
    if (!existsSync(filePath)) return null;
    return JSON.parse(readFileSync(filePath, "utf-8")) as T;
  } catch {
    return null;
  }
}

function isProcessAlive(pid: number): boolean {
  if (pid <= 0) return true;
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

// ─── Reconciliation ──────────────────────────────────────────────────────────

const GRACE_PERIOD_MS = 30_000; // 30 seconds — give chain dispatch time before re-dispatching

/**
 * Detect stuck missions and either re-dispatch tasks or mark as stalled.
 * This acts as a heartbeat safety net — if chain dispatch from run-task.ts
 * fails silently, the reconciler picks up the slack on the next frontend poll.
 */
function reconcileStuckMissions(missions: MissionEntry[]): boolean {
  let changed = false;

  const runsData = readJSON<{ runs: RunEntry[] }>("active-runs.json");
  const tasksData = readJSON<{ tasks: TaskEntry[] }>("tasks.json");
  const decisionsData = readJSON<{ decisions: DecisionEntry[] }>("decisions.json");
  if (!tasksData) return false;

  const allRuns = runsData?.runs ?? [];
  const pendingDecisionTaskIds = new Set(
    (decisionsData?.decisions ?? [])
      .filter((d) => d.status === "pending" && d.taskId)
      .map((d) => d.taskId as string)
  );

  // Load concurrency config for re-dispatch
  const configData = readJSON<{
    concurrency: { maxParallelAgents: number };
    execution: { agentTeams?: boolean };
  }>("daemon-config.json");
  const maxParallel = configData?.concurrency?.maxParallelAgents ?? 3;
  const agentTeams = configData?.execution?.agentTeams ?? false;

  // Count all currently live processes across all missions
  const totalLiveProcesses = allRuns.filter(
    (r) => r.status === "running" && isProcessAlive(r.pid)
  ).length;

  for (const mission of missions) {
    if (mission.status !== "running") continue;

    // Check if any processes are actually alive for this mission
    const missionRuns = allRuns.filter(
      (r) => r.missionId === mission.id && r.status === "running"
    );
    const hasLiveProcesses = missionRuns.some((r) => isProcessAlive(r.pid));

    if (hasLiveProcesses) continue; // Mission is legitimately running

    // Grace period — if a task just completed, give chain dispatch time to work
    if (mission.lastTaskCompletedAt) {
      const elapsed = Date.now() - new Date(mission.lastTaskCompletedAt).getTime();
      if (elapsed < GRACE_PERIOD_MS) continue; // Chain dispatch may be in progress
    }

    // No live processes — check project tasks to determine correct state
    const projectTasks = tasksData.tasks.filter((t) => t.projectId === mission.projectId);
    const remaining = projectTasks.filter(
      (t) => t.kanban !== "done" && t.assignedTo && t.assignedTo !== "me" && !t.deletedAt
    );

    if (remaining.length === 0) {
      // All tasks done — mission should be completed
      mission.status = "completed";
      mission.completedAt = new Date().toISOString();
      mission.completedTasks = projectTasks.filter((t) => t.kanban === "done").length;
      changed = true;
      postMissionInboxReport(mission);
      continue;
    }

    // Filter to already-running task IDs (with liveness check)
    const liveRunningTaskIds = new Set(
      allRuns
        .filter((r) => r.status === "running" && isProcessAlive(r.pid))
        .map((r) => r.taskId)
    );

    // Check which remaining tasks are dispatchable
    const dispatchable = remaining.filter((t) => {
      if (liveRunningTaskIds.has(t.id)) return false;
      if (t.blockedBy && t.blockedBy.length > 0) {
        const allDone = t.blockedBy.every((depId) => {
          const dep = tasksData.tasks.find((d) => d.id === depId);
          return dep?.kanban === "done";
        });
        if (!allDone) return false;
      }
      if (pendingDecisionTaskIds.has(t.id)) return false;
      const attempts = mission.loopDetection?.taskAttempts?.[t.id] ?? 0;
      if (attempts >= 3) return false;
      return true;
    });

    if (dispatchable.length > 0) {
      // RE-DISPATCH: spawn tasks instead of marking stalled
      const slotsAvailable = Math.max(0, maxParallel - totalLiveProcesses);
      const toSpawn = dispatchable.slice(0, slotsAvailable);

      if (toSpawn.length > 0) {
        spawnMissionTasks(toSpawn, mission.id, agentTeams);
        // Keep mission running — don't mark as stalled
        continue;
      }
      // No slots available but tasks are dispatchable — keep running, wait for slots
      continue;
    }

    // No dispatchable tasks — check if deps could resolve from other project tasks
    const remainingIds = new Set(remaining.map((t) => t.id));
    const hasPendingDeps = remaining.some((t) => {
      if (!t.blockedBy || t.blockedBy.length === 0) return false;
      // Check if ALL unmet deps are tasks within this project that are still in-progress
      return t.blockedBy.every((depId) => {
        const dep = tasksData.tasks.find((d) => d.id === depId);
        if (!dep) return false;
        if (dep.kanban === "done") return true; // Already met
        // Dep is in this project and could complete — keep waiting
        return dep.projectId === mission.projectId && remainingIds.has(depId);
      });
    });

    if (hasPendingDeps) {
      // Dependencies could resolve when other project tasks complete — keep running
      continue;
    }

    // Truly stalled: no dispatchable tasks and no deps that can resolve
    mission.status = "stalled";
    mission.skippedTasks = remaining.length - dispatchable.length;
    changed = true;
    postMissionInboxReport(mission);
  }

  return changed;
}

/**
 * Spawn run-task.ts processes for dispatchable mission tasks.
 */
function spawnMissionTasks(
  tasks: TaskEntry[],
  missionId: string,
  agentTeams: boolean
): void {
  const cwd = process.cwd();
  const scriptPath = path.resolve(cwd, "scripts", "daemon", "run-task.ts");

  for (const task of tasks) {
    const args = [
      "--import", "tsx",
      scriptPath,
      task.id,
      "--source", "mission-chain",
      "--mission", missionId,
    ];
    if (agentTeams) {
      args.push("--agent-teams");
    }

    try {
      const child = spawn(process.execPath, args, {
        cwd,
        detached: true,
        stdio: "ignore",
        shell: false,
      });
      child.unref();
    } catch {
      // Best-effort — continue with other tasks
    }
  }
}

/**
 * Post a mission report to inbox during reconciliation.
 */
function postMissionInboxReport(mission: MissionEntry): void {
  try {
    const inboxPath = path.join(DATA_DIR, "inbox.json");
    const inboxRaw = existsSync(inboxPath)
      ? readFileSync(inboxPath, "utf-8")
      : '{"messages":[]}';
    const inboxData = JSON.parse(inboxRaw) as { messages: Array<Record<string, unknown>> };

    const isComplete = mission.status === "completed";
    const remaining = mission.totalTasks - mission.completedTasks - mission.failedTasks;
    const subject = isComplete
      ? `Project run complete: ${mission.completedTasks}/${mission.totalTasks} tasks done`
      : `Project run stalled: ${mission.completedTasks}/${mission.totalTasks} tasks done, ${remaining} remaining`;

    const lines: string[] = [];
    if (isComplete) {
      lines.push(`All ${mission.completedTasks} tasks in this project run have been completed.`);
    } else {
      lines.push(`The project run has stalled with ${remaining} task(s) remaining that could not be dispatched.`);
    }

    if (mission.failedTasks > 0) {
      lines.push(`\n${mission.failedTasks} task(s) failed during execution.`);
    }

    // List completed tasks with file locations
    const completed = mission.taskHistory.filter((e) => e.status === "completed");
    if (completed.length > 0) {
      lines.push("\n**Completed tasks:**");
      for (const entry of completed) {
        lines.push(`- ${entry.taskTitle} (${entry.agentId})`);
        const filePaths = entry.summary.match(/(?:research|projects|docs|output)\/[\w\-/.]+\.\w+/g);
        if (filePaths) {
          for (const fp of [...new Set(filePaths)].slice(0, 3)) {
            lines.push(`  → ${fp}`);
          }
        }
      }
    }

    if (!isComplete) {
      lines.push("\nPlease check the Status Board for any remaining tasks. Some may need your input on the Decisions page.");
    }

    inboxData.messages.push({
      id: `msg_${Date.now()}`,
      from: "system",
      to: "me",
      type: "report",
      taskId: null,
      subject,
      body: lines.join("\n"),
      status: "unread",
      createdAt: new Date().toISOString(),
      readAt: null,
    });

    writeFileSync(inboxPath, JSON.stringify(inboxData, null, 2), "utf-8");
  } catch {
    // Best-effort — don't fail the API call
  }
}

// ─── GET: Return missions data (with reconciliation) ─────────────────────────

export async function GET() {
  try {
    const missionsPath = path.join(DATA_DIR, "missions.json");
    if (!existsSync(missionsPath)) {
      return NextResponse.json({ missions: [] });
    }
    const data = JSON.parse(readFileSync(missionsPath, "utf-8")) as { missions: MissionEntry[] };

    // Reconcile stuck missions on every poll (cheap — only checks when status is "running")
    const changed = reconcileStuckMissions(data.missions);
    if (changed) {
      writeFileSync(missionsPath, JSON.stringify(data, null, 2), "utf-8");
    }

    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ missions: [] });
  }
}
