import fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import crypto from 'node:crypto';
import { spawn, execFileSync } from 'node:child_process';
import { root, runtime, envFile, writeEnv, sleep } from './local-utils.mjs';

const adminFile = path.join(runtime, 'mysql-admin.json');
const pidFile = path.join(runtime, 'mysql-process.json');
const data = path.join(runtime, 'mysql-data');
const secret = () => crypto.randomBytes(32).toString('hex');

function findMysql() {
  const configured = process.env.MYSQL_BASEDIR || envFile().MYSQL_BASEDIR;
  const candidates = [configured, path.join(runtime, 'mysql'), 'C:/Program Files/MySQL/MySQL Server 8.4', 'C:/Program Files/MySQL/MySQL Server 8.0'].filter(Boolean);
  for (const base of candidates) if (fs.existsSync(path.join(base, 'bin', 'mysqld.exe'))) return path.resolve(base);
  throw new Error('MySQL Server 8.x binaries were not found. Install MySQL Community Server 8.x, or set MYSQL_BASEDIR in .env to its installation folder. Docker is an alternative; see docs/SETUP.md.');
}
async function listening(port) {
  return new Promise(resolve => {
    const socket = net.connect({ host: '127.0.0.1', port });
    socket.setTimeout(400);
    socket.once('connect', () => { socket.destroy(); resolve(true); });
    socket.once('error', () => resolve(false));
    socket.once('timeout', () => { socket.destroy(); resolve(false); });
  });
}
function ownedProcess(record) {
  if (!record?.pid) return false;
  try {
    const command = execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', `(Get-CimInstance Win32_Process -Filter "ProcessId = ${Number(record.pid)}").CommandLine`], { windowsHide: true, encoding: 'utf8' });
    return command.toLowerCase().includes(data.toLowerCase()) && command.toLowerCase().includes('mysqld');
  } catch { return false; }
}
function query(base, port, password, sql) {
  return new Promise((resolve, reject) => {
    const child = spawn(path.join(base, 'bin', 'mysql.exe'), ['--no-defaults', '--protocol=TCP', '--host=127.0.0.1', `--port=${port}`, '--user=root', '--batch', '--skip-column-names'], {
      cwd: root, windowsHide: true, env: { ...process.env, MYSQL_PWD: password || '' }, stdio: ['pipe', 'pipe', 'pipe']
    });
    let error = '';
    child.stderr.on('data', chunk => { error += chunk.toString(); });
    child.stdout.resume();
    child.once('error', reject);
    child.once('exit', code => code === 0 ? resolve() : reject(new Error(`MySQL setup failed: ${error.replace(/mysql: \[Warning\].*\n/g, '').trim()}`)));
    child.stdin.end(sql);
  });
}

export async function ensureDatabase() {
  fs.mkdirSync(runtime, { recursive: true });
  const values = envFile();
  if (process.platform !== 'win32') {
    if (!values.DATABASE_URL && !process.env.DATABASE_URL) throw new Error('Set DATABASE_URL for your local MySQL server, or use Docker Compose.');
    return;
  }
  // Explicit external databases are never initialized or reconfigured by this helper.
  if (values.DATABASE_URL && !values.LOCAL_MYSQL_MANAGED) return;
  const base = findMysql();
  const port = Number(process.env.MYSQL_PORT || values.MYSQL_PORT || 3307);
  if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('MYSQL_PORT must be an integer between 1024 and 65535.');
  let record = fs.existsSync(pidFile) ? JSON.parse(fs.readFileSync(pidFile, 'utf8')) : null;
  if (await listening(port)) {
    if (!ownedProcess(record)) throw new Error(`Port ${port} is already in use by another process. Set MYSQL_PORT to an unused port in .env; this helper will never stop an unrelated database.`);
  } else {
    // A closed TCP listener does not mean MySQL has released its data files yet.
    // Reuse an owned startup, or let an owned shutdown finish before spawning.
    if (ownedProcess(record)) {
      for (let attempt = 0; attempt < 100 && ownedProcess(record); attempt++) {
        if (await listening(port)) break;
        await sleep(200);
      }
      if (ownedProcess(record) && !await listening(port)) throw new Error('The project MySQL process is still starting or stopping. Retry the launcher shortly.');
      if (await listening(port)) return ensureDatabase();
    }
    if (!fs.existsSync(path.join(data, 'mysql'))) {
      fs.mkdirSync(data, { recursive: true });
      await new Promise((resolve, reject) => {
        const init = spawn(path.join(base, 'bin', 'mysqld.exe'), ['--no-defaults', '--initialize-insecure', `--basedir=${base}`, `--datadir=${data}`, `--log-error=${path.join(runtime, 'mysql-error.log')}`], { windowsHide: true, stdio: 'ignore' });
        init.once('error', reject);
        init.once('exit', code => code === 0 ? resolve() : reject(new Error('MySQL initialization failed. See .runtime/mysql-error.log.')));
      });
    }
    const child = spawn(path.join(base, 'bin', 'mysqld.exe'), ['--no-defaults', `--basedir=${base}`, `--datadir=${data}`, `--port=${port}`, '--bind-address=127.0.0.1', '--mysqlx=OFF', `--log-error=${path.join(runtime, 'mysql-error.log')}`, `--pid-file=${path.join(runtime, 'mysqld.pid')}`, '--max-connections=80'], { detached: true, windowsHide: true, stdio: 'ignore' });
    child.once('error', error => console.error(`MySQL could not start: ${error.message}`));
    record = { pid: child.pid, base, port, data };
    fs.writeFileSync(pidFile, JSON.stringify(record), { mode: 0o600 });
    child.unref();
    let ready = false;
    for (let attempt = 0; attempt < 100; attempt++) {
      if (await listening(port)) { ready = true; break; }
      if (child.exitCode !== null) break;
      await sleep(300);
    }
    if (!ready) throw new Error('MySQL did not become ready. See .runtime/mysql-error.log.');
  }
  let admin = fs.existsSync(adminFile) ? JSON.parse(fs.readFileSync(adminFile, 'utf8')) : { password: secret(), appPassword: secret(), configured: false };
  fs.writeFileSync(adminFile, JSON.stringify(admin), { mode: 0o600 });
  if (!admin.configured) {
    await query(base, port, '', `ALTER USER 'root'@'localhost' IDENTIFIED BY '${admin.password}';\n`);
    admin.configured = true;
    fs.writeFileSync(adminFile, JSON.stringify(admin), { mode: 0o600 });
  }
  // Passwords are generated as hex, so they cannot introduce SQL syntax.
  await query(base, port, admin.password, `CREATE DATABASE IF NOT EXISTS elemental_arena CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;\nCREATE USER IF NOT EXISTS 'elemental_arena'@'127.0.0.1' IDENTIFIED BY '${admin.appPassword}';\nALTER USER 'elemental_arena'@'127.0.0.1' IDENTIFIED BY '${admin.appPassword}';\nGRANT ALL PRIVILEGES ON elemental_arena.* TO 'elemental_arena'@'127.0.0.1';\n`);
  writeEnv({
    ...values,
    DATABASE_URL: `mysql://elemental_arena:${admin.appPassword}@127.0.0.1:${port}/elemental_arena`,
    AUTH_SECRET: values.AUTH_SECRET || secret(),
    APP_ORIGIN: values.APP_ORIGIN || 'http://localhost:3000',
    PORT: values.PORT || '3000', MYSQL_PORT: String(port), LOCAL_MYSQL_MANAGED: '1'
  });
  console.log(`Isolated MySQL is ready on 127.0.0.1:${port}. Credentials are saved locally in .env.`);
}

export async function stopDatabase() {
  if (!fs.existsSync(pidFile)) return;
  const record = JSON.parse(fs.readFileSync(pidFile, 'utf8'));
  if (!ownedProcess(record)) { fs.rmSync(pidFile, { force: true }); return; }
  const admin = JSON.parse(fs.readFileSync(adminFile, 'utf8'));
  await query(record.base, record.port, admin.password, 'SHUTDOWN;\n');
  for (let attempt = 0; attempt < 100 && ownedProcess(record); attempt++) await sleep(200);
  if (ownedProcess(record)) throw new Error('MySQL accepted shutdown but is still releasing its data files. Wait briefly and retry STOP-GAME.cmd.');
  fs.rmSync(pidFile, { force: true });
  console.log('Project MySQL stopped. Your database files are preserved.');
}
