export interface HarnessConfig {
  harness: {
    version: string;
    name: string;
    architecture: string;
    mode: string;
    model_preferences: {
      default_agent_model: string;
      research_model: string;
    };
    memory: {
      context_window_tokens: number;
      persistence_mode: string;
    };
  };
  piBinPath?: string;
  piHomeDir?: string;
  modelFallback?: string;
  maxTurnTimeMs?: number;
}

export interface UserHarnessInfo {
  tenantId: string;
  harnessDir: string;
  config: HarnessConfig;
  piHomeDir?: string;
  skillsCount?: number;
  extensionsCount?: number;
  status?: 'idle' | 'active' | 'error';
  lastRunAt?: string;
}

export interface PiExecutionOptions {
  cwd: string;
  piCodingAgentDir: string;
  env: Record<string, string>;
  cliFlags: string[];
  tenantId?: string;
  sessionId?: string;
  prompt?: string;
  model?: string;
  thinking?: boolean;
  images?: string[];
  tools?: string[];
  systemPromptAddendum?: string;
  timeoutMs?: number;
}

export interface PiDaemonProcessInfo {
  id: string;
  tenantId: string;
  sessionId: string;
  model: string;
  pid?: number;
  status: 'running' | 'idle' | 'busy' | 'stopped' | 'error';
  createdAt: string;
  lastActiveAt: string;
  apiKeyStrategy: string;
  completedTurnsCount?: number;
}

export interface PiAgentRunOptions {
  prompt: string;
  tenantId?: string;
  sessionId?: string;
  model?: string;
  customKey?: string;
  agentLang?: string;
  webSearchEnabled?: boolean;
  thinkingLevel?: 'off' | 'minimal' | 'low' | 'medium' | 'high' | 'xhigh' | 'max';
  thinking?: boolean;
  disableWorkspaceSkills?: boolean;
  disableWorkspaceExtensions?: boolean;
  images?: string[];
  tools?: string[];
  systemPromptAddendum?: string;
}

export interface PiAgentResponse {
  ok: boolean;
  text: string;
  sessionId: string;
  model: string;
  usage?: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
  error?: string;
  suggestions?: any[];
  review?: any[];
  backlog?: any[];
}

export interface PiSessionItem {
  id: string;
  name: string;
  path: string;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
  history?: Array<{
    sender: 'user' | 'agent';
    text: string;
    timestamp?: string;
  }>;
}

export interface PiModelItem {
  provider: string;
  model: string;
  fullModel: string;
  context: string;
  maxOutput: string;
  thinking: boolean;
  images: boolean;
}

export interface PiProcessLogItem {
  id: string;
  timestamp: string;
  tenantId: string;
  sessionId: string;
  model: string;
  prompt: string;
  command: string;
  args: string[];
  executionTimeMs: number;
  stdout: string;
  stderr: string;
  ok: boolean;
  error?: string;
  apiKeyStrategy: string;
}
