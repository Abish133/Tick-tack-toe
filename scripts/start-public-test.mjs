import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { root, runtime, envFile, writeEnv, run, sleep } from './local-utils.mjs';
import { executable, marker, readRecord, ownsTunnel, stopTunnel, saveSettings, restoreSettings } from './public-test-utils.mjs';

const version = '2026.10.0';
const checksum = '86aee4017b26625cee8484c113558f48effa4cd47f7aa05fcf425604e5d2b23c';
let created = false;
try {
  if (process.platform !== 'win32') throw new Error('This test-link launcher targets Windows.');
  const existing = readRecord();
  if (ownsTunnel(existing) && existing.url) {
    const health = await fetch(`${existing.url}/api/health`, { signal: AbortSignal.timeout(15000) }).catch(() => null);
    if (!health?.ok) throw new Error('The existing tunnel is running but unhealthy. Run STOP-PUBLIC-TEST.cmd, then start it again.');
    console.log(`Public test link: ${existing.url}`);
  } else {
    fs.mkdirSync(path.dirname(executable), { recursive: true });
    if (!fs.existsSync(executable)) {
      const response = await fetch(`https://github.com/cloudflare/cloudflared/releases/download/${version}/cloudflared-windows-amd64.exe`);
      if (!response.ok) throw new Error(`Cloudflared download returned ${response.status}.`);
      const bytes = Buffer.from(await response.arrayBuffer());
      if (createHash('sha256').update(bytes).digest('hex') !== checksum) throw new Error('Cloudflared checksum did not match its official release.');
      fs.writeFileSync(executable, bytes);
    }
    if (createHash('sha256').update(fs.readFileSync(executable)).digest('hex') !== checksum) throw new Error('Cloudflared checksum did not match its official release.');
    const port = Number(envFile().PORT || 3000);
    if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('Invalid local PORT.');
    const logFile = path.join(runtime, 'public-test.log');
    const log = fs.openSync(logFile, 'w');
    const child = spawn(executable, ['tunnel', '--no-autoupdate', '--url', `http://127.0.0.1:${port}`, '--protocol', 'http2', '--metrics', '127.0.0.1:0', '--loglevel', 'info'], { cwd: root, windowsHide: true, detached: true, stdio: ['ignore', log, log] });
    child.once('error', error => console.error(error.message));
    fs.writeFileSync(marker, JSON.stringify({ pid: child.pid, executable, port, startedAt: new Date().toISOString() }));
    child.unref(); fs.closeSync(log); created = true;
    let url;
    for (let i = 0; i < 120; i++) {
      const output = fs.readFileSync(logFile, 'utf8');
      url = output.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/)?.[0];
      if (url && output.includes('Registered tunnel connection')) break;
      if (!ownsTunnel(readRecord())) throw new Error('Tunnel exited. See .runtime/public-test.log.');
      await sleep(500);
    }
    if (!url) throw new Error('No public URL received. See .runtime/public-test.log.');
    const record = { ...readRecord(), url };
    fs.writeFileSync(marker, JSON.stringify(record, null, 2));
    saveSettings();
    writeEnv({ APP_ORIGIN: `${url},http://localhost:${port}`, HOST: '127.0.0.1', TRUST_PROXY: 'cloudflare' });
    await run(process.execPath, [path.join(root, 'scripts', 'stop-local.mjs')], { stdio: 'inherit' });
    await run(process.execPath, [path.join(root, 'scripts', 'start-local.mjs'), '--no-browser'], { stdio: 'inherit' });
    let ready = false;
    for (let i = 0; i < 24; i++) {
      try { const response = await fetch(`${url}/api/health`, { signal: AbortSignal.timeout(10000) }); if (response.ok) { ready = true; break; } } catch {}
      await sleep(1000);
    }
    if (!ready) throw new Error('Public health check failed. See .runtime/public-test.log.');
    fs.writeFileSync(path.join(root, 'docs', 'test-link.json'), JSON.stringify({ url, kind: 'temporary-laptop-tunnel', createdAt: record.startedAt, requires: 'Laptop awake, game server and tunnel running' }, null, 2) + '\n');
    console.log(`Public test link: ${url}`);
    console.log('Keep this laptop awake. This is a temporary playtest link. STOP-PUBLIC-TEST.cmd closes it and restores local settings.');
  }
} catch (error) {
  if (created) { stopTunnel(); restoreSettings(); }
  console.error(error.message); process.exitCode = 1;
}
