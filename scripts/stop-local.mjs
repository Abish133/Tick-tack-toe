import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { root, runtime } from './local-utils.mjs';
import { stopDatabase } from './local-database.mjs';

try {
  const marker = path.join(runtime, 'game-process.json');
  if (fs.existsSync(marker)) {
    const record = JSON.parse(fs.readFileSync(marker, 'utf8'));
    let command = '';
    try { command = execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', `(Get-CimInstance Win32_Process -Filter "ProcessId = ${Number(record.pid)}").CommandLine`], { windowsHide: true, encoding: 'utf8' }); } catch {}
    if (command.toLowerCase().includes(path.join(root, 'server.mjs').toLowerCase())) {
      execFileSync('taskkill.exe', ['/PID', String(record.pid), '/T', '/F'], { windowsHide: true, stdio: 'ignore' });
      console.log('Game server stopped.');
    }
    fs.rmSync(marker, { force: true });
  }
  await stopDatabase();
  console.log('Elemental Arena is stopped. Saved accounts and match history remain in .runtime/mysql-data.');
} catch (error) { console.error(error.message); process.exitCode = 1; }
