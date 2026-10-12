# Running Elemental Arena on this laptop

Keep this entire `ElementalArena` folder together. Its source, generated artwork, database, logs, and launchers live here.

## Quick launch on Windows

Double-click `START-GAME.cmd`. The launcher prepares the local database, applies Prisma migrations, runs the idempotent catalog seed, builds the app when needed, starts the persistent game server in the background, and opens `http://localhost:3000`.

The first build takes longer than subsequent launches. Double-click `STOP-GAME.cmd` to stop the project server and its project database. Closing the browser leaves the game server running. Launching again reopens the existing instance.

On this laptop, the helper uses the installed **MySQL Community Server 8.0.44** executable. It runs a separate server bound to `127.0.0.1:3307` with its own data directory. It does not alter the existing `MySQL80` Windows service or that service's data. MySQL 8.4 is also supported by the helper.

Prerequisites for another Windows laptop:

- Node.js 22 or later.
- MySQL Community Server 8.0 or 8.4 binaries. The helper finds standard installation folders, `.runtime/mysql`, or `MYSQL_BASEDIR` from `.env`.
- Internet access for the first dependency installation.

Do not copy `.env.example` to `.env` for the managed Windows setup. The setup creates `.env` with random secrets automatically. The example is a reference for manually configured databases.

## Files you should preserve

| Path | Contents |
| --- | --- |
| `.env` | Database connection and authentication secret. Keep private. |
| `.runtime/mysql-data/` | Saved accounts, match history, ranks, inventory, and other MySQL records. |
| `.runtime/mysql-admin.json` | Random credentials for the isolated database. Keep private. |
| `.runtime/mysql-error.log` | Database diagnostics. |
| `.runtime/game.log` | Game server diagnostics from the background launcher. |
| `public/assets/` | Images used by the interface. |

Use `STOP-GAME.cmd` before copying the whole folder for a local backup. Do not delete `.runtime/mysql-data` to troubleshoot a launch error; deleting it removes saved data. `.env` and `.runtime` are excluded from version control and Docker build context.

## Terminal workflow

Run commands from this folder:

```powershell
node scripts/setup-local.mjs
npm run dev
```

Development uses the same persistent Node server, with Next development mode enabled. For an optimized production build:

```powershell
npm run build
npm start
```

You can force the background launcher to rebuild after editing source:

```powershell
node scripts/stop-local.mjs
node scripts/start-local.mjs --rebuild
```

`STOP-GAME.cmd` only stops processes launched and tracked by this project's background launcher. Stop an interactive `npm run dev` session with `Ctrl+C` in its terminal.

## Port or installation conflicts

The helper refuses to use a port owned by an unrelated process. To select another database port, add `MYSQL_PORT=3308` to `.env`; stop this project's database before changing its port. To select another app port, change both `PORT` and `APP_ORIGIN`, for example `PORT=3002` and `APP_ORIGIN=http://localhost:3002`.

If MySQL is installed elsewhere, add `MYSQL_BASEDIR=C:/path/to/mysql` to `.env`. The folder must contain `bin/mysqld.exe` and `bin/mysql.exe`.

For an existing external MySQL database, set `DATABASE_URL` and a random `AUTH_SECRET` in `.env`, with `APP_ORIGIN` and `PORT`. Omit `LOCAL_MYSQL_MANAGED`. The helper will apply the app schema to that database but will not initialize or manage its MySQL process. Use a dedicated database, never a database shared with another application.

## Docker alternative

Docker is optional and uses MySQL 8.4 with a named data volume. It runs the app as a long-lived Node process, including Socket.IO; it does not use serverless hosting.

Create a private `.env.docker` with random hex secrets (URL-safe). This PowerShell command writes secrets to the file without displaying them:

```powershell
node -e "const fs=require('fs'),c=require('crypto'),s=()=>c.randomBytes(32).toString('hex');fs.writeFileSync('.env.docker','MYSQL_ROOT_PASSWORD='+s()+'\nMYSQL_APP_PASSWORD='+s()+'\nAUTH_SECRET='+s()+'\nAPP_ORIGIN=http://localhost:3000\nPORT=3000\n',{mode:0o600})"
docker compose --env-file .env.docker up --build -d
```

Open `http://localhost:3000`. The database port is not published to the host. The app port is bound to the laptop's loopback interface by default. View logs or stop the containers with:

```powershell
docker compose --env-file .env.docker logs -f app
docker compose --env-file .env.docker down
```

The named `arena_mysql` volume preserves MySQL data after `down`. Do not add `--volumes` unless you deliberately intend to delete all Docker database data.

## Hosting

For public hosting, use a persistent Node container or VM and a production MySQL 8+ database. Put TLS termination in a reverse proxy that forwards HTTP and WebSocket upgrades to port 3000. Set `APP_ORIGIN` to the actual HTTPS origin and preserve `AUTH_SECRET` across restarts. Back up MySQL and monitor process health and logs.

The current deployment is a single game-server process. Horizontal deployment needs shared queue/presence coordination, distributed match locking, and a compatible Socket.IO adapter before multiple replicas can safely accept matches. Redis is not required for this one-process laptop deployment.

## Automated verification

`npm test` runs the engine and backend test files. Browser tests require the app to be running on port 3000, then run:

```powershell
npx playwright test
```

The browser configuration uses installed Google Chrome at its standard Windows path. Set `CHROME_PATH` to another installed Chrome executable, or install Playwright Chromium with `npx playwright install chromium`. Use `E2E_BASE_URL` to test another origin; that origin must also be allowed by the server's `APP_ORIGIN`.

The end-to-end tests create actual test accounts and exercise the real database and multiplayer server without mocked responses. They check ranked synchronization and rewards, practice, loadouts, settings, cosmetic purchases and equip, friends and notifications, daily rewards, private classic play, reconnect, rematch, daily puzzles and network-offline local classic. Screenshots are saved under `docs/screenshots`; failed-run traces and reports go to excluded `test-results` and `playwright-report` folders.

With a configured local `DATABASE_URL`, the browser suite also promotes its own temporary account as an administrator fixture and tests creating, starting, and completing a two-player tournament through the UI. Use `E2E_SKIP_ADMIN=1` when the tested server does not share this local database. No existing player is promoted. To remove only recorded test fixtures after the browser run:

```powershell
node scripts/cleanup-e2e.mjs
```

Cleanup checks exact recorded account and tournament IDs, refuses to touch matches with any outside player, and requires all test matches to be finished.

## Local games without a network

Visit `/local-play` once while the game server is running. When the page says **Available offline on this browser**, its local-practice page and required static assets have been cached. You can reload that route with the browser network offline and play same-device classic or one of seven classic AI levels. The board, settings, and session score stay in this browser's local storage.

This cache never stores account APIs, login responses, ranked state, or Socket.IO traffic. Local play is untimed and awards no account XP, coins, missions, or cups. Multiplayer, account progress and other network features require the running server. Browser site-data deletion removes the local practice cache and saved board.


## Local administrator

Double-click `CREATE-ADMIN.cmd` to prepare the database and run the local administrator prompt. Choose your own email and password, then sign in through the normal game login. This command may promote an existing account with that email. No public registration or browser request can choose an administrator role.

The managed stop helper waits for MySQL to release its data files before reporting completion, so an immediate restart is safe. Setup reuses the generated Prisma client when its schema is unchanged.
