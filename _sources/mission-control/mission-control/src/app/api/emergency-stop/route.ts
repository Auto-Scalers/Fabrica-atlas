import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { mutateFieldMissions, mutateActivityLog } from "@/lib/data";
import { clear as clearVaultSession } from "@/lib/vault-session";
import { addFieldActivityEvent } from "@/lib/field-ops-activity";

export async function POST() {
  const results = {
    daemonStopped: false,
    missionsPaused: 0,
    vaultCleared: false,
    activityLogged: false,
  };

  // 1. Stop the daemon
  try {
    const pidPath = path.join(process.cwd(), "data", "daemon.pid");
    if (fs.existsSync(pidPath)) {
      const raw = fs.readFileSync(pidPath, "utf-8").trim();
      const pid = parseInt(raw, 10);
      if (!isNaN(pid)) {
        try {
          process.kill(pid, 0); // Check if process exists
          process.kill(pid, "SIGTERM");
          results.daemonStopped = true;
        } catch {
          // Process not running — skip gracefully
        }
      }
    }
  } catch {
    // No PID file or read error — skip gracefully
  }

  // 2. Pause all active Field Ops missions
  try {
    const paused = await mutateFieldMissions(async (data) => {
      let count = 0;
      for (const mission of data.missions) {
        if (mission.status === "active") {
          mission.status = "paused";
          mission.updatedAt = new Date().toISOString();
          count++;
        }
      }
      return count;
    });
    results.missionsPaused = paused;
  } catch {
    // Field missions file may not exist — skip gracefully
  }

  // 3. Clear vault session
  try {
    clearVaultSession();
    results.vaultCleared = true;
  } catch {
    // Vault session clear failed — skip gracefully
  }

  // 4. Log the event
  const details = [
    `Daemon ${results.daemonStopped ? "stopped" : "was not running"}`,
    `${results.missionsPaused} active mission(s) paused`,
    `Vault session ${results.vaultCleared ? "cleared" : "clear failed"}`,
  ].join(". ");

  try {
    await addFieldActivityEvent({
      type: "autonomy_changed",
      actor: "me",
      taskId: null,
      serviceId: null,
      summary: "Emergency stop activated",
      details,
    });
  } catch {
    // Field activity log may not exist — skip gracefully
  }

  try {
    await mutateActivityLog(async (data) => {
      data.events.push({
        id: `evt_${Date.now()}`,
        type: "agent_checkin",
        actor: "system",
        taskId: null,
        summary: "Emergency stop activated — all autonomous activity frozen",
        details,
        timestamp: new Date().toISOString(),
      });
    });
    results.activityLogged = true;
  } catch {
    // Activity log write failed — skip gracefully
  }

  return NextResponse.json({ ok: true, results });
}
