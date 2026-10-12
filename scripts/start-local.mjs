import fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import { spawn, execFileSync } from 'node:child_process';
import { root, runtime, envFile, npm, run, sleep } from './local-utils.mjs';

const marker = path.join(runtime, 'game-process.json');
const server = path.join(root, 'server.mjs');
function isOurGame(record) {
  if (!record?.pid) return false;
  try {
    const command = execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', `(Get-CimInstance Win32_Process -Filter "ProcessId = ${Number(record.pid)}").CommandLine`], { windowsHide: true, encoding: 'utf8' });
    return command.toLowerCase().includes(server.toLowerCase());
  } catch { return false; }
}
function open(url) {
  if (process.argv.includes('--no-browser')) return;
  if (process.platform === 'win32') spawn('cmd.exe', ['/d', '/c', 'start', '', url], { windowsHide: true, stdio: 'ignore' }).unref();
}
function portInUse(port) {
  return new Promise(resolve => {
    const socket = net.connect({ host: '127.0.0.1', port });
    socket.setTimeout(500);
    socket.once('connect', () => { socket.destroy(); resolve(true); });
    socket.once('error', () => resolve(false));
    socket.once('timeout', () => { socket.destroy(); resolve(true); });
  });
}

try {
  if (process.platform !== 'win32') throw new Error('This launcher targets Windows. Use npm run dev, npm start, or Docker Compose on other systems.');
  fs.mkdirSync(runtime, { recursive: true });
  const existing = fs.existsSync(marker) ? JSON.parse(fs.readFileSync(marker, 'utf8')) : null;
  if (isOurGame(existing)) { console.log(`Elemental Arena is already running at ${existing.url}`); open(existing.url); }
  else {
    const initialValues = envFile();
    const requestedPort = Number(initialValues.PORT || 3000);
    if (!Number.isInteger(requestedPort) || requestedPort < 1024 || requestedPort > 65535) throw new Error('PORT must be an integer between 1024 and 65535.');
    if (await portInUse(requestedPort)) throw new Error(`Port ${requestedPort} is in use. Stop the interactive game server or choose another PORT and APP_ORIGIN in .env.`);
    await run(process.execPath, [path.join(root, 'scripts', 'setup-local.mjs')], { stdio: 'inherit' });
    if (process.argv.includes('--rebuild') || !fs.existsSync(path.join(root, '.next', 'BUILD_ID'))) await npm(['run', 'build']);
    const values = envFile();
    const port = Number(values.PORT || 3000);
    if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('PORT must be an integer between 1024 and 65535.');
    const url = `http://localhost:${port}`;
    if (await portInUse(port)) throw new Error(`Port ${port} is in use. Close that application or change PORT and APP_ORIGIN in .env.`);
    const log = fs.openSync(path.join(runtime, 'game.log'), 'a');
    const child = spawn(process.execPath, [server, '--production'], { cwd: root, env: { ...process.env, ...values, NODE_ENV: 'production' }, detached: true, windowsHide: true, stdio: ['ignore', log, log] });
    child.once('error', error => console.error(`Game could not start: ${error.message}`));
    fs.writeFileSync(marker, JSON.stringify({ pid: child.pid, url, server }), { mode: 0o600 });
    child.unref();
    fs.closeSync(log);
    let ready = false;
    for (let attempt = 0; attempt < 90; attempt++) {
      try { const response = await fetch(url, { signal: AbortSignal.timeout(1500) }); if (response.ok) { ready = true; break; } } catch {}
      await sleep(500);
    }
    if (!ready) throw new Error('Game did not become ready. See .runtime/game.log.');
    console.log(`Elemental Arena is running at ${url}`);
    console.log('Use STOP-GAME.cmd to stop only this project.');
    open(url);
  }
} catch (error) { console.error(error.message); process.exitCode = 1; }
