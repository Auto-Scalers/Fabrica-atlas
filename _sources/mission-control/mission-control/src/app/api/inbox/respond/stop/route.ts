import { NextResponse } from "next/server";
import { readFileSync, writeFileSync, existsSync } from "fs";
import path from "path";

const RESPOND_RUNS_FILE = path.resolve(process.cwd(), "data", "respond-runs.json");

interface RespondRunEntry {
  id: string;
  messageId: string;
  agentId: string;
  threadSubject: string;
  pid: number;
  status: string;
  continuationIndex: number;
  maxContinuations: number;
  stopped: boolean;
  startedAt: string;
  completedAt: string | null;
  costUsd: number | null;
  numTurns: number | null;
  error: string | null;
}

/**
 * Kill a process tree. Uses tree-kill if available, falls back to process.kill.
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

/**
 * POST /api/inbox/respond/stop
 *
 * Body: { messageId } or { runId }
 *
 * Stops a running respond-run chain:
 * 1. Sets `stopped: true` in respond-runs.json (prevents next continuation)
 * 2. Kills the current PID
 */
export async function POST(request: Request) {
  try {
    let body: { messageId?: string; runId?: string };
    try {
      body = await request.json() as { messageId?: string; runId?: string };
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    if (!body.messageId && !body.runId) {
      return NextResponse.json({ error: "messageId or runId is required" }, { status: 400 });
    }

    if (!existsSync(RESPOND_RUNS_FILE)) {
      return NextResponse.json({ error: "No active respond-runs" }, { status: 404 });
    }

    const data = JSON.parse(readFileSync(RESPOND_RUNS_FILE, "utf-8")) as { runs: RespondRunEntry[] };

    // Find the running entry
    const run = data.runs.find((r) => {
      if (body.runId) return r.id === body.runId;
      return r.messageId === body.messageId && r.status === "running";
    });

    if (!run) {
      return NextResponse.json({ error: "No active run found" }, { status: 404 });
    }

    // Set stopped flag
    run.stopped = true;
    run.status = "stopped";
    run.completedAt = new Date().toISOString();

    writeFileSync(RESPOND_RUNS_FILE, JSON.stringify(data, null, 2), "utf-8");

    // Kill the current process
    let killed = false;
    if (run.pid > 0) {
      killed = await killProcess(run.pid);
    }

    return NextResponse.json({
      runId: run.id,
      killed,
      message: `Respond-run ${run.id} stopped${killed ? " and process killed" : ""}`,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 },
    );
  }
}
