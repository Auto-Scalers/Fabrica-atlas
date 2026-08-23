import fs from 'fs';
import path from 'path';
import YAML from 'yaml';
import { nowIso } from './general.utils.js';

export function readYaml(filePath: string): any {
  try {
    if (fs.existsSync(filePath)) {
      const text = fs.readFileSync(filePath, 'utf8');
      return YAML.parse(text) || {};
    }
  } catch (e: any) {
    console.error(`[read] ${filePath}: ${e.message}`);
  }
  return {};
}

export function writeYaml(filePath: string, data: any): void {
  const dir = path.dirname(filePath);
  const tempPath = path.join(dir, `.tmp_${path.basename(filePath)}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`);
  try {
    fs.mkdirSync(dir, { recursive: true });
    const text = YAML.stringify(data, { indent: 2, lineWidth: 4096 });
    fs.writeFileSync(tempPath, text, 'utf8');
    fs.renameSync(tempPath, filePath);
  } catch (e: any) {
    console.error(`[write] ${filePath}: ${e.message}`);
    if (fs.existsSync(tempPath)) {
      try { fs.unlinkSync(tempPath); } catch {}
    }
  }
}

export function stripFreshness(obj: any): any {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) {
    return obj.map(stripFreshness);
  }
  const result: any = {};
  for (const key of Object.keys(obj)) {
    if (key !== 'freshness') {
      result[key] = stripFreshness(obj[key]);
    }
  }
  return result;
}

export function hasRealChange(oldData: any, newData: any): boolean {
  return JSON.stringify(stripFreshness(oldData)) !== JSON.stringify(stripFreshness(newData));
}

export function stampFreshness(block: any): any {
  if (!block || typeof block !== 'object') block = {};
  const fr = block.freshness || {};
  fr.sync_status = 'fresh';
  fr.sync_count = (parseInt(fr.sync_count) || 0) + 1;
  fr.last_synced = nowIso();
  block.freshness = fr;
  return block;
}

export function smartWrite(filePath: string, oldData: any, newData: any): boolean {
  if (hasRealChange(oldData, newData)) {
    stampFreshness(newData);
    writeYaml(filePath, newData);
    return true;
  }
  return false;
}
