const { execSync } = require('child_process');

// Start with the restricted env that buildSafeEnv() creates
const baseEnv = {};
if (process.env.PATH) baseEnv.PATH = process.env.PATH;
if (process.env.Path) baseEnv.Path = process.env.Path;
const home = process.env.HOME || process.env.USERPROFILE;
if (home) baseEnv.HOME = home;
if (process.env.USERPROFILE) baseEnv.USERPROFILE = process.env.USERPROFILE;
if (process.env.APPDATA) baseEnv.APPDATA = process.env.APPDATA;
if (process.env.LOCALAPPDATA) baseEnv.LOCALAPPDATA = process.env.LOCALAPPDATA;
if (process.env.TEMP) baseEnv.TEMP = process.env.TEMP;
if (process.env.TMP) baseEnv.TMP = process.env.TMP;
if (process.env.SystemRoot) baseEnv.SystemRoot = process.env.SystemRoot;
if (process.env.SYSTEMROOT) baseEnv.SYSTEMROOT = process.env.SYSTEMROOT;
if (process.env.WINDIR) baseEnv.WINDIR = process.env.WINDIR;
if (process.env.COMSPEC) baseEnv.COMSPEC = process.env.COMSPEC;
if (process.env.PATHEXT) baseEnv.PATHEXT = process.env.PATHEXT;

// Get all env vars that are NOT in the base set
const baseKeys = new Set(Object.keys(baseEnv).map(k => k.toUpperCase()));
const missing = Object.keys(process.env).filter(k => !baseKeys.has(k.toUpperCase()));

console.log('Missing env vars from full env:', missing.length);
console.log(missing.join(', '));

// Test with full env first
try {
  const r = execSync('claude auth status', { env: process.env, encoding: 'utf-8', timeout: 10000, windowsHide: true });
  console.log('\nFull env auth:', JSON.parse(r).loggedIn ? 'LOGGED IN' : 'NOT LOGGED IN');
} catch(e) {
  console.log('\nFull env auth: FAILED');
}

// Binary search: add each missing var one at a time
async function findKey() {
  for (const key of missing) {
    const testEnv = { ...baseEnv, [key]: process.env[key] };
    try {
      const r = execSync('claude auth status', { env: testEnv, encoding: 'utf-8', timeout: 10000, windowsHide: true });
      const parsed = JSON.parse(r);
      if (parsed.loggedIn) {
        console.log('\nFOUND IT! Adding', key, '=', process.env[key], 'makes auth work!');
        return;
      }
    } catch(e) {
      // still not logged in
    }
  }

  // If single vars don't work, try groups
  console.log('\nNo single var fixes it. Trying batch additions...');

  // Try adding all missing vars at once
  const allEnv = { ...baseEnv };
  missing.forEach(k => { allEnv[k] = process.env[k]; });
  try {
    const r = execSync('claude auth status', { env: allEnv, encoding: 'utf-8', timeout: 10000, windowsHide: true });
    const parsed = JSON.parse(r);
    console.log('All vars added:', parsed.loggedIn ? 'LOGGED IN' : 'NOT LOGGED IN');
  } catch(e) {
    console.log('All vars added: FAILED');
  }
}

findKey();
