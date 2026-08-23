const { execSync } = require('child_process');

// Simulate the same restricted env that buildSafeEnv() creates
const env = {};
if (process.env.PATH) env.PATH = process.env.PATH;
if (process.env.Path) env.Path = process.env.Path;
const home = process.env.HOME || process.env.USERPROFILE;
if (home) env.HOME = home;
if (process.env.USERPROFILE) env.USERPROFILE = process.env.USERPROFILE;
if (process.env.APPDATA) env.APPDATA = process.env.APPDATA;
if (process.env.LOCALAPPDATA) env.LOCALAPPDATA = process.env.LOCALAPPDATA;
if (process.env.TEMP) env.TEMP = process.env.TEMP;
if (process.env.TMP) env.TMP = process.env.TMP;
if (process.env.SystemRoot) env.SystemRoot = process.env.SystemRoot;
if (process.env.SYSTEMROOT) env.SYSTEMROOT = process.env.SYSTEMROOT;
if (process.env.WINDIR) env.WINDIR = process.env.WINDIR;
if (process.env.COMSPEC) env.COMSPEC = process.env.COMSPEC;
if (process.env.PATHEXT) env.PATHEXT = process.env.PATHEXT;

console.log('Restricted env vars:', Object.keys(env).join(', '));
console.log('HOME:', env.HOME);
console.log('APPDATA:', env.APPDATA);

try {
  const result = execSync('claude auth status', {
    env: env,
    encoding: 'utf-8',
    timeout: 15000,
    windowsHide: true
  });
  console.log('\nAuth status (restricted env):', result);
} catch (err) {
  console.log('\nFAILED with restricted env:');
  console.log('  stdout:', err.stdout);
  console.log('  stderr:', err.stderr);
  console.log('  exit code:', err.status);
}
