import fs from 'fs';
import path from 'path';

export function rglobFiles(dirPath: string, rootDir: string): string[] {
  const result: string[] = [];
  function traverse(cur: string) {
    if (!fs.existsSync(cur)) return;
    const stats = fs.statSync(cur);
    if (stats.isDirectory()) {
      for (const child of fs.readdirSync(cur)) {
        if (child.startsWith('.')) continue;
        traverse(path.join(cur, child));
      }
    } else if (stats.isFile()) {
      result.push(path.relative(rootDir, cur).replace(/\\/g, '/'));
    }
  }
  traverse(dirPath);
  return result;
}

export function copyRecursiveSync(src: string, dest: string) {
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyRecursiveSync(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

export function setNestedValue(obj: any, ypath: string[], value: any) {
  let node = obj;
  for (let i = 0; i < ypath.length - 1; i++) {
    const k = ypath[i];
    if (!node[k] || typeof node[k] !== 'object') {
      node[k] = {};
    }
    node = node[k];
  }
  node[ypath[ypath.length - 1]] = value;
}

export function getNestedValue(obj: any, ypath: string[]): any {
  let node = obj;
  for (const k of ypath) {
    if (!node || typeof node !== 'object') return undefined;
    node = node[k];
  }
  return node;
}

export function getTbDiskPath(root: string, prefix: string, kind: string, parents: string[], name: string): string {
  if (kind === 'skill') {
    return path.join(root, '.pi', 'skills', name);
  }
  if (kind === 'plugin' || kind === 'mcp' || kind === 'extension') {
    return path.join(root, '.pi', 'extensions');
  }

  const systemsDir = path.join(root, 'systems');
  const base = fs.existsSync(systemsDir)
    ? path.join(systemsDir, `.${prefix}-toolboxes`)
    : path.join(root, `.${prefix}-toolboxes`);

  if (kind === 'domain') {
    return path.join(base, name);
  }
  if (kind === 'toolbox') {
    return path.join(base, parents[0] || 'domain_general', name);
  }
  if (kind === 'agent') {
    return path.join(base, parents[0] || 'domain_general', parents[1] || 'system_mcp', 'agents', name);
  }
  if (kind === 'skill') {
    return path.join(base, parents[0] || 'domain_general', parents[1] || 'system_mcp', 'skills', name);
  }
  if (kind === 'plugin' || kind === 'mcp' || kind === 'enterprise_tool' || kind === 'website_connection') {
    return path.join(base, 'plugins', name);
  }
  return path.join(base, name);
}

export function getTbYamlPath(kind: string, parents: string[], name: string): string[] {
  if (kind === 'domain') {
    return ["toolboxes", name];
  }
  if (kind === 'toolbox') {
    return ["toolboxes", parents[0], "toolboxes", name];
  }
  if (kind === 'agent') {
    return ["toolboxes", parents[0], "toolboxes", parents[1], "agents", name];
  }
  if (kind === 'skill') {
    return ["toolboxes", parents[0], "toolboxes", parents[1], "skills", name];
  }
  throw new Error(`unknown kind '${kind}'`);
}
