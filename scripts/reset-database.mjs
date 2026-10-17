// Irreversibly deletes every row in the game database (players, guests, wallets,
// purchases, matches, replays, leaderboards, tournaments, audit log and the catalog),
// then re-seeds the catalog so the game starts fresh with zero players.
//
// Stop the game first (it holds the coordinator lock and caches active matches), take a
// backup, then run with the database name typed back as confirmation:
//   RESET_CONFIRM=<database name> node scripts/reset-database.mjs
import 'dotenv/config';
import { spawnSync } from 'node:child_process';
import { PrismaClient } from '@prisma/client';

const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL is not set.');
const database = decodeURIComponent(new URL(url).pathname.slice(1));
if (!database || process.env.RESET_CONFIRM !== database)
  throw new Error(`Refusing to reset. Set RESET_CONFIRM=${database || '<database name>'} to delete every row in this database.`);

const db = new PrismaClient();
let cleared = 0;
try {
  const tables = (await db.$queryRaw`SELECT TABLE_NAME AS name FROM information_schema.TABLES
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_TYPE = 'BASE TABLE' AND TABLE_NAME <> '_prisma_migrations'`)
    .map(row => row.name);
  // One connection for the whole wipe so the foreign-key switch applies to every TRUNCATE.
  await db.$transaction(async tx => {
    await tx.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS = 0');
    for (const table of tables) {
      await tx.$executeRawUnsafe(`TRUNCATE TABLE \`${table.replaceAll('`', '``')}\``);
      cleared += 1;
    }
    await tx.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS = 1');
  }, { timeout: 120_000 });
} finally {
  await db.$disconnect();
}
console.log(`Cleared ${cleared} tables in ${database}. Re-seeding the catalog...`);
const seed = spawnSync(process.execPath, ['prisma/seed.mjs'], { stdio: 'inherit', env: process.env });
if (seed.status !== 0) throw new Error('Seeding failed. Run `npm run db:seed` before starting the game.');
console.log('Reset complete: no players, fresh catalog.');
