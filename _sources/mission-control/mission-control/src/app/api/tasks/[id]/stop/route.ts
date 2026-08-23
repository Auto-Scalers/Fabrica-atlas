import { NextResponse } from "next/server";
import { readFileSync, writeFileSync, existsSync } from "fs";
import path from "path";

const DATA_DIR = path.resolve(process.cwd(), "data");

function readJSON<T>(file: string): T | null {
  try {
    if (!existsSync(file)) return null;
    return JSON.parse(readFileSync(file, "utf-8")) as T;
  } catch {
    return null;
  }
}

function writeJSON(file: string, data: unknown): void {
  writeFileSync(file, JSON.stringify(data, null, 2), "utf-8");
}

interface RunEntry {
  id: string;
  taskId: string;
  pid: number;
  status: string;
  completedAt: string | null;
  error: string | null;
}

interface TaskEntry {
  id: string;
  kanban: string;
  updatedAt: string;
}

/**
 * Kill a process tree.
 */
async function killProcess(pid: number): Promise<boolean> {
  if (pid <= 0) return false;
  try {
    const treeKill = (await import("tree-kill")).default;
    return new Promise((resolve) => {
      treeKill(pid, "SIGTERM", (err?: Error) => {
        resolve(!err);
      });
    });
  } catch {
    try {
      process.kill(pid, "SIGTERM");
      return true;
    } catch {
      return false;
    }
  }
}

// ─── POST: Stop a running task ──────────────────────────────────────────────

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: taskId } = await params;
  const now = new Date().toISOString();

  // 1. Find running entry for this task
  const runsPath = path.join(DATA_DIR, "active-runs.json");
  const runsData = readJSON<{ runs: RunEntry[] }>(runsPath) ?? { runs: [] };
  const runEntry = runsData.runs.find(
    (r) => r.taskId === taskId && r.status === "running"
  );

  if (!runEntry) {
    return NextResponse.json(
      { error: "Task is not currently running" },
      { status: 404 }
    );
  }

  // 2. Kill the process
  const killed = await killProcess(runEntry.pid);

  // 3. Update run entry
  runEntry.status = "stopped";
  runEntry.completedAt = now;
  runEntry.error = "Stopped by user";
  writeJSON(runsPath, runsData);

  // 4. Reset task to not-started
  const tasksPath = path.join(DATA_DIR, "tasks.json");
  const tasksData = readJSON<{ tasks: TaskEntry[] }>(tasksPath);
  if (tasksData) {
    const task = tasksData.tasks.find((t) => t.id === taskId);
    if (task && task.kanban === "in-progress") {
      task.kanban = "not-started";
      task.updatedAt = now;
      writeJSON(tasksPath, tasksData);
    }
  }

  return NextResponse.json({
    taskId,
    killed,
    status: "stopped",
  });
}
