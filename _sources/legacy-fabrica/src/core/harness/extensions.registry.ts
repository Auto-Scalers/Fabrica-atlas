import fs from 'fs';
import path from 'path';
import { PiExecutionOptions } from '../../types/harness.types.js';
import { getTenantRoot } from '../tenant/tenant.manager.js';
import { keyPoolManager } from '../auth/session.manager.js';
import { decryptSecret } from '../../utils/crypto.utils.js';
import { ensureUserHarness, getHarnessState } from './harness.engine.js';
import { loadKernelSystemPrompts } from './prompt.builder.js';

export function getPiBinaryPath(tenantId?: string): string {
  if (tenantId) {
    const userRoot = getTenantRoot(tenantId);
    const tenantPiBin = path.join(userRoot, '.npm-global', 'bin', 'pi');
    if (fs.existsSync(tenantPiBin)) {
      return tenantPiBin;
    }
    return tenantPiBin;
  }
  const localBin = path.resolve(process.cwd(), 'node_modules/.bin/pi');
  if (fs.existsSync(localBin)) {
    return localBin;
  }
  return 'pi';
}

export function syncPiUserAuthKeys(tenantId: string = 'default_user', customKey?: string, customProvider?: string): void {
  const userRoot = getTenantRoot(tenantId);
  const piAgentDir = path.join(userRoot, '.pi', 'agent');
  if (!fs.existsSync(piAgentDir)) {
    return;
  }

  const authJsonPath = path.join(piAgentDir, 'auth.json');
  const modelsJsonPath = path.join(piAgentDir, 'models.json');

  let authData: Record<string, any> = {};
  if (fs.existsSync(authJsonPath)) {
    try {
      authData = JSON.parse(fs.readFileSync(authJsonPath, 'utf8'));
    } catch (_) {}
  }

  const allKeys = keyPoolManager.getAllKeys();
  const byokKeys = allKeys.filter(k => k.isByok && k.isActive);

  for (const k of byokKeys) {
    if (k.provider) {
      const decrypted = k.encryptedKey ? decryptSecret(k.encryptedKey) : k.key;
      if (decrypted && !decrypted.includes('****')) {
        authData[k.provider] = {
          type: 'api_key',
          key: decrypted,
          label: k.label || 'User BYOK Key'
        };
      }
    }
  }

  if (customKey && customProvider && !customKey.includes('****')) {
    authData[customProvider] = {
      type: 'api_key',
      key: customKey,
      label: 'Request Custom BYOK Key'
    };
  }

  fs.writeFileSync(authJsonPath, JSON.stringify(authData, null, 2), 'utf8');

  if (!fs.existsSync(modelsJsonPath)) {
    fs.writeFileSync(modelsJsonPath, JSON.stringify({
      providers: {
        google: { name: "Google Gemini", env_var: "GOOGLE_GENERATIVE_AI_API_KEY" },
        gemini: { name: "Google Gemini", env_var: "GOOGLE_GENERATIVE_AI_API_KEY" },
        openrouter: { name: "OpenRouter", env_var: "OPENROUTER_API_KEY" },
        anthropic: { name: "Anthropic Claude", env_var: "ANTHROPIC_API_KEY" },
        openai: { name: "OpenAI", env_var: "OPENAI_API_KEY" },
        mistral: { name: "Mistral AI", env_var: "MISTRAL_API_KEY" },
        groq: { name: "Groq", env_var: "GROQ_API_KEY" },
        deepseek: { name: "DeepSeek", env_var: "DEEPSEEK_API_KEY" },
        xai: { name: "xAI Grok", env_var: "XAI_API_KEY" },
        azure: { name: "Azure OpenAI", env_var: "AZURE_OPENAI_API_KEY" },
        together: { name: "Together AI", env_var: "TOGETHER_API_KEY" },
        fireworks: { name: "Fireworks AI", env_var: "FIREWORKS_API_KEY" },
        perplexity: { name: "Perplexity AI", env_var: "PERPLEXITY_API_KEY" }
      }
    }, null, 2), 'utf8');
  }
}

export function getPiExecutionOptions(
  tenantId: string = 'default_user',
  _disableWorkspaceSkills: boolean = false,
  _disableWorkspaceExtensions: boolean = false
): PiExecutionOptions {
  ensureUserHarness(tenantId);
  const userRoot = getTenantRoot(tenantId);
  const piDir = path.join(userRoot, '.pi');

  const cliFlags: string[] = [];

  const candidateKernelSkillsDirs = [
    path.join(userRoot, 'Fabrica_kernel', 'skills'),
    '/mnt/Fabrica_kernel/skills',
    '/Fabrica_kernel/skills',
    path.join(process.cwd(), 'Fabrica_kernel', 'skills')
  ];
  const kernelSkillsDir = candidateKernelSkillsDirs.find(d => fs.existsSync(d) && fs.readdirSync(d).length > 0);
  if (kernelSkillsDir) {
    cliFlags.push('--skill', kernelSkillsDir);
  }

  const harnessData = getHarnessState(tenantId);
  const skillsEnabled: Record<string, boolean> = harnessData.skills_enabled || {};
  const userSkillsDir = path.join(userRoot, '.pi', 'skills');
  if (fs.existsSync(userSkillsDir)) {
    const skillFolders = fs.readdirSync(userSkillsDir, { withFileTypes: true })
      .filter(d => d.isDirectory())
      .map(d => d.name);
    for (const skillName of skillFolders) {
      if (skillsEnabled[skillName] !== false) {
        cliFlags.push('--skill', path.join(userSkillsDir, skillName));
      }
    }
  }

  const userExtensionsDir = path.join(userRoot, '.pi', 'extensions');
  if (fs.existsSync(userExtensionsDir)) {
    const extFiles = fs.readdirSync(userExtensionsDir, { withFileTypes: true })
      .filter(f => !f.isDirectory() && (f.name.endsWith('.js') || f.name.endsWith('.ts')))
      .map(f => f.name);
    for (const extFile of extFiles) {
      cliFlags.push('--extension', path.join(userExtensionsDir, extFile));
    }
  }

  const candidateIntegrationsDirs = [
    path.join(userRoot, 'Fabrica_kernel', 'integrations'),
    '/mnt/Fabrica_kernel/integrations',
    '/Fabrica_kernel/integrations',
    path.join(process.cwd(), 'Fabrica_kernel', 'integrations')
  ];
  const integrationsDir = candidateIntegrationsDirs.find(d => fs.existsSync(d));
  if (integrationsDir) {
    const integrationsEnabled: Record<string, boolean> = harnessData.integrations_enabled || {};
    const integrationDirs = fs.readdirSync(integrationsDir, { withFileTypes: true })
      .filter(d => d.isDirectory())
      .map(d => d.name);
    for (const integrationName of integrationDirs) {
      if (!integrationsEnabled[integrationName]) continue;
      const integrationSkillsPath = path.join(integrationsDir, integrationName, 'skills');
      if (fs.existsSync(integrationSkillsPath)) {
        cliFlags.push('--skill', integrationSkillsPath);
      }
      const integrationExtPath = path.join(integrationsDir, integrationName, 'extensions');
      if (fs.existsSync(integrationExtPath)) {
        const extFiles = fs.readdirSync(integrationExtPath).filter(f => f.endsWith('.js'));
        for (const extFile of extFiles) {
          cliFlags.push('--extension', path.join(integrationExtPath, extFile));
        }
      }
    }
  }

  cliFlags.push('--no-context-files');

  const agentsMdPath = path.join(userRoot, 'AGENTS.md');
  if (fs.existsSync(agentsMdPath)) {
    const agentsMdContent = fs.readFileSync(agentsMdPath, 'utf8').trim();
    if (agentsMdContent) {
      cliFlags.push('--append-system-prompt',
        `[CRITICAL MEMORY CONTEXT DIRECTIVE: AGENTS.md is your long-running memory. Read it via @${agentsMdPath} for context. Append important things (user preferences, project info, goals). Audit it if anything changes — no outdated info.]`);
    }
  }

  const systemPrompts = loadKernelSystemPrompts(tenantId);
  if (systemPrompts.trim()) {
    cliFlags.push('--append-system-prompt', systemPrompts.trim());
  }

  return {
    cwd: userRoot,
    piCodingAgentDir: piDir,
    env: {
      ...process.env,
      PI_CODING_AGENT_DIR: piDir
    },
    cliFlags
  };
}
