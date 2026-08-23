import { readFile, writeFile, readdir, unlink, mkdir } from "fs/promises";
import path from "path";
import { Mutex } from "async-mutex";
import type {
  TasksFile,
  GoalsFile,
  ProjectsFile,
  BrainDumpFile,
  ActivityLogFile,
  InboxFile,
  DecisionsFile,
  AgentsFile,
  SkillsLibraryFile,
  ActiveRunsFile,
  FieldMissionsFile,
  FieldTasksFile,
  FieldOpsServicesFile,
  FieldOpsCredentialsFile,
  FieldOpsActivityLogFile,
  ApprovalConfigFile,
  SafetyLimitsFile,
  ServiceCatalogFile,
  FieldTaskTemplatesFile,
} from "./types";

const DATA_DIR = path.join(process.cwd(), "data");
const CHECKPOINTS_DIR = path.join(DATA_DIR, "checkpoints");
const FIELD_OPS_DIR = path.join(DATA_DIR, "field-ops");

function filePath(name: string): string {
  return path.join(DATA_DIR, name);
}

function fieldOpsPath(name: string): string {
  return path.join(FIELD_OPS_DIR, name);
}

export async function ensureFieldOpsDir(): Promise<void> {
  await mkdir(FIELD_OPS_DIR, { recursive: true });
}

export function getCheckpointsDir(): string {
  return CHECKPOINTS_DIR;
}

export async function ensureCheckpointsDir(): Promise<void> {
  await mkdir(CHECKPOINTS_DIR, { recursive: true });
}

// ─── Checkpoint metadata type ────────────────────────────────────────────────

export interface CheckpointMeta {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  version: number;
  stats: {
    tasks: number;
    projects: number;
    goals: number;
    brainDump: number;
    inbox: number;
    decisions: number;
    agents: number;
    skills: number;
  };
}

export interface CheckpointFile {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  version: number;
  data: {
    tasks: TasksFile;
    goals: GoalsFile;
    projects: ProjectsFile;
    brainDump: BrainDumpFile;
    inbox: InboxFile;
    decisions: DecisionsFile;
    agents: AgentsFile;
    skillsLibrary: SkillsLibraryFile;
  };
}

// ─── Bulk checkpoint helpers ─────────────────────────────────────────────────

export async function getAllCoreData(): Promise<CheckpointFile["data"]> {
  const [tasks, goals, projects, brainDump, inbox, decisions, agents, skillsLibrary] =
    await Promise.all([
      getTasks(),
      getGoals(),
      getProjects(),
      getBrainDump(),
      getInbox(),
      getDecisions(),
      getAgents(),
      getSkillsLibrary(),
    ]);
  return { tasks, goals, projects, brainDump, inbox, decisions, agents, skillsLibrary };
}

export async function loadCoreData(data: CheckpointFile["data"]): Promise<void> {
  // Write sequentially to avoid overwhelming mutexes
  await saveTasks(data.tasks);
  await saveGoals(data.goals);
  await saveProjects(data.projects);
  await saveBrainDump(data.brainDump);
  await saveInbox(data.inbox);
  await saveDecisions(data.decisions);
  await saveAgents(data.agents);
  await saveSkillsLibrary(data.skillsLibrary);
  // Reset activity log to empty
  await saveActivityLog({ events: [] });
}

// ─── Checkpoint CRUD helpers ─────────────────────────────────────────────────

export async function listCheckpoints(): Promise<CheckpointMeta[]> {
  await ensureCheckpointsDir();
  const files = await readdir(CHECKPOINTS_DIR);
  const jsonFiles = files.filter((f) => f.endsWith(".json"));
  const metas: CheckpointMeta[] = [];
  for (const file of jsonFiles) {
    try {
      const raw = await readFile(path.join(CHECKPOINTS_DIR, file), "utf-8");
      const snap = JSON.parse(raw) as CheckpointFile;
      metas.push({
        id: snap.id,
        name: snap.name,
        description: snap.description,
        createdAt: snap.createdAt,
        version: snap.version,
        stats: {
          tasks: snap.data.tasks.tasks.length,
          projects: snap.data.projects.projects.length,
          goals: snap.data.goals.goals.length,
          brainDump: snap.data.brainDump.entries.length,
          inbox: snap.data.inbox.messages.length,
          decisions: snap.data.decisions.decisions.length,
          agents: snap.data.agents.agents.length,
          skills: snap.data.skillsLibrary.skills.length,
        },
      });
    } catch {
      // Skip malformed checkpoint files
    }
  }
  return metas.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function getCheckpoint(id: string): Promise<CheckpointFile> {
  const raw = await readFile(path.join(CHECKPOINTS_DIR, `${id}.json`), "utf-8");
  return JSON.parse(raw) as CheckpointFile;
}

export async function saveCheckpoint(snap: CheckpointFile): Promise<void> {
  await ensureCheckpointsDir();
  await writeFile(path.join(CHECKPOINTS_DIR, `${snap.id}.json`), JSON.stringify(snap, null, 2), "utf-8");
}

export async function deleteCheckpoint(id: string): Promise<void> {
  await unlink(path.join(CHECKPOINTS_DIR, `${id}.json`));
}

// ─── Internal write helper (no mutex — caller must hold the lock) ────────────

async function _writeJson(name: string, data: unknown): Promise<void> {
  await writeFile(filePath(name), JSON.stringify(data, null, 2), "utf-8");
}

// ─── Per-file mutexes for concurrent write safety ─────────────────────────────

const fileMutexes = {
  tasks: new Mutex(),
  tasksArchive: new Mutex(),
  goals: new Mutex(),
  projects: new Mutex(),
  brainDump: new Mutex(),
  activityLog: new Mutex(),
  inbox: new Mutex(),
  decisions: new Mutex(),
  agents: new Mutex(),
  skillsLibrary: new Mutex(),
  activeRuns: new Mutex(),
  daemonConfig: new Mutex(),
  fieldMissions: new Mutex(),
  fieldTasks: new Mutex(),
  fieldServices: new Mutex(),
  fieldCredentials: new Mutex(),
  fieldActivityLog: new Mutex(),
  approvalConfig: new Mutex(),
  fieldTemplates: new Mutex(),
  safetyLimits: new Mutex(),
};

// ─── Read functions (no locking needed — reads are safe) ──────────────────────

export async function getTasks(): Promise<TasksFile> {
  try {
    const raw = await readFile(filePath("tasks.json"), "utf-8");
    return JSON.parse(raw) as TasksFile;
  } catch {
    return { tasks: [] };
  }
}

export async function getTasksArchive(): Promise<TasksFile> {
  try {
    const raw = await readFile(filePath("tasks-archive.json"), "utf-8");
    return JSON.parse(raw) as TasksFile;
  } catch {
    return { tasks: [] };
  }
}

export async function getGoals(): Promise<GoalsFile> {
  try {
    const raw = await readFile(filePath("goals.json"), "utf-8");
    return JSON.parse(raw) as GoalsFile;
  } catch {
    return { goals: [] };
  }
}

export async function getProjects(): Promise<ProjectsFile> {
  try {
    const raw = await readFile(filePath("projects.json"), "utf-8");
    return JSON.parse(raw) as ProjectsFile;
  } catch {
    return { projects: [] };
  }
}

export async function getBrainDump(): Promise<BrainDumpFile> {
  try {
    const raw = await readFile(filePath("brain-dump.json"), "utf-8");
    return JSON.parse(raw) as BrainDumpFile;
  } catch {
    return { entries: [] };
  }
}

export async function getActivityLog(): Promise<ActivityLogFile> {
  try {
    const raw = await readFile(filePath("activity-log.json"), "utf-8");
    return JSON.parse(raw) as ActivityLogFile;
  } catch {
    return { events: [] };
  }
}

export async function getInbox(): Promise<InboxFile> {
  try {
    const raw = await readFile(filePath("inbox.json"), "utf-8");
    return JSON.parse(raw) as InboxFile;
  } catch {
    return { messages: [] };
  }
}

export async function getDecisions(): Promise<DecisionsFile> {
  try {
    const raw = await readFile(filePath("decisions.json"), "utf-8");
    return JSON.parse(raw) as DecisionsFile;
  } catch {
    return { decisions: [] };
  }
}

export async function getAgents(): Promise<AgentsFile> {
  try {
    const raw = await readFile(filePath("agents.json"), "utf-8");
    return JSON.parse(raw) as AgentsFile;
  } catch {
    return { agents: [] };
  }
}

export async function getSkillsLibrary(): Promise<SkillsLibraryFile> {
  try {
    const raw = await readFile(filePath("skills-library.json"), "utf-8");
    return JSON.parse(raw) as SkillsLibraryFile;
  } catch {
    return { skills: [] };
  }
}

export async function getActiveRuns(): Promise<ActiveRunsFile> {
  try {
    const raw = await readFile(filePath("active-runs.json"), "utf-8");
    return JSON.parse(raw) as ActiveRunsFile;
  } catch {
    return { runs: [] };
  }
}

export async function getDaemonConfig(): Promise<Record<string, unknown>> {
  try {
    const raw = await readFile(filePath("daemon-config.json"), "utf-8");
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return {};
  }
}

// ─── Save functions (mutex-protected to prevent concurrent write corruption) ──

export async function saveTasks(data: TasksFile): Promise<void> {
  await fileMutexes.tasks.runExclusive(async () => {
    await _writeJson("tasks.json", data);
  });
}

export async function saveTasksArchive(data: TasksFile): Promise<void> {
  await fileMutexes.tasksArchive.runExclusive(async () => {
    await _writeJson("tasks-archive.json", data);
  });
}

export async function saveGoals(data: GoalsFile): Promise<void> {
  await fileMutexes.goals.runExclusive(async () => {
    await _writeJson("goals.json", data);
  });
}

export async function saveProjects(data: ProjectsFile): Promise<void> {
  await fileMutexes.projects.runExclusive(async () => {
    await _writeJson("projects.json", data);
  });
}

export async function saveBrainDump(data: BrainDumpFile): Promise<void> {
  await fileMutexes.brainDump.runExclusive(async () => {
    await _writeJson("brain-dump.json", data);
  });
}

export async function saveActivityLog(data: ActivityLogFile): Promise<void> {
  await fileMutexes.activityLog.runExclusive(async () => {
    await _writeJson("activity-log.json", data);
  });
}

export async function saveInbox(data: InboxFile): Promise<void> {
  await fileMutexes.inbox.runExclusive(async () => {
    await _writeJson("inbox.json", data);
  });
}

export async function saveDecisions(data: DecisionsFile): Promise<void> {
  await fileMutexes.decisions.runExclusive(async () => {
    await _writeJson("decisions.json", data);
  });
}

export async function saveAgents(data: AgentsFile): Promise<void> {
  await fileMutexes.agents.runExclusive(async () => {
    await _writeJson("agents.json", data);
  });
}

export async function saveSkillsLibrary(data: SkillsLibraryFile): Promise<void> {
  await fileMutexes.skillsLibrary.runExclusive(async () => {
    await _writeJson("skills-library.json", data);
  });
}

export async function saveActiveRuns(data: ActiveRunsFile): Promise<void> {
  await fileMutexes.activeRuns.runExclusive(async () => {
    await _writeJson("active-runs.json", data);
  });
}

// ─── Atomic read-modify-write helpers (legacy — read-only inside lock) ────────
// NOTE: These do NOT write back. Calling save*() inside these will DEADLOCK
// (async-mutex is not reentrant). Use mutate*() below for mutations instead.

export async function withTasks<T>(fn: (data: TasksFile) => Promise<T>): Promise<T> {
  return fileMutexes.tasks.runExclusive(async () => {
    const data = await getTasks();
    return fn(data);
  });
}

export async function withTasksArchive<T>(fn: (data: TasksFile) => Promise<T>): Promise<T> {
  return fileMutexes.tasksArchive.runExclusive(async () => {
    const data = await getTasksArchive();
    return fn(data);
  });
}

export async function withGoals<T>(fn: (data: GoalsFile) => Promise<T>): Promise<T> {
  return fileMutexes.goals.runExclusive(async () => {
    const data = await getGoals();
    return fn(data);
  });
}

export async function withProjects<T>(fn: (data: ProjectsFile) => Promise<T>): Promise<T> {
  return fileMutexes.projects.runExclusive(async () => {
    const data = await getProjects();
    return fn(data);
  });
}

export async function withBrainDump<T>(fn: (data: BrainDumpFile) => Promise<T>): Promise<T> {
  return fileMutexes.brainDump.runExclusive(async () => {
    const data = await getBrainDump();
    return fn(data);
  });
}

export async function withActivityLog<T>(fn: (data: ActivityLogFile) => Promise<T>): Promise<T> {
  return fileMutexes.activityLog.runExclusive(async () => {
    const data = await getActivityLog();
    return fn(data);
  });
}

export async function withInbox<T>(fn: (data: InboxFile) => Promise<T>): Promise<T> {
  return fileMutexes.inbox.runExclusive(async () => {
    const data = await getInbox();
    return fn(data);
  });
}

export async function withDecisions<T>(fn: (data: DecisionsFile) => Promise<T>): Promise<T> {
  return fileMutexes.decisions.runExclusive(async () => {
    const data = await getDecisions();
    return fn(data);
  });
}

export async function withAgents<T>(fn: (data: AgentsFile) => Promise<T>): Promise<T> {
  return fileMutexes.agents.runExclusive(async () => {
    const data = await getAgents();
    return fn(data);
  });
}

export async function withSkillsLibrary<T>(fn: (data: SkillsLibraryFile) => Promise<T>): Promise<T> {
  return fileMutexes.skillsLibrary.runExclusive(async () => {
    const data = await getSkillsLibrary();
    return fn(data);
  });
}

export async function withActiveRuns<T>(fn: (data: ActiveRunsFile) => Promise<T>): Promise<T> {
  return fileMutexes.activeRuns.runExclusive(async () => {
    const data = await getActiveRuns();
    return fn(data);
  });
}

// ─── Atomic mutate helpers (lock → read → callback → auto-write → unlock) ────
// Use these for ALL mutation operations. The callback mutates `data` in place,
// and the file is automatically written after the callback returns.
// If the callback throws, the file is NOT written (implicit rollback).

export async function mutateTasks<T>(fn: (data: TasksFile) => Promise<T>): Promise<T> {
  return fileMutexes.tasks.runExclusive(async () => {
    const raw = await readFile(filePath("tasks.json"), "utf-8");
    const data = JSON.parse(raw) as TasksFile;
    const result = await fn(data);
    await _writeJson("tasks.json", data);
    return result;
  });
}

export async function mutateTasksArchive<T>(fn: (data: TasksFile) => Promise<T>): Promise<T> {
  return fileMutexes.tasksArchive.runExclusive(async () => {
    let data: TasksFile;
    try {
      const raw = await readFile(filePath("tasks-archive.json"), "utf-8");
      data = JSON.parse(raw) as TasksFile;
    } catch {
      data = { tasks: [] };
    }
    const result = await fn(data);
    await _writeJson("tasks-archive.json", data);
    return result;
  });
}

export async function mutateGoals<T>(fn: (data: GoalsFile) => Promise<T>): Promise<T> {
  return fileMutexes.goals.runExclusive(async () => {
    const raw = await readFile(filePath("goals.json"), "utf-8");
    const data = JSON.parse(raw) as GoalsFile;
    const result = await fn(data);
    await _writeJson("goals.json", data);
    return result;
  });
}

export async function mutateProjects<T>(fn: (data: ProjectsFile) => Promise<T>): Promise<T> {
  return fileMutexes.projects.runExclusive(async () => {
    const raw = await readFile(filePath("projects.json"), "utf-8");
    const data = JSON.parse(raw) as ProjectsFile;
    const result = await fn(data);
    await _writeJson("projects.json", data);
    return result;
  });
}

export async function mutateBrainDump<T>(fn: (data: BrainDumpFile) => Promise<T>): Promise<T> {
  return fileMutexes.brainDump.runExclusive(async () => {
    const raw = await readFile(filePath("brain-dump.json"), "utf-8");
    const data = JSON.parse(raw) as BrainDumpFile;
    const result = await fn(data);
    await _writeJson("brain-dump.json", data);
    return result;
  });
}

export async function mutateInbox<T>(fn: (data: InboxFile) => Promise<T>): Promise<T> {
  return fileMutexes.inbox.runExclusive(async () => {
    const raw = await readFile(filePath("inbox.json"), "utf-8");
    const data = JSON.parse(raw) as InboxFile;
    const result = await fn(data);
    await _writeJson("inbox.json", data);
    return result;
  });
}

export async function mutateDecisions<T>(fn: (data: DecisionsFile) => Promise<T>): Promise<T> {
  return fileMutexes.decisions.runExclusive(async () => {
    const raw = await readFile(filePath("decisions.json"), "utf-8");
    const data = JSON.parse(raw) as DecisionsFile;
    const result = await fn(data);
    await _writeJson("decisions.json", data);
    return result;
  });
}

export async function mutateActivityLog<T>(fn: (data: ActivityLogFile) => Promise<T>): Promise<T> {
  return fileMutexes.activityLog.runExclusive(async () => {
    const raw = await readFile(filePath("activity-log.json"), "utf-8");
    const data = JSON.parse(raw) as ActivityLogFile;
    const result = await fn(data);
    await _writeJson("activity-log.json", data);
    return result;
  });
}

export async function mutateAgents<T>(fn: (data: AgentsFile) => Promise<T>): Promise<T> {
  return fileMutexes.agents.runExclusive(async () => {
    let data: AgentsFile;
    try {
      const raw = await readFile(filePath("agents.json"), "utf-8");
      data = JSON.parse(raw) as AgentsFile;
    } catch {
      data = { agents: [] };
    }
    const result = await fn(data);
    await _writeJson("agents.json", data);
    return result;
  });
}

export async function mutateSkillsLibrary<T>(fn: (data: SkillsLibraryFile) => Promise<T>): Promise<T> {
  return fileMutexes.skillsLibrary.runExclusive(async () => {
    let data: SkillsLibraryFile;
    try {
      const raw = await readFile(filePath("skills-library.json"), "utf-8");
      data = JSON.parse(raw) as SkillsLibraryFile;
    } catch {
      data = { skills: [] };
    }
    const result = await fn(data);
    await _writeJson("skills-library.json", data);
    return result;
  });
}

export async function mutateActiveRuns<T>(fn: (data: ActiveRunsFile) => Promise<T>): Promise<T> {
  return fileMutexes.activeRuns.runExclusive(async () => {
    let data: ActiveRunsFile;
    try {
      const raw = await readFile(filePath("active-runs.json"), "utf-8");
      data = JSON.parse(raw) as ActiveRunsFile;
    } catch {
      data = { runs: [] };
    }
    const result = await fn(data);
    await _writeJson("active-runs.json", data);
    return result;
  });
}

export async function mutateDaemonConfig<T>(fn: (data: Record<string, unknown>) => Promise<T>): Promise<T> {
  return fileMutexes.daemonConfig.runExclusive(async () => {
    let data: Record<string, unknown>;
    try {
      const raw = await readFile(filePath("daemon-config.json"), "utf-8");
      data = JSON.parse(raw) as Record<string, unknown>;
    } catch {
      data = {};
    }
    const result = await fn(data);
    await _writeJson("daemon-config.json", data);
    return result;
  });
}

// ─── Field Ops: Internal write helper ─────────────────────────────────────────

async function _writeFieldOpsJson(name: string, data: unknown): Promise<void> {
  await ensureFieldOpsDir();
  await writeFile(fieldOpsPath(name), JSON.stringify(data, null, 2), "utf-8");
}

// ─── Field Ops: Read functions ────────────────────────────────────────────────

export async function getFieldMissions(): Promise<FieldMissionsFile> {
  try {
    const raw = await readFile(fieldOpsPath("missions.json"), "utf-8");
    return JSON.parse(raw) as FieldMissionsFile;
  } catch {
    return { missions: [] };
  }
}

export async function getFieldTasks(): Promise<FieldTasksFile> {
  try {
    const raw = await readFile(fieldOpsPath("tasks.json"), "utf-8");
    return JSON.parse(raw) as FieldTasksFile;
  } catch {
    return { tasks: [] };
  }
}

export async function getServiceCatalog(): Promise<ServiceCatalogFile> {
  try {
    const raw = await readFile(fieldOpsPath("service-catalog.json"), "utf-8");
    return JSON.parse(raw) as ServiceCatalogFile;
  } catch {
    return { version: "1.0.0", lastUpdated: "", services: [] };
  }
}

export async function getFieldServices(): Promise<FieldOpsServicesFile> {
  try {
    const raw = await readFile(fieldOpsPath("services.json"), "utf-8");
    return JSON.parse(raw) as FieldOpsServicesFile;
  } catch {
    return { services: [] };
  }
}

export async function getFieldCredentials(): Promise<FieldOpsCredentialsFile> {
  try {
    const raw = await readFile(fieldOpsPath(".credentials.json"), "utf-8");
    return JSON.parse(raw) as FieldOpsCredentialsFile;
  } catch {
    return { masterKeyHash: null, masterKeySalt: null, credentials: [] };
  }
}

export async function getFieldActivityLog(): Promise<FieldOpsActivityLogFile> {
  try {
    const raw = await readFile(fieldOpsPath("activity-log.json"), "utf-8");
    return JSON.parse(raw) as FieldOpsActivityLogFile;
  } catch {
    return { events: [] };
  }
}

export async function getApprovalConfig(): Promise<ApprovalConfigFile> {
  try {
    const raw = await readFile(fieldOpsPath("approval-config.json"), "utf-8");
    return JSON.parse(raw) as ApprovalConfigFile;
  } catch {
    return { config: { mode: "approve-all", overrides: {} } };
  }
}

const DEFAULT_SAFETY_LIMITS: SafetyLimitsFile = {
  global: { enabled: true, dailyBudgetUsd: 100, weeklyBudgetUsd: 500, monthlyBudgetUsd: 2000, pauseOnBreach: true },
  services: {},
  spendLog: [],
  updatedAt: new Date().toISOString(),
  updatedBy: "me",
};

export async function getSafetyLimits(): Promise<SafetyLimitsFile> {
  try {
    const raw = await readFile(fieldOpsPath("safety-limits.json"), "utf-8");
    return JSON.parse(raw) as SafetyLimitsFile;
  } catch {
    return { ...DEFAULT_SAFETY_LIMITS };
  }
}

export async function mutateSafetyLimits<T>(fn: (data: SafetyLimitsFile) => Promise<T>): Promise<T> {
  return fileMutexes.safetyLimits.runExclusive(async () => {
    let data: SafetyLimitsFile;
    try {
      const raw = await readFile(fieldOpsPath("safety-limits.json"), "utf-8");
      data = JSON.parse(raw) as SafetyLimitsFile;
    } catch {
      data = { ...DEFAULT_SAFETY_LIMITS };
    }
    const result = await fn(data);
    await _writeFieldOpsJson("safety-limits.json", data);
    return result;
  });
}

// ─── Field Ops: Mutate functions ──────────────────────────────────────────────

export async function mutateFieldMissions<T>(fn: (data: FieldMissionsFile) => Promise<T>): Promise<T> {
  return fileMutexes.fieldMissions.runExclusive(async () => {
    let data: FieldMissionsFile;
    try {
      const raw = await readFile(fieldOpsPath("missions.json"), "utf-8");
      data = JSON.parse(raw) as FieldMissionsFile;
    } catch {
      data = { missions: [] };
    }
    const result = await fn(data);
    await _writeFieldOpsJson("missions.json", data);
    return result;
  });
}

export async function mutateFieldTasks<T>(fn: (data: FieldTasksFile) => Promise<T>): Promise<T> {
  return fileMutexes.fieldTasks.runExclusive(async () => {
    let data: FieldTasksFile;
    try {
      const raw = await readFile(fieldOpsPath("tasks.json"), "utf-8");
      data = JSON.parse(raw) as FieldTasksFile;
    } catch {
      data = { tasks: [] };
    }
    const result = await fn(data);
    await _writeFieldOpsJson("tasks.json", data);
    return result;
  });
}

export async function mutateFieldServices<T>(fn: (data: FieldOpsServicesFile) => Promise<T>): Promise<T> {
  return fileMutexes.fieldServices.runExclusive(async () => {
    let data: FieldOpsServicesFile;
    try {
      const raw = await readFile(fieldOpsPath("services.json"), "utf-8");
      data = JSON.parse(raw) as FieldOpsServicesFile;
    } catch {
      data = { services: [] };
    }
    const result = await fn(data);
    await _writeFieldOpsJson("services.json", data);
    return result;
  });
}

export async function mutateFieldCredentials<T>(fn: (data: FieldOpsCredentialsFile) => Promise<T>): Promise<T> {
  return fileMutexes.fieldCredentials.runExclusive(async () => {
    let data: FieldOpsCredentialsFile;
    try {
      const raw = await readFile(fieldOpsPath(".credentials.json"), "utf-8");
      data = JSON.parse(raw) as FieldOpsCredentialsFile;
    } catch {
      data = { masterKeyHash: null, masterKeySalt: null, credentials: [] };
    }
    const result = await fn(data);
    await _writeFieldOpsJson(".credentials.json", data);
    return result;
  });
}

const FIELD_ACTIVITY_LOG_MAX = 500;

export async function mutateFieldActivityLog<T>(fn: (data: FieldOpsActivityLogFile) => Promise<T>): Promise<T> {
  return fileMutexes.fieldActivityLog.runExclusive(async () => {
    let data: FieldOpsActivityLogFile;
    try {
      const raw = await readFile(fieldOpsPath("activity-log.json"), "utf-8");
      data = JSON.parse(raw) as FieldOpsActivityLogFile;
    } catch {
      data = { events: [] };
    }
    const result = await fn(data);

    // Log rotation: archive overflow events when count exceeds threshold
    if (data.events.length > FIELD_ACTIVITY_LOG_MAX) {
      const overflow = data.events.slice(0, data.events.length - FIELD_ACTIVITY_LOG_MAX);
      data.events = data.events.slice(-FIELD_ACTIVITY_LOG_MAX);

      // Archive to date-stamped file (best-effort)
      try {
        const dateStamp = new Date().toISOString().split("T")[0];
        const archiveName = `activity-log-archive-${dateStamp}.json`;
        const archivePath = fieldOpsPath(archiveName);

        // Append to existing archive for today, or create new
        let archive: { archivedAt: string; events: FieldOpsActivityLogFile["events"] };
        try {
          const existingRaw = await readFile(archivePath, "utf-8");
          archive = JSON.parse(existingRaw);
          archive.events.push(...overflow);
        } catch {
          archive = { archivedAt: new Date().toISOString(), events: overflow };
        }
        await writeFile(archivePath, JSON.stringify(archive, null, 2), "utf-8");
      } catch {
        // Best-effort archival — don't block mutations if archiving fails
      }
    }

    await _writeFieldOpsJson("activity-log.json", data);
    return result;
  });
}

export async function mutateApprovalConfig<T>(fn: (data: ApprovalConfigFile) => Promise<T>): Promise<T> {
  return fileMutexes.approvalConfig.runExclusive(async () => {
    let data: ApprovalConfigFile;
    try {
      const raw = await readFile(fieldOpsPath("approval-config.json"), "utf-8");
      data = JSON.parse(raw) as ApprovalConfigFile;
    } catch {
      data = { config: { mode: "approve-all", overrides: {} } };
    }
    const result = await fn(data);
    await _writeFieldOpsJson("approval-config.json", data);
    return result;
  });
}

export async function getFieldTemplates(): Promise<FieldTaskTemplatesFile> {
  try {
    const raw = await readFile(fieldOpsPath("templates.json"), "utf-8");
    return JSON.parse(raw) as FieldTaskTemplatesFile;
  } catch {
    return { templates: [] };
  }
}

export async function mutateFieldTemplates<T>(fn: (data: FieldTaskTemplatesFile) => Promise<T>): Promise<T> {
  return fileMutexes.fieldTemplates.runExclusive(async () => {
    let data: FieldTaskTemplatesFile;
    try {
      const raw = await readFile(fieldOpsPath("templates.json"), "utf-8");
      data = JSON.parse(raw) as FieldTaskTemplatesFile;
    } catch {
      data = { templates: [] };
    }
    const result = await fn(data);
    await _writeFieldOpsJson("templates.json", data);
    return result;
  });
}
