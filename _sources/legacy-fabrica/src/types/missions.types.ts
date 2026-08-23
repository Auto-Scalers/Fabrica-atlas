export interface MissionTask {
  id: string;
  title: string;
  cost?: 'LOW' | 'MEDIUM' | 'HIGH';
  benefit?: 'LOW' | 'MEDIUM' | 'HIGH';
  worth_it?: 'YES' | 'NO' | boolean;
  completed: boolean;
  assigned_agent?: string;
  deliverable_path?: string;
}

export interface MissionBlueprint {
  id: string;
  title: string;
  objective: string;
  type: string;
  status: string;
  phase: string;
  qa_state?: any;
  tasks: MissionTask[];
}

export interface MissionExecutionArtifact {
  id: string;
  status: string;
  phase: string;
  workflow_history: Array<{ timestamp: string; phase: string; status: string }>;
  system_ids: string[];
  input_data_ids: string[];
  metrics: Record<string, any>;
}

export interface MissionSchema {
  type: string;
  title: string;
  protected: boolean;
  version: string;
  supported_phases: string[];
  phase_selection: string;
  storage_paths: Record<string, string>;
  pipeline: {
    stages: string[];
  };
}

export interface MissionsStoreData {
  missions: Mission[];
}

export interface MissionArtifactItem {
  name: string;
  path: string;
  processed: boolean;
  size?: number;
  modified_at?: string;
}

export interface Mission {
  id: string;
  title: string;
  objective: string;
  type: string;
  user_id: string;
  status: 'drafting' | 'planning' | 'in_progress' | 'reviewing' | 'completed' | 'failed';
  phase: 'discovery' | 'blueprint' | 'scaffold' | 'execute' | 'review';
  scratchpad?: string;
  sources?: MissionArtifactItem[];
  deliverables?: MissionArtifactItem[];
  workspace_files?: Array<{ name: string; path: string }>;
  metadata?: {
    tasks?: MissionTask[];
    metrics?: Record<string, any>;
  };
  workflow_history?: Array<{ timestamp: string; phase: string; status: string }>;
  created_at?: string;
  updated_at?: string;
}
