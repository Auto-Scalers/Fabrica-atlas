import fs from 'fs';
import { execFileSync } from 'child_process';
import { PiModelItem } from '../../types/harness.types.js';

export const DEFAULT_PI_CLI_FALLBACK_MODELS: PiModelItem[] = [
  { provider: 'google', model: 'gemini-3.6-flash', fullModel: 'google/gemini-3.6-flash', context: '1.0M', maxOutput: '65.5K', thinking: true, images: true },
  { provider: 'google', model: 'gemini-2.0-flash', fullModel: 'google/gemini-2.0-flash', context: '1.0M', maxOutput: '8.2K', thinking: false, images: true },
  { provider: 'google', model: 'gemma-4-31b-it', fullModel: 'google/gemma-4-31b-it', context: '262.1K', maxOutput: '32.8K', thinking: true, images: true },
  { provider: 'openrouter', model: 'anthropic/claude-3.5-sonnet', fullModel: 'openrouter/anthropic/claude-3.5-sonnet', context: '200K', maxOutput: '8K', thinking: true, images: true },
  { provider: 'openrouter', model: 'deepseek/deepseek-r1', fullModel: 'openrouter/deepseek/deepseek-r1', context: '128K', maxOutput: '8K', thinking: true, images: false },
  { provider: 'openrouter', model: 'openai/gpt-4o', fullModel: 'openrouter/openai/gpt-4o', context: '128K', maxOutput: '4K', thinking: false, images: true },
  { provider: 'anthropic', model: 'claude-3-5-sonnet-latest', fullModel: 'anthropic/claude-3-5-sonnet-latest', context: '200K', maxOutput: '8K', thinking: true, images: true },
  { provider: 'openai', model: 'gpt-4o', fullModel: 'openai/gpt-4o', context: '128K', maxOutput: '4K', thinking: false, images: true }
];

export function listPiModels(): PiModelItem[] {
  try {
    let piBin = 'pi';
    if (fs.existsSync('/app/applet/node_modules/.bin/pi')) piBin = '/app/applet/node_modules/.bin/pi';
    else if (fs.existsSync('./node_modules/.bin/pi')) piBin = './node_modules/.bin/pi';

    const stdout = execFileSync(piBin, ['--list-models'], { encoding: 'utf8', timeout: 10000 });
    const items: PiModelItem[] = [];
    for (const line of stdout.split('\n')) {
      if (!line.trim() || line.startsWith('provider')) continue;
      const parts = line.trim().split(/\s+/);
      if (parts.length >= 2) {
        items.push({
          provider: parts[0],
          model: parts[1],
          fullModel: `${parts[0]}/${parts[1]}`,
          context: parts[2] || '128K',
          maxOutput: parts[3] || '8K',
          thinking: parts[4] === 'yes',
          images: parts[5] === 'yes'
        });
      }
    }
    return items.length > 0 ? items : DEFAULT_PI_CLI_FALLBACK_MODELS;
  } catch (_) {
    return DEFAULT_PI_CLI_FALLBACK_MODELS;
  }
}
