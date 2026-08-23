import { NextResponse } from "next/server";
import { readFileSync, existsSync } from "fs";
import path from "path";

export const dynamic = "force-dynamic";

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
 * GET /api/inbox/respond/status?messageId=xxx
 *
 * Returns active respond-runs. Optionally filter by messageId.
 * Client polls every 3 seconds to track composing state.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const messageId = searchParams.get("messageId");

    if (!existsSync(RESPOND_RUNS_FILE)) {
      return NextResponse.json({ runs: [] });
    }

    const data = JSON.parse(readFileSync(RESPOND_RUNS_FILE, "utf-8")) as { runs: RespondRunEntry[] };

    let runs = data.runs;

    // Filter by messageId if provided
    if (messageId) {
      runs = runs.filter((r) => r.messageId === messageId);
    }

    // By default, only return running entries (client cares about active state)
    const showAll = searchParams.get("all") === "true";
    if (!showAll) {
      runs = runs.filter((r) => r.status === "running");
    }

    return NextResponse.json({ runs });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to read respond-runs" },
      { status: 500 },
    );
  }
}
