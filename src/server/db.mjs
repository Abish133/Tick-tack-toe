import { PrismaClient } from '@prisma/client';
export const db = globalThis.__elementalPrisma || new PrismaClient({log:process.env.DB_DEBUG==='true'?['warn','error']:['error']});
globalThis.__elementalPrisma = db;
