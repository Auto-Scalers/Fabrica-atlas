import fs from 'fs';
import path from 'path';
import { getTenantRoot } from '../tenant/tenant.manager.js';
import { getHarnessState } from './harness.engine.js';

export function sanitizeText(text: string): string {
  if (!text) return text;
  return text
    .replace(/AIzaSy[A-Za-z0-9_\-]{33}/g, 'AIzaSy*********************************')
    .replace(/sk-proj-[A-Za-z0-9_\-]{30,}/g, 'sk-proj-********************************')
    .replace(/sk-ant-[A-Za-z0-9_\-]{30,}/g, 'sk-ant-********************************')
    .replace(/sk-or-v1-[A-Za-z0-9_\-]{30,}/g, 'sk-or-v1-********************************')
    .replace(/sk-[A-Za-z0-9]{32,}/g, 'sk-********************************');
}

export function buildRunDirectives(tenantId: string = 'default_user'): string {
  const harnessData = getHarnessState(tenantId);
  let directives = '';

  const actions = harnessData.new_user_actions || {};
  const allActions = [
    ...(actions.backlog_actions || []),
    ...(actions.reviews_actions || []),
    ...(actions.missions_actions || []),
    ...(actions.workspace_actions || [])
  ];
  if (allActions.length > 0) {
    directives += `\n\n[USER ACTIONS SINCE LAST TURN]:\n${allActions.map((a: any) => `- ${a.action} (${a.timestamp})`).join('\n')}`;
  }

  const backlog = (harnessData.backlog || []);
  const validatedBacklog = backlog.filter((item: any) => typeof item === 'string' || !item.type || item.type === 'validated');
  if (validatedBacklog.length > 0) {
    const items = validatedBacklog.map((item: any, i: number) => `${i + 1}. ${typeof item === 'string' ? item : item.text}`).join('\n');
    directives += `\n\n[VALIDATED BACKLOGS - Prioritized Goals]:\n${items}\n(Monitor for drift — flag if your work deviates from these goals)`;
  }

  const review = (harnessData.review || []);
  if (review.length > 0) {
    const pending = review.filter((r: any) => typeof r === 'string' || !r.type || r.type === 'pending');
    const reviewed = review.filter((r: any) => r.type === 'reviewed');
    if (pending.length > 0) {
      directives += `\n\n[PENDING REVIEWS - Awaiting Validation]:\n${pending.map((r: any) => `- ${typeof r === 'string' ? r : r.label || r.text}`).join('\n')}\n(Address these in your next turn if relevant)`;
    }
    if (reviewed.length > 0) {
      directives += `\n\n[REVIEWED ITEMS - User Feedback Applied]:\n${reviewed.map((r: any) => `- ${r.label || r.text}${r.feedback ? ': ' + r.feedback : ''}`).join('\n')}`;
    }
  }

  directives += '\n\n[SUGGESTIONS AUDIT]: Review your current suggestions in runtime-board.json. Ensure they are relevant, actionable, and no more than 3. Replace stale suggestions with fresh ones based on current workspace context.';

  return directives;
}

export function loadKernelSystemPrompts(tenantId: string = 'default_user'): string {
  const candidatePromptsDirs = [
    path.join(process.cwd(), 'system_prompts'),
    '/system_prompts'
  ];
  const kernelPromptsDir = candidatePromptsDirs.find(d => fs.existsSync(d));
  let combinedPrompts = '';

  if (kernelPromptsDir) {
    const files = fs.readdirSync(kernelPromptsDir).filter(f => f.endsWith('.md')).sort();
    for (const f of files) {
      try {
        const content = fs.readFileSync(path.join(kernelPromptsDir, f), 'utf8');
        if (content.trim()) {
          combinedPrompts += `\n\n[SYSTEM DIRECTIVE (${f})]:\n${content.trim()}`;
        }
      } catch (_) {}
    }
  }

  const harnessData = getHarnessState(tenantId);
  combinedPrompts += `\n\n[HARNESS STATE]:\n` +
    `- Output Language: ${harnessData.output_language || harnessData.agent_lang || 'EN'}`;

  if (harnessData.web_search_enabled) {
    combinedPrompts += '\n\n[CRITICAL WEB DIRECTIVE: Use live web tools for search and grounding when Needed.]';
  }

  combinedPrompts += buildRunDirectives(tenantId);

  return combinedPrompts;
}
