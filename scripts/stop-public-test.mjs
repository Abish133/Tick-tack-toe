import path from 'node:path';
import { root, run } from './local-utils.mjs';
import { stopTunnel, restoreSettings } from './public-test-utils.mjs';
try {
  stopTunnel();
  restoreSettings();
  await run(process.execPath, [path.join(root, 'scripts', 'stop-local.mjs')], { stdio: 'inherit' });
  await run(process.execPath, [path.join(root, 'scripts', 'start-local.mjs'), '--no-browser'], { stdio: 'inherit' });
  console.log('Public test link closed. The local game remains available at its localhost address.');
} catch (error) { console.error(error.message); process.exitCode = 1; }
