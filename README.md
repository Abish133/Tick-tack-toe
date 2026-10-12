# Tic Tac Toe: Elemental Arena

**[Play the Railway cloud playtest](https://elemental-arena-production.up.railway.app)** — runs independently of your laptop; Railway account/trial limits apply.

A Next.js and Socket.IO strategy game with a MySQL source of truth. Ranked Elemental Battle is the flagship: three equipped powers chosen from all 22, 20-second turns and a target match length of 2–5 minutes. Cosmetic progression avoids selling combat strength.

The release pipeline runs engine/provider tests, real MySQL transactions and sockets, fresh Linux container boot and coordinator takeover, a production build, and actual Chromium game flows. See [current validation status](docs/STATUS.md) for completed runs and provider activation boundaries.

**On this laptop, double-click `START-GAME.cmd` to launch.** The app opens at `http://localhost:3000`. Double-click `STOP-GAME.cmd` to stop it. Keep this folder together; the managed database and private environment are stored inside its excluded `.runtime` and `.env` paths.

Use `CREATE-ADMIN.cmd` to provision your chosen administrator through the local operator prompt.

See [setup and troubleshooting](docs/SETUP.md), [game rules](docs/RULES.md), [backend and provider configuration](docs/BACKEND.md), [generated artwork](docs/ASSETS.md), [implementation and verification status](docs/STATUS.md), [cloud deployment operations](docs/DEPLOYMENT.md), [cloud verification evidence](docs/cloud-verification.json), and the source below.

The implemented game includes human Ranked, Quick, Classic and private multiplayer; validated elemental powers; seven AI levels; accounts and guest upgrades; five leaderboard categories; editable profiles with privacy controls; replays and tactical highlights; earned-coin cosmetics; friend invitations and spectating; daily and weekly rewards; seasonal XP; tournaments; and protected administration. Ranked queues require another real player; they never substitute a bot. Classic games use one round, while Elemental games use up to three rounds.

All 22 powers have deterministic mechanics, server validation, targeting controls, effects, training scenarios and replay explanations. Interactive lessons, daily puzzles and offline Classic extend practice. The premium cosmetic journey unlocks with 900 earned coins and grants five exclusive styles through real season XP. Razorpay checkout, native Android AdMob rewards, Google sign-in and email adapters are implemented; activate them using your provider accounts following [COMMERCE.md](docs/COMMERCE.md). No provider is presented as live before configuration.

The Railway game uses one coordinator and private MySQL, with a database ownership lock and automatic match recovery during releases. Native GitHub autodeploy should follow main with Wait for CI enabled; [DEPLOYMENT.md](docs/DEPLOYMENT.md) records the setup and deployment evidence. Multiple simultaneously active coordinators require distributed queues and presence. Operational moderation, provider activation and representative human balance/load testing remain owner responsibilities. The 2–5-minute duration is an initial target.

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
| `mobile/android/` | Trusted HTTPS Android application and native AdMob bridge |
| `.github/workflows/` | Tested web release gate and real Android APK build |

```powershell
node scripts/setup-local.mjs
npm run dev
```

Production uses `npm run build` followed by `npm start`. Docker Compose provides an alternative MySQL 8.4 and app deployment. Full instructions and hosting limits are in `docs/SETUP.md`.
