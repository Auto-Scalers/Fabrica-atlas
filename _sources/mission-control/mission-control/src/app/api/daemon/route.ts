import { NextResponse } from "next/server";
import { readFileSync, existsSync } from "fs";
import { spawn } from "child_process";
import path from "path";
import { getDaemonConfig, mutateDaemonConfig } from "@/lib/data";
import { daemonConfigUpdateSchema, validateBody } from "@/lib/validations";
import { requireOwner } from "@/lib/owner-guard";

const DATA_DIR = path.resolve(process.cwd(), "data");
const STATUS_FILE = path.join(DATA_DIR, "daemon-status.json");
const PID_FILE = path.join(DATA_DIR, "daemon.pid");

// ─── Helpers ─────────────────────────────────────────────────────────────────

function readJSON(file: string): unknown {
  try {
    if (!existsSync(file)) return null;
    return JSON.parse(readFileSync(file, "utf-8"));
  } catch {
    return null;
  }
}

function isProcessRunning(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function getPid(): number | null {
  try {
    if (!existsSync(PID_FILE)) return null;
    const pid = parseInt(readFileSync(PID_FILE, "utf-8").trim());
    return isNaN(pid) ? null : pid;
  } catch {
    return null;
  }
}

// ─── GET: Read daemon status + config ────────────────────────────────────────

export async function GET() {
  const status = readJSON(STATUS_FILE) ?? {
    status: "stopped",
    pid: null,
    startedAt: null,
    activeSessions: [],
    history: [],
    stats: { tasksDispatched: 0, tasksCompleted: 0, tasksFailed: 0, uptimeMinutes: 0 },
    lastPollAt: null,
    nextScheduledRuns: {},
  };
  const config = await getDaemonConfig();

  // Verify daemon is actually running (PID check)
  const pid = getPid();
  const isRunning = pid !== null && isProcessRunning(pid);
  const statusObj = status as Record<string, unknown>;

  if (!isRunning && statusObj.status === "running") {
    // Daemon crashed — update status
    statusObj.status = "stopped";
    statusObj.pid = null;
  }

  return NextResponse.json({
    status: statusObj,
    config,
    isRunning,
  });
}

// ─── POST: Start/stop daemon ─────────────────────────────────────────────────

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const action = body.action;

    if (action === "start") {
      const pid = getPid();
      if (pid && isProcessRunning(pid)) {
        return NextResponse.json(
          { error: `Daemon is already running (PID: ${pid})` },
          { status: 409 }
        );
      }

      // SECURITY: Use process.execPath (node.exe) directly instead of tsx.cmd wrapper.
      // On Windows, .cmd files cannot be spawned with shell: false (EINVAL error).
      // Using node --import tsx achieves the same result without a shell.
      const cwd = process.cwd();
      const scriptPath = path.resolve(cwd, "scripts", "daemon", "index.ts");

      const child = spawn(process.execPath, ["--import", "tsx", scriptPath, "start"], {
        cwd,
        detached: true,
        stdio: "ignore",
        shell: false,
      });

      child.unref();

      return NextResponse.json({ message: "Daemon starting...", pid: child.pid });
    }

    if (action === "stop") {
      const pid = getPid();
      if (!pid || !isProcessRunning(pid)) {
        return NextResponse.json({ message: "Daemon is not running" });
      }

      try {
        process.kill(pid, "SIGTERM");
        return NextResponse.json({ message: "Stop signal sent", pid });
      } catch (err) {
        return NextResponse.json(
          { error: `Failed to stop daemon: ${err instanceof Error ? err.message : String(err)}` },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({ error: "Invalid action. Use 'start' or 'stop'" }, { status: 400 });
  } catch (err) {
    return NextResponse.json(
      { error: `Invalid request: ${err instanceof Error ? err.message : String(err)}` },
      { status: 400 }
    );
  }
}

// ─── PUT: Update daemon config ───────────────────────────────────────────────

export async function PUT(request: Request) {
  // Validate request body against Zod schema
  const validation = await validateBody(request, daemonConfigUpdateSchema);
  if (!validation.success) return validation.error;
  const updates = validation.data;

  // Daemon config changes require owner authorization
  const ownerCheck = await requireOwner(updates as Record<string, unknown>);
  if (ownerCheck) return ownerCheck;

  // SECURITY: Reject attempts to enable skipPermissions via API.
  // This can only be set by manually editing data/daemon-config.json.
  if (updates.execution?.skipPermissions === true) {
    return NextResponse.json(
      {
        error: "Cannot enable skipPermissions via API",
        details: "skipPermissions can only be set by manually editing data/daemon-config.json. This is a safety measure to prevent remote escalation.",
      },
      { status: 403 }
    );
  }

  // Atomic read-modify-write with mutex
  const newConfig = await mutateDaemonConfig(async (currentConfig) => {
    // Section-level merge: replace entire sections, not individual fields
    if (updates.polling) currentConfig.polling = updates.polling;
    if (updates.concurrency) currentConfig.concurrency = updates.concurrency;
    if (updates.schedule) currentConfig.schedule = updates.schedule;
    if (updates.execution) currentConfig.execution = updates.execution;
    return { ...currentConfig };
  });

  return NextResponse.json({ message: "Config updated", config: newConfig });
}
