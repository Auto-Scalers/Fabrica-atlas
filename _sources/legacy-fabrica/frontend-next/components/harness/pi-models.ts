export interface PiCliModelItem {
  provider: string;
  model: string;
  fullModel: string;
  context?: string;
  maxOutput?: string;
  thinking?: boolean;
  images?: boolean;
}

export interface PiProviderGroup {
  id: string;
  name: string;
  badge: string;
  badgeColor: string;
  description: string;
  models: {
    id: string;
    name: string;
    fullModel: string;
    context?: string;
    maxOutput?: string;
    thinking?: boolean;
    images?: boolean;
  }[];
}

export interface SupabaseProviderInfo {
  id: string;
  name: string;
  default_model: string;
  allowed_models: string[];
  is_active?: boolean;
}

export const FABRICA_POOL_MODELS = [
  { id: 'gemini-3.6-flash', name: 'Gemini 3.6 Flash (Free Pool)' },
  { id: 'gemini-3.5-flash-lite', name: 'Gemini 3.5 Flash Lite (Free Pool)' },
  { id: 'openrouter/nvidia/nemotron-3-ultra-550b-a55b:free', name: 'Nvidia Nemotron 3 Ultra 550B (Free Pool)' },
  { id: 'openrouter/poolside/laguna-s-2.1:free', name: 'Poolside Laguna S 2.1 (Free Pool)' }
];

export function buildPoolModelsFromProviders(providers?: SupabaseProviderInfo[]): { id: string; name: string }[] {
  if (!providers || !Array.isArray(providers) || providers.length === 0) {
    return FABRICA_POOL_MODELS;
  }

  const result: { id: string; name: string }[] = [];
  for (const prov of providers) {
    if (prov.is_active === false) continue;
    const allowed = Array.isArray(prov.allowed_models) ? prov.allowed_models : [];
    for (const m of allowed) {
      const fullId = m.includes('/') ? m : `${prov.id}/${m}`;
      const name = m.includes('/') ? m.split('/').pop()! : m;
      result.push({
        id: fullId,
        name: `${name} (${prov.name || prov.id} Free Pool)`
      });
    }
  }

  return result.length > 0 ? result : FABRICA_POOL_MODELS;
}

export const DEFAULT_PI_CLI_MODELS: PiCliModelItem[] = [
  // Google
  { provider: 'google', model: 'gemini-3.6-flash', fullModel: 'google/gemini-3.6-flash', context: '1.0M', maxOutput: '65.5K', thinking: true, images: true },
  { provider: 'google', model: 'gemini-2.5-pro', fullModel: 'google/gemini-2.5-pro', context: '2.0M', maxOutput: '65.5K', thinking: true, images: true },
  { provider: 'google', model: 'gemini-2.0-flash', fullModel: 'google/gemini-2.0-flash', context: '1.0M', maxOutput: '8.2K', thinking: false, images: true },
  { provider: 'google', model: 'gemma-4-31b-it', fullModel: 'google/gemma-4-31b-it', context: '262.1K', maxOutput: '32.8K', thinking: true, images: true },

  // Anthropic
  { provider: 'anthropic', model: 'claude-3-7-sonnet', fullModel: 'anthropic/claude-3-7-sonnet', context: '200K', maxOutput: '64K', thinking: true, images: true },
  { provider: 'anthropic', model: 'claude-3-5-sonnet-latest', fullModel: 'anthropic/claude-3-5-sonnet-latest', context: '200K', maxOutput: '8K', thinking: true, images: true },
  { provider: 'anthropic', model: 'claude-3-5-haiku-latest', fullModel: 'anthropic/claude-3-5-haiku-latest', context: '200K', maxOutput: '8K', thinking: false, images: false },
  { provider: 'anthropic', model: 'claude-3-opus-latest', fullModel: 'anthropic/claude-3-opus-latest', context: '200K', maxOutput: '4K', thinking: false, images: true },

  // OpenAI
  { provider: 'openai', model: 'gpt-4o', fullModel: 'openai/gpt-4o', context: '128K', maxOutput: '4K', thinking: false, images: true },
  { provider: 'openai', model: 'gpt-4o-mini', fullModel: 'openai/gpt-4o-mini', context: '128K', maxOutput: '16K', thinking: false, images: true },
  { provider: 'openai', model: 'o1', fullModel: 'openai/o1', context: '200K', maxOutput: '100K', thinking: true, images: true },
  { provider: 'openai', model: 'o3-mini', fullModel: 'openai/o3-mini', context: '200K', maxOutput: '100K', thinking: true, images: false },

  // DeepSeek
  { provider: 'deepseek', model: 'deepseek-chat', fullModel: 'deepseek/deepseek-chat', context: '64K', maxOutput: '8K', thinking: false, images: false },
  { provider: 'deepseek', model: 'deepseek-reasoner', fullModel: 'deepseek/deepseek-reasoner', context: '64K', maxOutput: '8K', thinking: true, images: false },

  // Groq
  { provider: 'groq', model: 'llama-3.3-70b-versatile', fullModel: 'groq/llama-3.3-70b-versatile', context: '128K', maxOutput: '8K', thinking: false, images: false },
  { provider: 'groq', model: 'llama-3.1-8b-instant', fullModel: 'groq/llama-3.1-8b-instant', context: '128K', maxOutput: '8K', thinking: false, images: false },

  // OpenRouter
  { provider: 'openrouter', model: 'anthropic/claude-3.5-sonnet', fullModel: 'openrouter/anthropic/claude-3.5-sonnet', context: '200K', maxOutput: '8K', thinking: true, images: true },
  { provider: 'openrouter', model: 'deepseek/deepseek-r1', fullModel: 'openrouter/deepseek/deepseek-r1', context: '128K', maxOutput: '8K', thinking: true, images: false },
  { provider: 'openrouter', model: 'openai/gpt-4o', fullModel: 'openrouter/openai/gpt-4o', context: '128K', maxOutput: '4K', thinking: false, images: true },
  { provider: 'openrouter', model: 'nvidia/nemotron-3-ultra-550b-a55b:free', fullModel: 'openrouter/nvidia/nemotron-3-ultra-550b-a55b:free', context: '128K', maxOutput: '8K', thinking: false, images: false }
];

export const PROVIDER_METADATA: Record<string, { name: string; badge: string; badgeColor: string; description: string }> = {
  google: {
    name: 'Google AI Studio (Gemini)',
    badge: 'DIRECT GOOGLE AI',
    badgeColor: '#3b82f6',
    description: 'Direct connection to Gemini & Gemma models via Google AI Studio API Key.'
  },
  openrouter: {
    name: 'OpenRouter Multi-Model',
    badge: 'OPENROUTER GATEWAY',
    badgeColor: '#8b5cf6',
    description: 'Access Claude 3.5 Sonnet, DeepSeek R1, Llama 3.3, GPT-4o via unified key.'
  },
  anthropic: {
    name: 'Anthropic Claude',
    badge: 'DIRECT ANTHROPIC',
    badgeColor: '#d97706',
    description: 'Direct Anthropic API key for Claude 3.5 Sonnet, Opus & Haiku.'
  },
  openai: {
    name: 'OpenAI Direct',
    badge: 'DIRECT OPENAI',
    badgeColor: '#10b981',
    description: 'Direct OpenAI API connection for GPT-4o, GPT-4o-mini & Reasoning models.'
  },
  groq: {
    name: 'Groq LPU Acceleration',
    badge: 'ULTRA LOW-LATENCY',
    badgeColor: '#ec4899',
    description: 'Groq LPU hardware acceleration for instant Llama 3.3 & DeepSeek Distill outputs.'
  },
  deepseek: {
    name: 'DeepSeek Direct API',
    badge: 'DIRECT DEEPSEEK',
    badgeColor: '#06b6d4',
    description: 'Direct API key for DeepSeek V3 chat and DeepSeek R1 reasoning models.'
  }
};

export function buildProvidersFromPiCli(piModelsList: PiCliModelItem[]): PiProviderGroup[] {
  const listToUse = (piModelsList && Array.isArray(piModelsList) && piModelsList.length > 0)
    ? piModelsList
    : DEFAULT_PI_CLI_MODELS;

  const groups: Record<string, PiCliModelItem[]> = {};
  for (const item of listToUse) {
    const prov = item.provider || 'google';
    if (!groups[prov]) groups[prov] = [];
    groups[prov].push(item);
  }

  return Object.keys(groups).map((provId) => {
    const meta = PROVIDER_METADATA[provId] || {
      name: provId.charAt(0).toUpperCase() + provId.slice(1) + ' Provider',
      badge: `DIRECT ${provId.toUpperCase()}`,
      badgeColor: '#6366f1',
      description: `Models available directly from ${provId} agent CLI.`
    };

    const models = groups[provId].map((m) => {
      const full = m.fullModel || (m.provider ? `${m.provider}/${m.model}` : m.model);
      return {
        id: full,
        name: m.model || full,
        fullModel: full,
        context: m.context,
        maxOutput: m.maxOutput,
        thinking: m.thinking,
        images: m.images
      };
    });

    return {
      id: provId,
      name: meta.name,
      badge: meta.badge,
      badgeColor: meta.badgeColor,
      description: meta.description,
      models
    };
  });
}
