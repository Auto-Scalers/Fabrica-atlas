import { readFileSync, existsSync } from "fs";
import path from "path";
import { logger } from "./logger";
import { fenceTaskData, enforcePromptLimit } from "./security";
import type { ProjectRunsFile, ProjectRunTaskEntry } from "./types";

// Paths relative to mission-control/
const DATA_DIR = path.resolve(__dirname, "../../data");
const FIELD_OPS_DIR = path.join(DATA_DIR, "field-ops");
const WORKSPACE_ROOT = path.resolve(__dirname, "../../..");
const COMMANDS_DIR = path.join(WORKSPACE_ROOT, ".claude", "commands");

// ─── Data Types (lightweight, no import from src/) ───────────────────────────

interface AgentDef {
  id: string;
  name: string;
  description: string;
  instructions: string;
  capabilities: string[];
  skillIds: string[];
  status: string;
}

interface SkillDef {
  id: string;
  name: string;
  content: string;
  agentIds: string[];
}

interface TaskDef {
  id: string;
  title: string;
  description: string;
  importance: string;
  urgency: string;
  kanban: string;
  assignedTo: string | null;
  projectId: string | null;
  collaborators: string[];
  subtasks: Array<{ id: string; title: string; done: boolean }>;
  acceptanceCriteria: string[];
  notes: string;
  estimatedMinutes: number | null;
}

// ─── Data Reading ────────────────────────────────────────────────────────────

function readJSON<T>(filename: string): T {
  const filePath = path.join(DATA_DIR, filename);
  const raw = readFileSync(filePath, "utf-8");
  return JSON.parse(raw) as T;
}

function getAgent(agentId: string): AgentDef | null {
  const data = readJSON<{ agents: AgentDef[] }>("agents.json");
  return data.agents.find(a => a.id === agentId) ?? null;
}

function getLinkedSkills(agent: AgentDef): SkillDef[] {
  const data = readJSON<{ skills: SkillDef[] }>("skills-library.json");
  const seen = new Set<string>();
  const result: SkillDef[] = [];

  for (const skill of data.skills) {
    const linkedByAgent = agent.skillIds.includes(skill.id);
    const linkedBySkill = skill.agentIds.includes(agent.id);
    if ((linkedByAgent || linkedBySkill) && !seen.has(skill.id)) {
      seen.add(skill.id);
      result.push(skill);
    }
  }

  return result;
}

// ─── Prompt Construction ─────────────────────────────────────────────────────

/**
 * Build a full agent persona prompt (mirrors generateAgentCommandMarkdown from sync-commands.ts)
 */
function buildAgentPersona(agent: AgentDef, skills: SkillDef[]): string {
  const lines: string[] = [];

  lines.push(`You are acting as a ${agent.name} — ${agent.description}.`);
  lines.push("");

  if (agent.instructions) {
    lines.push("## Your Instructions");
    lines.push(agent.instructions);
    lines.push("");
  }

  if (agent.capabilities.length > 0) {
    lines.push("## Your Capabilities");
    for (const cap of agent.capabilities) {
      lines.push(`- ${cap}`);
    }
    lines.push("");
  }

  if (skills.length > 0) {
    lines.push("## Your Skills");
    lines.push("");
    for (const skill of skills) {
      lines.push(`### ${skill.name}`);
      lines.push(skill.content);
      lines.push("");
    }
  }

  return lines.join("\n");
}

/**
 * Build the task-specific instructions section
 */
function buildTaskInstructions(task: TaskDef): string {
  const lines: string[] = [];

  lines.push(`## Your Current Task`);
  lines.push("");
  lines.push(`**Title:** ${task.title}`);
  lines.push(`**Task ID:** ${task.id}`);
  lines.push(`**Priority:** ${task.importance} / ${task.urgency}`);

  if (task.description) {
    lines.push("");
    lines.push("**Description:**");
    lines.push(task.description);
  }

  if (task.subtasks.length > 0) {
    lines.push("");
    lines.push("**Subtasks:**");
    for (const sub of task.subtasks) {
      lines.push(`- [${sub.done ? "x" : " "}] ${sub.title}`);
    }
  }

  if (task.acceptanceCriteria.length > 0) {
    lines.push("");
    lines.push("**Acceptance Criteria (Definition of Done):**");
    for (const criteria of task.acceptanceCriteria) {
      lines.push(`- ${criteria}`);
    }
  }

  if (task.notes) {
    lines.push("");
    lines.push("**Notes:**");
    lines.push(task.notes);
  }

  if (task.estimatedMinutes) {
    lines.push("");
    lines.push(`**Estimated time:** ${task.estimatedMinutes} minutes`);
  }

  return lines.join("\n");
}

/**
 * Build the standard operating procedures section
 */
function buildSOP(agentId: string, task: TaskDef): string {
  const lines = [
    "## Standard Operating Procedures",
    "",
    "You MUST follow these steps:",
    "1. Read `mission-control/data/ai-context.md` for current state",
    `2. Check inbox for messages addressed to you: filter \`to: "${agentId}"\``,
    "3. Execute the work described in the task",
    "4. When done, write a clear summary of what was accomplished, results, and any follow-up needed",
    "",
    "**IMPORTANT — Do NOT perform bookkeeping yourself.** The system automatically:",
    "- Marks the task as done in tasks.json",
    "- Posts your completion report to inbox.json (using your summary output)",
    "- Logs the activity event to activity-log.json",
    "- Regenerates ai-context.md",
    "",
    "Do NOT change the task's kanban status, completedAt, or other top-level fields.",
    "Do NOT write to inbox.json or activity-log.json.",
    "Do NOT run `pnpm gen:context`. Focus entirely on executing the task.",
  ];

  if (task.subtasks.length > 0) {
    lines.push("");
    lines.push("## Subtask Progress Tracking");
    lines.push("");
    lines.push("As you complete each subtask, update its `done` field to `true` in `mission-control/data/tasks.json`.");
    lines.push("This lets the dashboard show real-time progress to the user.");
    lines.push("");
    lines.push("To update a subtask:");
    lines.push("1. Read `mission-control/data/tasks.json`");
    lines.push(`2. Find the task with id \`${task.id}\``);
    lines.push("3. In its `subtasks` array, set `done: true` for the completed subtask");
    lines.push("4. Update the task's `updatedAt` to the current ISO timestamp");
    lines.push("5. Write the file back with 2-space indentation");
    lines.push("");
    lines.push("Do this IMMEDIATELY after completing each subtask, before moving to the next one.");
    lines.push("Only update `subtasks[].done` and `updatedAt` — do NOT change any other task fields.");
    lines.push("");
    lines.push("**THIS IS REQUIRED** — the user monitors progress in real-time through the dashboard.");
  }

  return lines.join("\n");
}

// ─── Restart & Retry Context ─────────────────────────────────────────────────

/**
 * Build context from previous mission history so the agent understands
 * what has already been accomplished in this mission run.
 */
function buildRestartContext(missionId: string): string | null {
  try {
    const filePath = path.join(DATA_DIR, "missions.json");
    if (!existsSync(filePath)) return null;

    const data = JSON.parse(readFileSync(filePath, "utf-8")) as ProjectRunsFile;
    const projectRun = data.missions.find(m => m.id === missionId);
    if (!projectRun || projectRun.taskHistory.length === 0) return null;

    const lines: string[] = [
      "## Previous Project Run Context",
      "",
      "This task is part of an ongoing project run. Here is what has happened so far:",
      "",
    ];

    // Group by status for clarity
    const completed = projectRun.taskHistory.filter(e => e.status === "completed");
    const failed = projectRun.taskHistory.filter(e => e.status !== "completed");

    if (completed.length > 0) {
      lines.push("**Completed tasks:**");
      for (const entry of completed) {
        lines.push(`- ✅ ${entry.taskTitle} (by ${entry.agentId}): ${entry.summary.slice(0, 150)}`);
      }
      lines.push("");
    }

    if (failed.length > 0) {
      lines.push("**Failed/timed-out tasks:**");
      for (const entry of failed) {
        lines.push(`- ❌ ${entry.taskTitle} (${entry.status}, attempt ${entry.attempt}): ${entry.summary.slice(0, 150)}`);
      }
      lines.push("");
    }

    lines.push(`**Run progress:** ${projectRun.completedTasks} completed, ${projectRun.failedTasks} failed out of ${projectRun.totalTasks} total.`);
    lines.push("");
    lines.push("Use this context to avoid duplicating work that was already done and to build upon completed results.");

    return lines.join("\n");
  } catch (err) {
    logger.warn("prompt-builder", `Failed to build restart context for mission ${missionId}: ${err instanceof Error ? err.message : String(err)}`);
    return null;
  }
}

/**
 * Build retry context when a task is being retried after a user decision.
 * Checks decisions.json for answered decisions related to this task and
 * injects the user's guidance into the prompt.
 */
function buildRetryContext(taskId: string): string | null {
  try {
    const filePath = path.join(DATA_DIR, "decisions.json");
    if (!existsSync(filePath)) return null;

    interface DecisionRecord {
      id: string;
      taskId: string | null;
      status: string;
      question: string;
      answer: string | null;
      context: string;
      answeredAt: string | null;
    }

    const data = JSON.parse(readFileSync(filePath, "utf-8")) as { decisions: DecisionRecord[] };

    // Find answered decisions for this task, sorted by most recent
    const answered = data.decisions
      .filter(d => d.taskId === taskId && d.status === "answered" && d.answer)
      .sort((a, b) => {
        const ta = a.answeredAt ? new Date(a.answeredAt).getTime() : 0;
        const tb = b.answeredAt ? new Date(b.answeredAt).getTime() : 0;
        return tb - ta;
      });

    if (answered.length === 0) return null;

    const latest = answered[0];
    const lines: string[] = [
      "## ⚠️ Retry Instructions — Read Carefully",
      "",
      "**This task has been attempted before and failed.** The user has reviewed the situation and provided guidance:",
      "",
      `**User's decision:** ${latest.answer}`,
      "",
    ];

    if (latest.context) {
      lines.push(`**Previous failure context:** ${latest.context.slice(0, 300)}`);
      lines.push("");
    }

    lines.push("You MUST take a DIFFERENT approach than what was tried before.");
    lines.push("Do NOT repeat the same steps that led to failure.");
    lines.push("If the user said to try a different approach, think creatively about alternative solutions.");

    return lines.join("\n");
  } catch (err) {
    logger.warn("prompt-builder", `Failed to build retry context for task ${taskId}: ${err instanceof Error ? err.message : String(err)}`);
    return null;
  }
}

// ─── Field Ops Context ──────────────────────────────────────────────────────

interface FieldServiceDef {
  id: string;
  name: string;
  status: string;
}

interface FieldMissionDef {
  id: string;
  title: string;
  status: string;
  linkedProjectId: string | null;
}

interface FieldTaskDef {
  id: string;
  missionId: string | null;
  title: string;
  type: string;
  status: string;
  serviceId: string | null;
  assignedTo: string | null;
  result: Record<string, unknown>;
  linkedTaskId: string | null;
  completedAt: string | null;
}

function readFieldOpsJSON<T>(filename: string): T | null {
  try {
    const filePath = path.join(FIELD_OPS_DIR, filename);
    if (!existsSync(filePath)) return null;
    const raw = readFileSync(filePath, "utf-8");
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

/**
 * Build Field Ops context for agents that have the skill_field_ops skill.
 * Provides a compact summary of connected services, active missions,
 * pending approvals, and recent results — so agents can create field tasks
 * and reference execution outcomes.
 */
function buildFieldOpsContext(agentId: string, task: TaskDef): string | null {
  // Only inject if field-ops directory exists
  if (!existsSync(FIELD_OPS_DIR)) return null;

  const services = readFieldOpsJSON<{ services: FieldServiceDef[] }>("services.json");
  const missions = readFieldOpsJSON<{ missions: FieldMissionDef[] }>("missions.json");
  const fieldTasks = readFieldOpsJSON<{ tasks: FieldTaskDef[] }>("tasks.json");

  // Don't inject if there's no field ops data at all
  if (!services && !missions && !fieldTasks) return null;

  const lines: string[] = [
    "## Field Ops Status (Live)",
    "",
  ];

  // Connected services
  if (services?.services && services.services.length > 0) {
    const serviceList = services.services.map(
      s => `${s.name} (${s.status})`
    ).join(", ");
    lines.push(`**Connected Services:** ${serviceList}`);
  } else {
    lines.push("**Connected Services:** None");
  }

  // Active missions
  if (missions?.missions) {
    const active = missions.missions.filter(m => m.status === "active");
    if (active.length > 0) {
      lines.push(`**Active Missions:** ${active.length}`);
      for (const m of active.slice(0, 5)) {
        lines.push(`- ${m.title} (${m.id})`);
      }
    }
  }

  // Field tasks relevant to this agent or linked to this task
  if (fieldTasks?.tasks && fieldTasks.tasks.length > 0) {
    const allFieldTasks = fieldTasks.tasks;

    // Tasks pending approval
    const pending = allFieldTasks.filter(t => t.status === "pending-approval");
    if (pending.length > 0) {
      lines.push("");
      lines.push(`**Awaiting Approval:** ${pending.length} task(s)`);
      for (const t of pending.slice(0, 5)) {
        lines.push(`- "${t.title}" (${t.id}, ${t.type})`);
      }
    }

    // Tasks assigned to this agent
    const myTasks = allFieldTasks.filter(t => t.assignedTo === agentId && t.status !== "completed" && t.status !== "failed");
    if (myTasks.length > 0) {
      lines.push("");
      lines.push(`**Your Field Tasks:** ${myTasks.length}`);
      for (const t of myTasks.slice(0, 5)) {
        lines.push(`- "${t.title}" — ${t.status} (${t.id})`);
      }
    }

    // Tasks linked to the current regular task
    const linkedTasks = allFieldTasks.filter(t => t.linkedTaskId === task.id);
    if (linkedTasks.length > 0) {
      lines.push("");
      lines.push(`**Field Tasks Linked to This Task:**`);
      for (const t of linkedTasks) {
        const resultSummary = t.status === "completed" && t.result
          ? ` — result: ${JSON.stringify(t.result).slice(0, 100)}`
          : "";
        lines.push(`- "${t.title}" — ${t.status} (${t.id})${resultSummary}`);
      }
    }

    // Recent completions (last 5)
    const recent = allFieldTasks
      .filter(t => t.status === "completed" || t.status === "failed")
      .sort((a, b) => (b.completedAt ?? "").localeCompare(a.completedAt ?? ""))
      .slice(0, 5);

    if (recent.length > 0) {
      lines.push("");
      lines.push("**Recent Executions:**");
      for (const t of recent) {
        const icon = t.status === "completed" ? "✅" : "❌";
        const resultSnippet = t.result
          ? ` — ${JSON.stringify(t.result).slice(0, 80)}`
          : "";
        lines.push(`- ${icon} "${t.title}" (${t.type})${resultSnippet}`);
      }
    }
  }

  return lines.join("\n");
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Build the complete prompt for a task assignment.
 * Agent persona + fenced task data + SOP instructions.
 * If missionId is provided, injects restart context (mission history) and retry context (user decisions).
 */
export function buildTaskPrompt(agentId: string, task: TaskDef, missionId?: string): string {
  const agent = getAgent(agentId);
  if (!agent) {
    throw new Error(`Agent not found: ${agentId}`);
  }

  const skills = getLinkedSkills(agent);
  const persona = buildAgentPersona(agent, skills);
  const taskInstructions = fenceTaskData(buildTaskInstructions(task));
  const sop = buildSOP(agentId, task);

  const sections: string[] = [persona];

  // Inject Field Ops context for agents with the field_ops skill
  const hasFieldOpsSkill = skills.some(s => s.id === "skill_field_ops") || agent.skillIds.includes("skill_field_ops");
  if (hasFieldOpsSkill) {
    const fieldOpsCtx = buildFieldOpsContext(agentId, task);
    if (fieldOpsCtx) sections.push(fieldOpsCtx);
  }

  // Inject mission restart context (what has been done previously)
  if (missionId) {
    const restartCtx = buildRestartContext(missionId);
    if (restartCtx) sections.push(restartCtx);
  }

  // Inject retry context (user guidance from decisions)
  const retryCtx = buildRetryContext(task.id);
  if (retryCtx) sections.push(retryCtx);

  sections.push(taskInstructions, sop);

  const fullPrompt = sections.join("\n\n");
  return enforcePromptLimit(fullPrompt);
}

/**
 * Build a prompt for a scheduled command (daily-plan, standup, etc.).
 * Reads the command file from .claude/commands/<command>/user.md.
 */
export function buildScheduledPrompt(command: string): string {
  const cmdFile = path.join(COMMANDS_DIR, command, "user.md");

  if (existsSync(cmdFile)) {
    const content = readFileSync(cmdFile, "utf-8");
    return enforcePromptLimit(content);
  }

  // Fallback: generic prompt
  logger.warn("prompt-builder", `No command file found for /${command}, using generic prompt`);
  return `Run the /${command} workflow. Read mission-control/data/ai-context.md first for context.`;
}

/**
 * Read a task by ID from tasks.json
 */
export function getTask(taskId: string): TaskDef | null {
  const data = readJSON<{ tasks: TaskDef[] }>("tasks.json");
  return data.tasks.find(t => t.id === taskId) ?? null;
}

/**
 * Get all pending tasks sorted by Eisenhower priority
 */
export function getPendingTasks(): TaskDef[] {
  const data = readJSON<{ tasks: TaskDef[] }>("tasks.json");

  const pending = data.tasks.filter(t =>
    t.kanban === "not-started" &&
    t.assignedTo !== null &&
    t.assignedTo !== "me"
  );

  // Sort by Eisenhower quadrant: DO > SCHEDULE > DELEGATE > ELIMINATE
  const priorityMap: Record<string, number> = {
    "important-urgent": 0,
    "important-not-urgent": 1,
    "not-important-urgent": 2,
    "not-important-not-urgent": 3,
  };

  pending.sort((a, b) => {
    const pa = priorityMap[`${a.importance}-${a.urgency}`] ?? 3;
    const pb = priorityMap[`${b.importance}-${b.urgency}`] ?? 3;
    return pa - pb;
  });

  return pending;
}

/**
 * Check if a task is unblocked (all blockedBy tasks are done)
 */
export function isTaskUnblocked(task: TaskDef & { blockedBy: string[] }): boolean {
  if (!task.blockedBy || task.blockedBy.length === 0) return true;

  const allTasks = readJSON<{ tasks: Array<{ id: string; kanban: string }> }>("tasks.json");
  return task.blockedBy.every(blockerId => {
    const blocker = allTasks.tasks.find(t => t.id === blockerId);
    return blocker?.kanban === "done";
  });
}

/**
 * Check if a task has a pending decision that blocks execution
 */
export function hasPendingDecision(taskId: string): boolean {
  const decisions = readJSON<{ decisions: Array<{ taskId: string | null; status: string }> }>("decisions.json");
  return decisions.decisions.some(d => d.taskId === taskId && d.status === "pending");
}
