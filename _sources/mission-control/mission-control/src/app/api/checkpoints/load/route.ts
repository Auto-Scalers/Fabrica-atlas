import { NextRequest, NextResponse } from "next/server";
import { getCheckpoint, loadCoreData } from "@/lib/data";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

// POST /api/checkpoints/load — Load a checkpoint, replacing all current data
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { id?: string };
    const id = (body.id ?? "").trim();
    if (!id) {
      return NextResponse.json({ error: "Checkpoint ID is required" }, { status: 400 });
    }
    // Validate ID format to prevent path traversal
    if (!/^snap_(\d+|demo)$/.test(id)) {
      return NextResponse.json({ error: "Invalid checkpoint ID" }, { status: 400 });
    }

    const snap = await getCheckpoint(id);
    await loadCoreData(snap.data);

    // Regenerate AI context in background (don't block the response)
    execAsync("pnpm gen:context", { cwd: process.cwd() }).catch(() => {
      // Silently ignore — context will be regenerated on next manual run
    });

    return NextResponse.json({ ok: true, name: snap.name });
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to load checkpoint", details: String(err) },
      { status: 500 }
    );
  }
}
