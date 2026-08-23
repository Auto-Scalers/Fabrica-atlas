import { NextResponse } from "next/server";
import { spawn } from "child_process";
import { readFileSync, existsSync } from "fs";
import path from "path";

const DATA_DIR = path.resolve(process.cwd(), "data");

// ─── Helpers ─────────────────────────────────────────────────────────────────

function readJSON<T>(file: string): T | null {
  try {
    if (!existsSync(file)) return null;
    return JSON.parse(readFileSync(file, "utf-8")) as T;
  } catch {
    return null;
  }
}

interface TaskEntry {
  id: string;
  assignedTo: string | null;
  kanban: string;
  projectId: string | null;
  blockedBy?: string[];
}

interface RunEntry {
  id: string;
  taskId: string;
  status: string;
}

// ─── POST: Run a single task ─────────────────────────────────────────────────

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: taskId } = await params;

  // 1. Validate task exists
  const tasksData = readJSON<{ tasks: TaskEntry[] }>(path.join(DATA_DIR, "tasks.json"));
  if (!tasksData) {
    return NextResponse.json({ error: "Could not read tasks" }, { status: 500 });
  }

  const task = tasksData.tasks.find((t) => t.id === taskId);
  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  // 2. Validate task has an AI agent assigned
  if (!task.assignedTo || task.assignedTo === "me") {
    return NextResponse.json(
      { error: "Task has no AI agent assigned" },
      { status: 400 }
    );
  }

  // 3. Validate task is not done
  if (task.kanban === "done") {
    return NextResponse.json(
      { error: "Task is already done" },
      { status: 400 }
    );
  }

  // 4. Check not already running
  const runsData = readJSON<{ runs: RunEntry[] }>(path.join(DATA_DIR, "active-runs.json"));
  if (runsData) {
    const alreadyRunning = runsData.runs.find(
      (r) => r.taskId === taskId && r.status === "running"
    );
    if (alreadyRunning) {
      return NextResponse.json(
        { error: "Task is already running" },
        { status: 409 }
      );
    }
  }

  // 5. Check if task is blocked by unfinished dependencies
  if (task.blockedBy && task.blockedBy.length > 0) {
    const stillBlocked = task.blockedBy.some((depId) => {
      const dep = tasksData.tasks.find((t) => t.id === depId);
      return !dep || dep.kanban !== "done";
    });
    if (stillBlocked) {
      return NextResponse.json(
        { error: "Task is blocked by unfinished dependencies" },
        { status: 400 }
      );
    }
  }

  // 6. Check for pending decisions blocking this task
  const decisionsData = readJSON<{
    decisions: Array<{
      id: string;
      requestedBy: string;
      taskId: string | null;
      question: string;
      options: string[];
      context: string;
      status: string;
      answer: string | null;
      answeredAt: string | null;
      createdAt: string;
    }>;
  }>(path.join(DATA_DIR, "decisions.json"));
  if (decisionsData) {
    const pendingDecision = decisionsData.decisions
      .filter((d) => d.taskId === taskId && d.status === "pending")
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())[0];
    if (pendingDecision) {
      return NextResponse.json(
        {
          error: "Task has a pending decision that must be answered first",
          pendingDecision,
        },
        { status: 400 }
      );
    }
  }

  // 7. Load daemon config for agentTeams flag
  const configData = readJSON<{
    execution: { agentTeams?: boolean };
  }>(path.join(DATA_DIR, "daemon-config.json"));
  const agentTeams = configData?.execution?.agentTeams ?? false;

  // 8. Spawn run-task.ts as detached process
  const cwd = process.cwd();
  const scriptPath = path.resolve(cwd, "scripts", "daemon", "run-task.ts");

  const args = [
    "--import", "tsx",
    scriptPath,
    taskId,
    "--source", "manual",
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

    return NextResponse.json({
      taskId,
      pid: child.pid ?? 0,
      message: `Task ${taskId} execution started`,
    });
  } catch (err) {
    return NextResponse.json(
      { error: `Failed to spawn: ${err instanceof Error ? err.message : String(err)}` },
      { status: 500 }
    );
  }
}
