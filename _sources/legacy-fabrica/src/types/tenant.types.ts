export interface AppConfig {
  id: string;
  name: string;
  version: string;
  environment: 'development' | 'staging' | 'production';
  features: Record<string, boolean>;
  metadata?: Record<string, any>;
}

export interface RuntimeState {
  tenantId: string;
  status: 'initializing' | 'running' | 'paused' | 'stopped';
  activeSessionsCount: number;
  lastActiveAt: string;
  suggestions: any[];
  backlogs: any[];
  reviewQueues: any[];
  recentEvents: any[];
}

export interface RawData {
  id: string;
  source: string;
  payload: any;
  createdAt: string;
}

export interface Artifact {
  id: string;
  name: string;
  type: string;
  path: string;
  sizeBytes: number;
  createdAt: string;
  metadata?: Record<string, any>;
}

export interface Tool {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  category?: string;
}

export interface TenantProfile {
  tenantId: string;
  name: string;
  email?: string;
  plan: string;
  createdAt: string;
  updatedAt: string;
  settings: Record<string, any>;
  integrations_config?: Record<string, any>;
}

export interface TenantTelemetry {
  tenantId: string;
  cpuUsagePercent: number;
  memoryUsageMb: number;
  activeDaemonsCount: number;
  totalMissionsCount: number;
  totalStorageBytes: number;
  uptimeSeconds: number;
  timestamp: string;
}

export interface AuditLogEvent {
  id: string;
  timestamp: string;
  type: 'system' | 'mission' | 'audit' | 'source' | 'deliverable' | 'user';
  event: string;
  mission_id?: string | null;
  details?: any;
}
