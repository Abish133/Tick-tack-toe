# Tic Tac Toe: Elemental Arena

**[Play the Railway cloud playtest](https://elemental-arena-production.up.railway.app)** — runs independently of your laptop; Railway account/trial limits apply.

A Next.js and Socket.IO strategy game with a MySQL source of truth. Ranked Elemental Battle is the flagship design: three equipped powers per player, 20-second turns, a target match length of 2–5 minutes, and progressively enabled powers. Cosmetic progression avoids selling combat strength.

**Verified:** local and Linux cloud production builds; 59 core tests plus 12 proxy/bootstrap safety tests; seven local browser flows and seven cloud browser flows; 24 local layout checks plus desktop/mobile cloud checks. Cloud browser verification passed in 4.1 minutes.

**On this laptop, double-click `START-GAME.cmd` to launch.** The app opens at `http://localhost:3000`. Double-click `STOP-GAME.cmd` to stop it. Keep this folder together; the managed database and private environment are stored inside its excluded `.runtime` and `.env` paths.

Use `CREATE-ADMIN.cmd` to provision your chosen administrator through the local operator prompt.

See [setup and troubleshooting](docs/SETUP.md), [game rules](docs/RULES.md), [backend and provider configuration](docs/BACKEND.md), [generated artwork](docs/ASSETS.md), [implementation and verification status](docs/STATUS.md), [cloud deployment operations](docs/DEPLOYMENT.md), [cloud verification evidence](docs/cloud-verification.json), and the source below.

The implemented game includes human Ranked, Quick, Classic and private multiplayer; validated elemental powers; seven AI levels; accounts and guest upgrades; five leaderboard categories; editable profiles with privacy controls; replays and tactical highlights; earned-coin cosmetics; friend invitations and spectating; daily and weekly rewards; seasonal XP; tournaments; and protected administration. Ranked queues require another real player; they never substitute a bot. Classic games use one round, while Elemental games use up to three rounds.

Six powers are released and sixteen further concepts are explicitly planned. Interactive lessons, a shared daily puzzle, and Classic that works offline after its first visit extend practice. Google sign-in and reset/verification emails require the operator's provider credentials and delivery adapter. Real-money checkout, premium passes and rewarded ads are unavailable. The Railway playtest runs one game server with a private MySQL database. Commercial release still needs backups, ongoing monitoring, moderation and human load/balance testing. Multiple server replicas require distributed coordination. The 2–5-minute duration is a playtest target, not a measured guarantee.

| Folder or file | Purpose |
| --- | --- |
| `src/app/` | Next.js App Router interface and route handlers |
| `src/lib/game-engine/` | Game rules and power definitions |
| `src/server/` | Authentication, persistence, matchmaking, and real-time server helpers |
| `server.mjs` | Persistent Next.js + Socket.IO entry point |
| `prisma/` | MySQL schema, migrations, and catalog seed |
| `public/assets/` | Generated arena and game artwork |
| `tests/` | Automated verification |
| `scripts/` | Local database and launch lifecycle |

```powershell
node scripts/setup-local.mjs
npm run dev
```

Production uses `npm run build` followed by `npm start`. Docker Compose provides an alternative MySQL 8.4 and app deployment. Full instructions and hosting limits are in `docs/SETUP.md`.
