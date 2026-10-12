import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import { root, npm } from './local-utils.mjs';
import { ensureDatabase } from './local-database.mjs';

try {
  await ensureDatabase();
  if (!process.argv.includes('--database-only')) {
    if (!fs.existsSync(path.join(root, 'node_modules', '@prisma', 'client'))) await npm([fs.existsSync(path.join(root, 'package-lock.json')) ? 'ci' : 'install']);
    const schemaFile=path.join(root,'prisma','schema.prisma');
    const generatedSchema=path.join(root,'node_modules','.prisma','client','schema.prisma');
    const schemaHash=file=>createHash('sha256').update(fs.readFileSync(file,'utf8').replace(/"(?:[^"\\]|\\.)*"|\s+/g,part=>part.startsWith('"')?part:'')).digest('hex');
    // Rewriting an unchanged native client can fail on Windows while a viewer holds its DLL.
    const clientReady=fs.existsSync(path.join(root,'node_modules','.prisma','client','index.js'))&&fs.existsSync(generatedSchema)&&schemaHash(schemaFile)===schemaHash(generatedSchema);
    if(!clientReady)await npm(['exec', 'prisma', 'generate']);
    if (fs.existsSync(path.join(root, 'prisma', 'migrations'))) await npm(['exec', 'prisma', 'migrate', 'deploy']);
    else await npm(['exec', 'prisma', 'db', 'push']);
    if (fs.existsSync(path.join(root, 'prisma', 'seed.mjs'))) await npm(['run', 'db:seed']);
    console.log('Local setup completed. Run START-GAME.cmd to launch the game.');
  }
} catch (error) { console.error(error.message); process.exitCode = 1; }
