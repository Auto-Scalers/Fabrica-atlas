export interface WorkspaceItemLevel {
  maturity: 'draft' | 'beta' | 'production' | string;
  readability: 'low' | 'medium' | 'high' | string;
}

export interface WorkspaceItem {
  id?: string;
  name: string;
  path: string;
  isDirectory: boolean;
  type: string;
  source_type: 'Generated' | 'Imported';
  level: WorkspaceItemLevel;
  description: string;
  when_to_use: string;
  triggers: string[];
  size: number;
  modified_at: string;
  created_at?: string;
}

export type WorkspaceSourceItem = WorkspaceItem;
export type WorkspaceDeliverableItem = WorkspaceItem;

export interface WorkspaceMap {
  discovery_and_scoping: WorkspaceItem[];
  deep_research: WorkspaceItem[];
  data_analysis: WorkspaceItem[];
  strategic_synthesis: WorkspaceItem[];
  executions: WorkspaceItem[];
  reviews: WorkspaceItem[];
  completed: WorkspaceItem[];
  all: WorkspaceItem[];
  sources?: {
    discovery_and_scoping: WorkspaceSourceItem[];
    deep_research: WorkspaceSourceItem[];
    data_analysis: WorkspaceSourceItem[];
    strategic_synthesis: WorkspaceSourceItem[];
    all: WorkspaceSourceItem[];
  };
  deliverables?: {
    executions: WorkspaceDeliverableItem[];
    reviews: WorkspaceDeliverableItem[];
    completed: WorkspaceDeliverableItem[];
    all: WorkspaceDeliverableItem[];
  };
  updated_at: string;
}

export type ToolboxesYaml = any;
