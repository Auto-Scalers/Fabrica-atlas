import fs from 'fs';
import path from 'path';
import {
  MissionTask,
  MissionBlueprint,
  MissionExecutionArtifact,
  MissionSchema,
  MissionsStoreData,
  MissionArtifactItem,
  Mission
} from '../../types/missions.types.js';
import { getTenantRoot, appendTenantAuditLog } from '../tenant/tenant.manager.js';
import { getWorkspaceArtifactsFromIndex, moveUserFile, deleteUserFile, syncWorkspaceJson } from '../workspace/file.manager.js';

export function getMissionSchema(missionType: string = 'standard'): MissionSchema {
  const normType = (missionType || 'standard').replace(/^system_/, '').toLowerCase();

  return {
    type: normType,
    title: `${normType.toUpperCase()} Mission Schema`,
    protected: true,
    version: "3.0.0",
    supported_phases: ["discovery", "blueprint", "scaffold", "execute", "review"],
    phase_selection: "multi_or_single",
    storage_paths: {
      scratchpad: "missions/",
      workspace: "workspace/",
      discovery_and_scoping: "workspace/Discovery & Scoping/",
      deep_research: "workspace/Deep Research & Intelligence Gathering/",
      data_analysis: "workspace/Data Analysis & Pattern Extraction/",
      strategic_synthesis: "workspace/Strategic Synthesis & Decision Support/",
      executions: "workspace/Executions/",
      reviews: "workspace/Reviews/",
      completed: "workspace/Completed/",
      state_index: "missions-graph.json",
      workspace_index: "workspace-graph.json",
      event_stream: "logs.json"
    },
    pipeline: {
      stages: ["discovery", "blueprint", "scaffold", "execute", "review"]
    }
  };
}

export function scanWorkspaceArtifacts(tenantId: string = 'default_user', existingMission?: Mission) {
  return getWorkspaceArtifactsFromIndex(tenantId, existingMission);
}

export function ensureMissionWorkspaceDirs(tenantId: string, missionType: string, missionId: string) {
  const normType = (missionType || 'standard').replace(/^system_/, '');
  const userRoot = getTenantRoot(tenantId);
  const baseDir = path.join(userRoot, 'missions');
  fs.mkdirSync(baseDir, { recursive: true });

  const workspaceDir = path.join(userRoot, 'workspace');
  const dirs = [
    'Discovery & Scoping',
    'Deep Research & Intelligence Gathering',
    'Data Analysis & Pattern Extraction',
    'Strategic Synthesis & Decision Support',
    'Executions',
    'Reviews',
    'Completed'
  ];
  for (const d of dirs) {
    fs.mkdirSync(path.join(workspaceDir, d), { recursive: true });
  }

  return { baseDir, workspaceDir, normType };
}

export function saveMissionToStore(tenantId: string = 'default_user', mission: Mission) {
  const userRoot = getTenantRoot(tenantId);
  const missionsDir = path.join(userRoot, 'missions');
  if (!fs.existsSync(missionsDir)) {
    fs.mkdirSync(missionsDir, { recursive: true });
  }

  const { sources, deliverables } = scanWorkspaceArtifacts(tenantId, mission);
  const updatedMission: Mission = {
    ...mission,
    sources,
    deliverables
  };

  const missionFilePath = path.join(missionsDir, `${mission.id}.json`);
  fs.writeFileSync(missionFilePath, JSON.stringify(updatedMission, null, 2), 'utf8');

  updateMissionsGraphIndex(tenantId);
}

export function updateMissionsGraphIndex(tenantId: string = 'default_user') {
  const userRoot = getTenantRoot(tenantId);
  const missionsDir = path.join(userRoot, 'missions');
  const graphPath = path.join(userRoot, 'missions-graph.json');

  let graphEntries: any[] = [];
  let fullMissionsList: Mission[] = [];

  if (fs.existsSync(missionsDir)) {
    const files = fs.readdirSync(missionsDir).filter(f => f.endsWith('.json'));
    for (const file of files) {
      try {
        const fullPath = path.join(missionsDir, file);
        if (fs.statSync(fullPath).isFile()) {
          const content = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
          if (content && content.id) {
            fullMissionsList.push(content);
            graphEntries.push({
              id: content.id,
              title: content.title || 'Untitled Mission',
              objective: content.objective || '',
              type: content.type || 'standard',
              user_id: content.user_id || tenantId,
              status: content.status || 'drafting',
              phase: content.phase || 'discovery',
              created_at: content.created_at || new Date().toISOString(),
              updated_at: content.updated_at || new Date().toISOString()
            });
          }
        }
      } catch (_) {}
    }
  }

  const payload = {
    missions: graphEntries,
    full_missions: fullMissionsList,
    last_updated: new Date().toISOString()
  };

  fs.writeFileSync(graphPath, JSON.stringify(payload, null, 2), 'utf8');
}

export function syncMissionWorkspaceArtifacts(mission: Partial<Mission> & { id: string }) {
  if (!mission || !mission.id) return null;
  const tenantId = mission.user_id || 'default_user';
  const mType = mission.type || 'standard';
  const { baseDir, workspaceDir } = ensureMissionWorkspaceDirs(tenantId, mType, mission.id);

  try {
    const { workspaceFiles, sources, deliverables } = scanWorkspaceArtifacts(tenantId, mission as Mission);
    const updatedMission: Mission = {
      ...(mission as Mission),
      sources,
      deliverables,
      workspace_files: workspaceFiles
    };
    saveMissionToStore(tenantId, updatedMission);
  } catch (err) {
    console.warn(`[MissionsCore] Failed syncing mission workspace artifacts:`, err);
  }

  return { baseDir, workspaceDir };
}

export function syncMissionsJson(tenantId: string = 'default_user'): Mission[] {
  const userRoot = getTenantRoot(tenantId);
  const missionsDir = path.join(userRoot, 'missions');

  if (!fs.existsSync(missionsDir)) {
    fs.mkdirSync(missionsDir, { recursive: true });
  }

  const fullMissions: Mission[] = [];
  if (fs.existsSync(missionsDir)) {
    const files = fs.readdirSync(missionsDir).filter(f => f.endsWith('.json'));
    for (const file of files) {
      try {
        const fullPath = path.join(missionsDir, file);
        if (fs.statSync(fullPath).isFile()) {
          const m: Mission = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
          if (m && m.id) {
            const { sources, deliverables } = scanWorkspaceArtifacts(tenantId, m);
            m.sources = sources;
            m.deliverables = deliverables;
            fs.writeFileSync(fullPath, JSON.stringify(m, null, 2), 'utf8');
            fullMissions.push(m);
          }
        }
      } catch (_) {}
    }
  }

  updateMissionsGraphIndex(tenantId);
  return fullMissions;
}

export const syncMissionsDb = syncMissionsJson;

export function getMissionsData(tenantId: string = 'default_user'): MissionsStoreData {
  const fullMissions = syncMissionsJson(tenantId);
  return { missions: fullMissions };
}

export function getMissions(tenantId: string = 'default_user'): Mission[] {
  return syncMissionsJson(tenantId);
}

export function getMission(tenantId: string = 'default_user', missionId: string): Mission | null {
  const userRoot = getTenantRoot(tenantId);
  const missionPath = path.join(userRoot, 'missions', `${missionId}.json`);
  if (fs.existsSync(missionPath)) {
    try {
      return JSON.parse(fs.readFileSync(missionPath, 'utf8')) as Mission;
    } catch (_) {}
  }
  return null;
}

export function createMission(
  tenantId: string = 'default_user',
  missionData: {
    id?: string;
    title?: string;
    objective?: string;
    type?: string;
    status?: string;
    phase?: string;
    metadata?: any;
    inputs?: any;
    goals?: any;
    tasks?: any;
  }
): Mission {
  const id = missionData.id || `msn_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const title = missionData.title || missionData.objective || id || 'Untitled Mission';
  const objective = missionData.objective || title || 'New Mission Objective';

  const newMission: Mission = {
    id,
    title,
    objective,
    type: missionData.type || 'standard',
    user_id: tenantId,
    status: (missionData.status as any) || 'drafting',
    phase: (missionData.phase as any) || 'discovery',
    scratchpad: `missions/${id}.json`,
    metadata: missionData.metadata || { tasks: missionData.tasks || [] },
    workflow_history: [
      { timestamp: new Date().toISOString(), phase: missionData.phase || 'discovery', status: 'created' }
    ],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  syncMissionWorkspaceArtifacts(newMission);

  appendTenantAuditLog(tenantId, {
    type: 'mission',
    event: 'Mission Created',
    mission_id: id,
    details: { title: newMission.title, type: newMission.type }
  });

  return newMission;
}

export function updateMission(
  tenantId: string = 'default_user',
  missionId: string,
  updates: Partial<Mission>
): Mission | null {
  const target = getMission(tenantId, missionId) || getMissions(tenantId).find(m => m.id === missionId);
  if (!target) return null;

  const isMoved = (updates.phase && updates.phase !== target.phase) || (updates.status && updates.status !== target.status);

  const newPhase = updates.phase || target.phase;
  const newStatus = updates.status || target.status;

  if (isMoved && target.deliverables && target.deliverables.length > 0) {
    let destSubDir = 'workspace/Executions';
    if (newStatus === 'completed' || newPhase === 'review') {
      destSubDir = newStatus === 'completed' ? 'workspace/Completed' : 'workspace/Reviews';
    } else if (newPhase === 'discovery' || newPhase === 'blueprint') {
      destSubDir = 'workspace/Discovery & Scoping';
    }

    for (const deliv of target.deliverables) {
      if (!deliv.path) continue;
      const fileName = path.basename(deliv.path);
      const destPath = `${destSubDir}/${fileName}`;

      if (deliv.path !== destPath) {
        try {
          moveUserFile(tenantId, deliv.path, destPath);
          deliv.path = destPath;
        } catch (_) {}
      }
    }
  }

  const updated: Mission = {
    ...target,
    ...updates,
    id: missionId,
    updated_at: new Date().toISOString()
  };

  syncMissionWorkspaceArtifacts(updated);
  syncWorkspaceJson(tenantId);

  return updated;
}

export function deleteMission(tenantId: string = 'default_user', missionId: string): boolean {
  const userRoot = getTenantRoot(tenantId);
  const missionFilePath = path.join(userRoot, 'missions', `${missionId}.json`);
  if (fs.existsSync(missionFilePath)) {
    fs.unlinkSync(missionFilePath);
  }

  const target = getMission(tenantId, missionId);

  if (target && target.deliverables) {
    for (const deliv of target.deliverables) {
      if (deliv.path) {
        try {
          deleteUserFile(tenantId, deliv.path);
        } catch (_) {}
      }
    }
  }

  updateMissionsGraphIndex(tenantId);
  syncWorkspaceJson(tenantId);
  return true;
}
