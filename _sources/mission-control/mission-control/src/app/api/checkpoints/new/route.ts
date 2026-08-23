import { NextResponse } from "next/server";
import {
  saveTasks,
  saveGoals,
  saveProjects,
  saveBrainDump,
  saveInbox,
  saveDecisions,
  saveAgents,
  saveSkillsLibrary,
  saveActivityLog,
} from "@/lib/data";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

// Default agents for a fresh workspace (the 5 built-in roles)
const DEFAULT_AGENTS = [
  {
    id: "me",
    name: "Me",
    icon: "User",
    description: "Tasks I handle myself — decisions, approvals, creative direction",
    instructions: "",
    capabilities: ["decisions", "approvals", "creative-direction"],
    skillIds: [],
    status: "active" as const,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "researcher",
    name: "Researcher",
    icon: "Search",
    description: "Market research, competitive analysis, evaluation",
    instructions: "",
    capabilities: ["web-research", "analysis", "evaluation"],
    skillIds: [],
    status: "active" as const,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "developer",
    name: "Developer",
    icon: "Code",
    description: "Code, bug fixes, testing, deployment",
    instructions: "",
    capabilities: ["coding", "testing", "debugging", "deployment"],
    skillIds: [],
    status: "active" as const,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "marketer",
    name: "Marketer",
    icon: "Megaphone",
    description: "Copy, growth strategy, content, SEO",
    instructions: "",
    capabilities: ["copywriting", "seo", "content-strategy", "growth"],
    skillIds: [],
    status: "active" as const,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "business-analyst",
    name: "Business Analyst",
    icon: "BarChart3",
    description: "Strategy, planning, prioritization, financials",
    instructions: "",
    capabilities: ["strategy", "analysis", "planning", "financial-modeling"],
    skillIds: [],
    status: "active" as const,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

// POST /api/checkpoints/new — Create a fresh empty workspace
export async function POST() {
  try {
    await saveTasks({ tasks: [] });
    await saveGoals({ goals: [] });
    await saveProjects({ projects: [] });
    await saveBrainDump({ entries: [] });
    await saveInbox({ messages: [] });
    await saveDecisions({ decisions: [] });
    await saveAgents({ agents: DEFAULT_AGENTS });
    await saveSkillsLibrary({ skills: [] });
    await saveActivityLog({ events: [] });

    // Regenerate AI context in background
    execAsync("pnpm gen:context", { cwd: process.cwd() }).catch(() => {});

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to create new workspace", details: String(err) },
      { status: 500 }
    );
  }
}
