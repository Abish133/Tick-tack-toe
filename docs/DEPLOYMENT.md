# Railway deployment

This configuration deploys the complete Next.js, Socket.IO and MySQL application as a test environment. It does not upload the laptop's local database, account secrets, environment files or test fixtures. The local Windows launchers keep their existing behavior.

## Source and services

Put this project at the root of the connected source repository, or select this folder as the Railway service root. Railway detects the included `Dockerfile`. Create a dedicated MySQL service and one application service in the same Railway project and environment. The database uses its private network connection and persistent database storage. Publish only the application service through an HTTPS Railway domain; a public database TCP proxy is unnecessary.

The image installs locked dependencies with `npm ci --include=dev`, generates the Linux Prisma client, and builds Next.js. It retains the installed Prisma CLI because container startup applies the checked-in migrations. Build commands use a local placeholder URL rather than live database credentials. The startup command waits up to 120 seconds for MySQL, runs `prisma migrate deploy`, seeds the real catalog and starts `server.mjs --production`. It does not create fake players or rankings. Migration and catalog seed operations preserve existing player data. The `.dockerignore` excludes `.env`, `.runtime`, dependencies, local build output and browser test artifacts.

Railway's current documentation says new services cannot opt into legacy `railway.json` or `railway.toml` Config as Code. Configure the following service settings through the connector or Railway dashboard; do not add a legacy file and assume it controls a new service. [Railway configuration documentation](https://docs.railway.com/config-as-code).

## Application variables

| Variable | Value |
| --- | --- |
| `DATABASE_URL` | Reference the dedicated database's private `MYSQL_URL`, for example `${{MySQL.MYSQL_URL}}` when the service is named `MySQL` |
| `AUTH_SECRET` | A new cryptographically random secret of at least 32 characters, stored privately in Railway; preserve it across deployments |
| `APP_ORIGIN` | The exact generated `https://…up.railway.app` origin, without a trailing slash; include a custom HTTPS domain only after it is configured |
| `NODE_ENV` | `production` |
| `HOST` | `0.0.0.0` |
| `PORT` | Let Railway supply its application port, or set `3000` and use the same target port for the public domain |
| `TRUST_PROXY` | Leave unset for conservative socket-peer rate limiting; the local Cloudflare mode is for a laptop tunnel, not Railway's remote ingress |
| `DB_READY_TIMEOUT_MS` | Optional; defaults to `120000`, bounded to a maximum of five minutes |
| `RAILWAY_DEPLOYMENT_OVERLAP_SECONDS` | `0` |
| `RAILWAY_DEPLOYMENT_DRAINING_SECONDS` | `10` |

Use the actual database service name in reference variables. Keep the database and authentication values in Railway variables, never in source control or this document. Generate the application domain before its first successful start, set `APP_ORIGIN`, and apply the variables together. No frontend API base URL is needed: HTTPS requests and Socket.IO use the current browser origin. See [Railway MySQL connections](https://docs.railway.com/databases/mysql).

Email and Google sign-in remain disabled unless their provider credentials are configured. Payments, rewarded advertisements and a paid pass are unavailable. Password accounts and guest accounts work without those integrations. The six released powers remain available equally to every player; sixteen additional power concepts remain planned.

## Build and runtime settings

| Setting | Required value |
| --- | --- |
| Builder | Dockerfile at `Dockerfile` |
| Start command | Leave the image command in place, or explicitly `node scripts/docker-start.mjs` |
| Health check path | `/api/health` |
| Health check timeout | `300` seconds |
| Replicas | Exactly `1` in exactly `1` region |
| Restart policy | On failure, up to 10 retries |
| Application sleeping | Disable for the real-time game |

`/api/health` returns success only after a real MySQL query. Railway's health check runs at deployment time; it does not replace ongoing monitoring. The image listens on `process.env.PORT` and the same port carries HTTP and WebSocket traffic. [Railway health checks](https://docs.railway.com/deployments/healthchecks).

This coordinator keeps live queues, presence and match timers in one Node process. Do not run simultaneous application replicas or two deployments against the same game database. For subsequent code or variable updates, pause new matchmaking, let active matches finish, and remove/stop the old application deployment before activating its replacement. Setting overlap to zero shortens teardown but does not eliminate the brief old/new startup overlap during a normal rolling deployment. Reconnect after the replacement starts; stored game and account data remain in MySQL. Public scaling and automatic rolling upgrades require distributed match ownership and coordination first. [Railway deployment lifecycle](https://docs.railway.com/deployments/reference).

## Verification after deployment

Two early migrations were originally generated on Windows using lowercase references to tables that the initial migration creates with canonical mixed-case names. Their original files and checksums remain immutable for existing laptop databases. Container startup includes a narrowly guarded Linux bootstrap compatibility step: if normal deployment fails with the exact known missing-table error, it accepts only the recorded historical checksums, requires the initial migration to be complete and verifies that `User` and `Match` contain zero rows. It then adds only the equivalent canonical-name columns, foreign key and unique index, verifies their definitions, and marks the two historical migrations applied through the installed Prisma CLI before continuing normal deployment. It never resets the database or deletes rows. The step is idempotent after an interrupted bootstrap, skips case-insensitive MySQL, and skips already-completed history before checking for empty data. A checksum change, unrelated migration failure, populated database or incompatible existing schema stops deployment for operator review.

Confirm that logs show migrations applied, the catalog seeded, and `arena_ready`. Check the public `/api/health` endpoint, then use two real browser sessions through the HTTPS domain to register or enter as guests, connect to Socket.IO, join a private match, make synchronized moves, finish a match, reconnect and inspect its replay. Check the browser session cookie has `Secure`, `HttpOnly` and `SameSite=Lax`. Verify an unauthenticated request to `/api/admin` returns `401`, a disallowed mutation Origin returns `403`, and `/.env` returns `404`.

Run broad automated browser verification against an isolated staging environment, not a database containing unrelated public players. The local test suite can target a staging origin using `E2E_BASE_URL`; that origin must be allowed by the server's `APP_ORIGIN`. Remove only recorded fixture IDs using the guarded cleanup script. Do not run MySQL backend fixtures against the public production database.

Create the initial administrator through `node src/server/create-admin.mjs` in a private Railway operator shell, using chosen operator credentials. Registration never creates administrators. Before a durable public release, configure database backups, restore verification, ongoing monitoring, actual moderation and measured multiplayer load/balance testing. This document describes the deployable configuration; the Railway environment itself is verified only after its build and live checks succeed.

## Current verified playtest

Public game: https://elemental-arena-production.up.railway.app

Repository: https://github.com/Abish133/Tick-tack-toe

Project: `acc26b6a-93ae-4a71-9ff4-6530b8422722`; environment: `75a274f4-9d00-4dfa-89c8-708f9a25f8d0`. App service: `213443c6-55e7-40cf-8074-90f48b83461a`; private MySQL service: `9302a8c8-b29d-4d94-9fa8-4fb6717f8620`. Verified app deployment: `4077000f-8afb-4151-ae4d-d4d1cbd0a149`, source commit `a57614dcc984d506feed5a5be00ff8348e2267b7`.

Both persistent services use one replica in `iad`. The app limit is 1 GB/1 CPU; MySQL is 750 MB/1 CPU with a 128 MB buffer pool and 60 connections, backed by a 500 MB volume. Health timeout is 180 seconds; sleeping is disabled. Authentication secrets and database credentials stay in private Railway variables. The source is pinned so ordinary pushes do not start a second coordinator. Stop the existing app before deliberately deploying a new version until distributed ownership is implemented.

The optional private cleanup job runs `node scripts/cleanup-e2e-job.mjs`, with `E2E_CLEANUP_JOB=confirmed`, exact recorded ID arrays in `E2E_USER_IDS_JSON`/`E2E_TOURNAMENT_IDS_JSON`, and a private database reference. It creates no HTTP listener, must have no public domain and uses restart policy Never. Its guard refuses non-fixture users, unfinished matches and outside opponents. The completed `qa-cleanup` service remains because deletion was not approved; no volume is attached to it.
