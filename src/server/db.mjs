import { PrismaClient } from '@prisma/client';
export const db = globalThis.__elementalPrisma || new PrismaClient({
  // Prisma's defaults (2s to get a connection, 5s to finish) fail ordinary purchases
  // when the remote database is slow or the pool is busy with match pulses.
  transactionOptions:{maxWait:10000,timeout:15000},
  log:process.env.DB_DEBUG==='true'?['warn','error']:['error']});
globalThis.__elementalPrisma = db;
