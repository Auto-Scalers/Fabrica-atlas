import { NextResponse } from "next/server";

// ─── GET: Server mode detection (PM2 vs terminal) ───────────────────────────

export async function GET() {
  const isPm2 = process.env.pm_id !== undefined;
  const uptimeSeconds = Math.floor(process.uptime());

  return NextResponse.json({
    mode: isPm2 ? "pm2" : "terminal",
    uptimeSeconds,
    pid: process.pid,
  });
}
