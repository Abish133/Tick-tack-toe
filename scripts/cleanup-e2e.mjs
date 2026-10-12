import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { PrismaClient } from '@prisma/client';
import { runtime } from './local-utils.mjs';

const manifest = path.join(runtime, 'e2e-test-users.json');
if (!fs.existsSync(manifest)) { console.log('No recorded browser test accounts to clean.'); process.exit(0); }
const ids = JSON.parse(fs.readFileSync(manifest, 'utf8'));
if (!Array.isArray(ids) || ids.some(id => typeof id !== 'string')) throw new Error('Invalid E2E account manifest.');
const db = new PrismaClient();
try {
  const users = await db.user.findMany({ where: { id: { in: ids } }, select: { id: true, name: true, email: true, guest: true } });
  if (users.some(user => !user.name.startsWith('E2E ') || (!user.guest && !/^arena-e2e-.+@example\.test$/.test(user.email || '')))) throw new Error('Manifest contains an account that does not match the browser test fixture. No accounts deleted.');
  const matches = await db.match.findMany({ where: { participants: { some: { userId: { in: ids } } } }, include: { participants: true } });
  if (matches.some(match => match.participants.some(player => player.userId && !ids.includes(player.userId)))) throw new Error('A browser test account interacted with a player outside the fixture. Cleanup stopped to preserve that player\'s history.');
  if (matches.some(match => match.status === 'active')) throw new Error('A test match is still active. Surrender it before cleanup so the running server can settle and remove its in-memory state.');
  const tournamentManifest = path.join(runtime, 'e2e-test-tournaments.json');
  const tournamentIds = fs.existsSync(tournamentManifest) ? JSON.parse(fs.readFileSync(tournamentManifest, 'utf8')) : [];
  const tournaments = await db.tournament.findMany({ where: { id: { in: tournamentIds } }, include: { participants: true } });
  if (tournaments.some(tournament => !tournament.name.startsWith('E2E Cup ') || tournament.participants.some(player => !ids.includes(player.userId)))) throw new Error('A recorded test tournament contains an external player. No records deleted.');
  await db.$transaction(async tx => {
    await tx.tournament.deleteMany({ where: { id: { in: tournamentIds } } });
    await tx.match.deleteMany({ where: { id: { in: matches.map(match => match.id) } } });
    await tx.auditLog.deleteMany({ where: { userId: { in: ids } } });
    await tx.user.deleteMany({ where: { id: { in: ids } } });
  });
  fs.rmSync(manifest);
  fs.rmSync(tournamentManifest, { force: true });
  console.log(`Removed ${users.length} recorded E2E accounts and ${matches.length} completed test matches.`);
} finally { await db.$disconnect(); }
