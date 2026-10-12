import fs from 'node:fs';
import path from 'node:path';
import { runtime } from './local-utils.mjs';

// Operator-only, one-shot job. No HTTP listener or public endpoint is created.
if (process.env.E2E_CLEANUP_JOB !== 'confirmed') throw new Error('Explicit E2E_CLEANUP_JOB=confirmed is required.');
function ids(value, label, required) {
  let parsed;
  try { parsed = JSON.parse(value || '[]'); } catch { throw new Error(`Invalid ${label} manifest.`); }
  if (!Array.isArray(parsed) || parsed.length > 100 || (required && !parsed.length) || parsed.some(id => typeof id !== 'string' || !id.length || id.length > 191)) throw new Error(`Invalid ${label} manifest.`);
  return [...new Set(parsed)];
}
const users = ids(process.env.E2E_USER_IDS_JSON, 'user', true);
const tournaments = ids(process.env.E2E_TOURNAMENT_IDS_JSON, 'tournament', false);
if (!process.env.DATABASE_URL) throw new Error('The private game DATABASE_URL is required.');
fs.mkdirSync(runtime, { recursive: true });
fs.writeFileSync(path.join(runtime, 'e2e-test-users.json'), JSON.stringify(users), { mode: 0o600 });
fs.writeFileSync(path.join(runtime, 'e2e-test-tournaments.json'), JSON.stringify(tournaments), { mode: 0o600 });
// The existing guard verifies names, emails, finished matches and every opponent
// before deleting anything. A non-fixture account or outside opponent aborts.
await import('./cleanup-e2e.mjs');
