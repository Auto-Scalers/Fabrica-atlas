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

interface InboxMessage {
  id: string;
  from: string;
  to: string;
  type: string;
  taskId: string | null;
  subject: string;
  body: string;
  status: string;
  createdAt: string;
  readAt: string | null;
}

// ─── POST: Trigger agent auto-respond ────────────────────────────────────────

export async function POST(request: Request) {
  try {
    let body: { messageId?: string };
    try {
      body = await request.json() as { messageId?: string };
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { messageId } = body;
    if (!messageId || typeof messageId !== "string") {
      return NextResponse.json({ error: "messageId is required" }, { status: 400 });
    }

    // 1. Read the message
    const inboxData = readJSON<{ messages: InboxMessage[] }>(path.join(DATA_DIR, "inbox.json"));
    if (!inboxData) {
      return NextResponse.json({ error: "Could not read inbox" }, { status: 500 });
    }

    const message = inboxData.messages.find((m) => m.id === messageId);
    if (!message) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 });
    }

    // 2. Verify the recipient is an AI agent (not "me")
    if (message.to === "me") {
      return NextResponse.json({ error: "Cannot auto-respond for human user" }, { status: 400 });
    }

    // 3. Verify the agent exists
    const agentsData = readJSON<{ agents: Array<{ id: string; status: string }> }>(
      path.join(DATA_DIR, "agents.json")
    );
    const agent = agentsData?.agents.find((a) => a.id === message.to);
    if (!agent) {
      return NextResponse.json({ error: `Agent '${message.to}' not found` }, { status: 404 });
    }

    // 4. Generate a run ID so the script creates a tracked respond-run
    const runId = `rr_${Date.now()}`;

    // 5. Spawn the inbox-respond runner as a detached process
    const cwd = process.cwd();
    const scriptPath = path.resolve(cwd, "scripts", "daemon", "run-inbox-respond.ts");

    try {
      const child = spawn(process.execPath, [
        "--import", "tsx",
        scriptPath,
        messageId,
        "--run-id", runId,
      ], {
        cwd,
        detached: true,
        stdio: "ignore",
        shell: false,
      });

      child.unref();

      return NextResponse.json({
        messageId,
        agentId: message.to,
        runId,
        pid: child.pid ?? 0,
        message: `Auto-respond triggered for agent '${message.to}'`,
      });
    } catch (err) {
      return NextResponse.json(
        { error: `Failed to spawn: ${err instanceof Error ? err.message : String(err)}` },
        { status: 500 }
      );
    }
  } catch (err) {
    // Top-level catch — prevents Next.js from returning an HTML error page
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
