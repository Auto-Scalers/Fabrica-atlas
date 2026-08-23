export interface UserFileItem {
  name: string;
  relativePath: string;
  isDirectory: boolean;
  size: number;
  updatedAt: string;
}

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
  updated_at: string;
}

export interface StorageObject {
  name: string;
  bucket: string;
  size: number;
  contentType: string;
  updated: string;
  metadata?: Record<string, string>;
}

export interface SyncResult {
  tenantId: string;
  syncedFilesCount: number;
  newGapsFilled: number;
  timestamp: string;
}
