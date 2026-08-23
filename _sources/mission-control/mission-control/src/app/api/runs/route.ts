import { NextResponse } from "next/server";
import { getActiveRuns, mutateActiveRuns } from "@/lib/data";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isProcessAlive(pid: number): boolean {
  if (pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

// ─── GET: Read active runs with PID liveness check ──────────────────────────

export async function GET() {
  const data = await getActiveRuns();

  // PID liveness check: find dead "running" processes
  const hasDeadProcesses = data.runs.some(
    (run) => run.status === "running" && run.pid > 0 && !isProcessAlive(run.pid)
  );

  // Only acquire the write mutex if we actually need to update
  if (hasDeadProcesses) {
    const updated = await mutateActiveRuns(async (mutableData) => {
      for (const run of mutableData.runs) {
        if (run.status === "running" && run.pid > 0 && !isProcessAlive(run.pid)) {
          run.status = "failed";
          run.error = "Process terminated unexpectedly";
          run.completedAt = new Date().toISOString();
        }
      }
      return mutableData;
    });
    return NextResponse.json(updated);
  }

  return NextResponse.json(data);
}
