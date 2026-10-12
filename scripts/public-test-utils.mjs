import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { root, runtime, envFile } from './local-utils.mjs';

export const executable = path.join(runtime, 'tools', 'cloudflared.exe');
export const marker = path.join(runtime, 'public-test-process.json');
export const settings = path.join(runtime, 'public-test-settings.json');
export const readRecord = () => fs.existsSync(marker) ? JSON.parse(fs.readFileSync(marker, 'utf8')) : null;
export function ownsTunnel(record) {
  if (!Number.isInteger(record?.pid) || record.pid <= 0) return false;
  try {
    const command = execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', `(Get-CimInstance Win32_Process -Filter "ProcessId = ${record.pid}").CommandLine`], { windowsHide: true, encoding: 'utf8' });
    return command.toLowerCase().includes(executable.toLowerCase()) && command.includes('tunnel') && command.includes('--url');
  } catch { return false; }
}
export function stopTunnel() {
  const record = readRecord();
  if (ownsTunnel(record)) execFileSync('taskkill.exe', ['/PID', String(record.pid), '/T', '/F'], { windowsHide: true, stdio: 'ignore' });
  fs.rmSync(marker, { force: true });
}
export function saveSettings() {
  if (fs.existsSync(settings)) return;
  const values = envFile();
  fs.writeFileSync(settings, JSON.stringify(Object.fromEntries(['APP_ORIGIN', 'HOST', 'TRUST_PROXY'].map(key => [key, values[key] ?? null])), null, 2));
}
export function restoreSettings() {
  if (!fs.existsSync(settings)) return;
  const values = envFile();
  for (const [key, value] of Object.entries(JSON.parse(fs.readFileSync(settings, 'utf8')))) {
    if (value === null) delete values[key]; else values[key] = value;
  }
  fs.writeFileSync(path.join(root, '.env'), Object.entries(values).map(([key, value]) => `${key}=${value}`).join('\n') + '\n', { mode: 0o600 });
  fs.rmSync(settings, { force: true });
}
