import { harnessApi } from './api';

export interface UserHarnessConfig {
  tenantId: string;
  activeEntity: string;
  harnessModel: string;
  isDedicatedDaemon: boolean;
  webSearchEnabled: boolean;
  agentLang: string;
  customKeys: {
    gemini?: string;
    openrouter?: string;
    anthropic?: string;
  };
}

export interface UserHarnessExecutionOptions {
  message: string;
  history?: { sender: string; text: string }[];
  model?: string;
  customKey?: string;
  webSearchEnabled?: boolean;
  agentLang?: string;
}

export interface UserHarnessExecutionResult {
  ok: boolean;
  text: string;
  suggestions: string[];
  executionTimeMs?: number;
}

export interface BusinessPlanTier {
  id: 'free' | 'power' | 'enterprise' | 'paug';
  name: string;
  priceMonthly: number;
  description: string;
  harnessType: string;
  monthlyTokens: number;
  features: string[];
  isPopular?: boolean;
}

export const BUSINESS_PLANS: Record<string, BusinessPlanTier> = {
  free: {
    id: 'free',
    name: 'Free Shared Tier',
    priceMonthly: 0,
    description: 'Shared User Harness Engine with multi-provider free model routing.',
    harnessType: 'Shared Harness Engine',
    monthlyTokens: 1000000,
    features: [
      'Access to Free Tier Models (Gemini 2.0 Flash, Llama 3.3 70B, DeepSeek R1)',
      'Shared User Harness Engine',
      'Basic Context & Document Ingestion',
      'Standard Rate Limits (100 req/day)',
      'Community & Self-Service Support'
    ]
  },
  power: {
    id: 'power',
    name: 'Power User Tier',
    priceMonthly: 49,
    description: 'High-throughput User Harness with priority model routing and 10M monthly tokens.',
    harnessType: 'Priority User Harness',
    monthlyTokens: 10000000,
    features: [
      'Priority User Harness Execution Queue',
      '10,000,000 Monthly Managed Tokens',
      'Full BYOK (Bring Your Own Key) Unthrottled Routing',
      'Deep Research Agentic Loops & Context Caching',
      'Realtime Postgres Database Subscriptions & Telemetry',
      'Priority Ticket Support'
    ],
    isPopular: true
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise Custom Tier',
    priceMonthly: 249,
    description: 'Dedicated User Harness Daemons with multi-tenant workspace isolation and custom Key Pools.',
    harnessType: 'Dedicated Harness Daemon',
    monthlyTokens: 50000000,
    features: [
      'Isolated Dedicated Harness Daemons',
      '50,000,000 Monthly Managed Tokens',
      'System Key Pool Load Balancer Access',
      'Unlimited PAUG Consulting & Architecture Reports',
      'GitHub Integration & Automated Commit Pipelines',
      'Custom SLA & 24/7 Dedicated Support'
    ]
  },
  paug: {
    id: 'paug',
    name: 'PAUG Dedicated Infra',
    priceMonthly: 0,
    description: 'Pay-as-you-go serverless infrastructure for automated enterprise execution.',
    harnessType: 'Serverless PAUG Infra',
    monthlyTokens: 0,
    features: [
      'Pay-as-you-go billing ($0.005 / request or exact token cost)',
      'Auto-scaling serverless worker daemons',
      'Custom LLM model endpoints integration',
      'On-demand high-scale data synthesis'
    ]
  }
};

export class UserHarnessService {
  /**
   * Executes a message or command through the User Harness Engine
   */
  static async execute(options: UserHarnessExecutionOptions): Promise<UserHarnessExecutionResult> {
    const startTime = Date.now();
    try {
      const res = await harnessApi.chatAgent(
        options.message,
        options.history || [],
        options.customKey,
        options.model,
        options.webSearchEnabled,
        options.agentLang
      );
      const executionTimeMs = Date.now() - startTime;
      return {
        ok: res.ok,
        text: res.text,
        suggestions: res.suggestions || [],
        executionTimeMs
      };
    } catch (err: any) {
      console.error('[UserHarnessService] Execution error:', err);
      throw err;
    }
  }

  /**
   * Generates PAUG Consulting / System Architecture report via User Harness
   */
  static async generateArchitectureReport(
    templateName: string,
    companyName: string,
    extraContext?: string,
    model?: string,
    customKey?: string
  ) {
    return harnessApi.generatePaugReport(templateName, companyName, extraContext, model, customKey);
  }

  /**
   * Runs Deep Research loops via User Harness
   */
  static async deepResearch(query: string, model?: string, customKey?: string) {
    return harnessApi.deepResearch(query, model, customKey);
  }
}
