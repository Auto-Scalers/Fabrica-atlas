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

interface BrainDumpEntry {
  id: string;
  content: string;
  processed: boolean;
}

// ─── POST: Trigger brain dump auto-processing ────────────────────────────────

export async function POST(request: Request) {
  let body: { entryIds?: string[]; all?: boolean };
  try {
    body = await request.json() as { entryIds?: string[]; all?: boolean };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  // 1. Read brain dump entries
  const dumpData = readJSON<{ entries: BrainDumpEntry[] }>(
    path.join(DATA_DIR, "brain-dump.json")
  );
  if (!dumpData) {
    return NextResponse.json({ error: "Could not read brain dump data" }, { status: 500 });
  }

  // 2. Determine which entries to process
  let targetEntries: BrainDumpEntry[];

  if (body.all) {
    targetEntries = dumpData.entries.filter((e) => !e.processed);
  } else if (body.entryIds && Array.isArray(body.entryIds) && body.entryIds.length > 0) {
    targetEntries = dumpData.entries.filter(
      (e) => !e.processed && body.entryIds!.includes(e.id)
    );
  } else {
    return NextResponse.json(
      { error: "Provide either 'entryIds' array or 'all: true'" },
      { status: 400 }
    );
  }

  if (targetEntries.length === 0) {
    return NextResponse.json(
      { error: "No unprocessed entries found matching the criteria" },
      { status: 400 }
    );
  }

  // 3. Spawn the processing runner as a detached process
  const cwd = process.cwd();
  const scriptPath = path.resolve(cwd, "scripts", "daemon", "run-brain-dump-triage.ts");

  const entryIds = targetEntries.map((e) => e.id);

  try {
    const child = spawn(process.execPath, [
      "--import", "tsx",
      scriptPath,
      ...entryIds,
    ], {
      cwd,
      detached: true,
      stdio: "ignore",
      shell: false,
    });

    child.unref();

    return NextResponse.json({
      entryIds,
      count: entryIds.length,
      pid: child.pid ?? 0,
      message: `Auto-processing started for ${entryIds.length} entries`,
    });
  } catch (err) {
    return NextResponse.json(
      { error: `Failed to spawn: ${err instanceof Error ? err.message : String(err)}` },
      { status: 500 }
    );
  }
}
