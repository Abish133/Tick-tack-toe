# Railway deployment

The complete 22-power Next.js, Socket.IO and MySQL application is live at [Elemental Arena](https://elemental-arena-production.up.railway.app). This document records the verified 13 October 2026 release and the configuration for subsequent deployments. The laptop's local database, account secrets, environment files and test fixtures are excluded from the deployment image. The local Windows launchers keep their existing behavior.

## Source and services

Put this project at the root of the connected source repository, or select this folder as the Railway service root. Railway detects the included `Dockerfile`. Create a dedicated MySQL service and one application service in the same Railway project and environment. The database uses its private network connection and persistent database storage. Publish only the application service through an HTTPS Railway domain; a public database TCP proxy is unnecessary.

The image installs locked dependencies with `npm ci --include=dev`, generates the Linux Prisma client, and builds Next.js. It retains the installed Prisma CLI because container startup applies the checked-in migrations. Build commands use a local placeholder URL rather than live database credentials. `scripts/docker-start.mjs` starts a small supervisor and one game worker. The worker waits for exclusive coordinator ownership, runs `prisma migrate deploy`, seeds the catalog and enables the game. The supervisor forwards container signals, allows a normal rolling takeover to exit cleanly, and retries transient database failures with bounded backoff. Migrations and catalog writes preserve player data. The `.dockerignore` excludes `.env`, `.runtime`, dependencies, local build output and browser test artifacts.

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
| `RAILWAY_DEPLOYMENT_DRAINING_SECONDS` | `45` |

Use the actual database service name in reference variables. Keep the database and authentication values in Railway variables, never in source control or this document. Generate the application domain before its first successful start, set `APP_ORIGIN`, and apply the variables together. No frontend API base URL is needed: HTTPS requests and Socket.IO use the current browser origin. See [Railway MySQL connections](https://docs.railway.com/databases/mysql).

All 22 implemented powers are available equally to every player; each match still equips three powers. Password accounts and guest accounts work without external providers. Google sign-in, email delivery, Razorpay checkout and native AdMob rewards use the provider integrations when configured; keep their private credentials in Railway variables. See the provider setup guide and `.env.example` for activation. The browser cannot display native AdMob ads, and unavailable providers do not grant fake purchases or ad rewards.

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

`/api/health` and `/api/ready` return `200` only after migrations, seeding and active-game hydration, with a real MySQL query and verified coordinator ownership. Standby/startup/drain requests return `503`; mutation APIs and new sockets are also blocked. `/health/live` reports process liveness without claiming the game is ready. Railway's health check runs at deployment time; it does not replace ongoing monitoring. The image listens on `process.env.PORT` and the same port carries HTTP and WebSocket traffic. [Railway health checks](https://docs.railway.com/deployments/healthchecks).

This game keeps queues, presence and match timers in one Node process. Keep exactly one replica in one region. A dedicated, non-pooled MySQL session holds a database-specific advisory ownership lock. A replacement requests a handoff, the old process stops accepting operations and drains accepted HTTP, socket and timer work, and only then releases ownership. The new process applies migrations and hydrates stored active matches before becoming ready. Losing the ownership connection fails closed and exits the production process; it never silently reconnects while keeping stale in-memory state. Match transitions also retain revision checks and exactly-once settlement guards.

This handoff has a brief restart window. Live queues and unstarted private rooms are transient; players reconnect and queue again. Stored accounts, sessions, replays and active match IDs remain in MySQL, with clocks continuing to use server time. A failed migration can leave the new release unavailable after the old process has drained, so use additive migrations and a verified rollback/forward fix. Multiple replicas or regions still require distributed game coordination. [Railway deployment lifecycle](https://docs.railway.com/deployments/reference).

## Automatic release pipeline

`.github/workflows/release.yml` runs on every push to `main`, pull request to `main`, and manual dispatch. It performs pure engine/security/provider tests, builds Next.js, then builds the actual Docker image and boots it against a fresh disposable MySQL 8.4 service on Linux. The production boot test checks case-sensitive historical migration compatibility, blocked standby mutations, exclusive coordinator takeover, preserved login sessions and active-match hydration. Real MySQL, Socket.IO, authentication, economy and provider fixtures then run against the isolated CI database. The final release gate fails unless both jobs succeed. No production database credentials or hosting tokens are stored in GitHub Actions.

Railway is configured to follow `Abish133/Tick-tack-toe`, branch `main`, without a pinned commit, with **Autodeploy enabled** and **Wait for CI enabled**. Repository access was added to Railway's existing GitHub app without removing its other selected repository. The workflow must exist in GitHub before Railway offers the Wait for CI switch. Railway requires the connected contributor account and its GitHub app to have the updated checks permissions. It waits for every GitHub Actions workflow on that commit to finish and skips a deployment if a workflow fails; it reads workflow conclusions, not just the final job's name. [Railway GitHub autodeploy documentation](https://docs.railway.com/deployments/github-autodeploys).

Do not add shared concurrency groups that cancel queued release runs or rely on a cancelled workflow as a required gate. The bootstrap migrations run inside the owning production process, so leave Railway's separate pre-deploy command empty.

The previous six-power commit `a57614dcc984d506feed5a5be00ff8348e2267b7` predates this ownership lock. Its deployment was stopped once before the verified upgrade; subsequent ownership-capable releases use the drained handoff. Normal pushes are now configured to deploy after passing CI. Confirm the latest successful Actions run corresponds to the deployed commit shown by `/api/health`; local operational evidence is stored separately in `.runtime/automatic-release-verification.json`. A workflow file alone does not enable Railway's account-side switches.

## Verification after deployment

Two early migrations were originally generated on Windows using lowercase references to tables that the initial migration creates with canonical mixed-case names. Their original files and checksums remain immutable for existing laptop databases. Container startup includes a narrowly guarded Linux bootstrap compatibility step: if normal deployment fails with the exact known missing-table error, it accepts only the recorded historical checksums, requires the initial migration to be complete and verifies that `User` and `Match` contain zero rows. It then adds only the equivalent canonical-name columns, foreign key and unique index, verifies their definitions, and marks the two historical migrations applied through the installed Prisma CLI before continuing normal deployment. It never resets the database or deletes rows. The step is idempotent after an interrupted bootstrap, skips case-insensitive MySQL, and skips already-completed history before checking for empty data. A checksum change, unrelated migration failure, populated database or incompatible existing schema stops deployment for operator review.

Confirm that logs show migrations applied, the catalog seeded, and `arena_ready`. Check the public `/api/health` endpoint, then use two real browser sessions through the HTTPS domain to register or enter as guests, connect to Socket.IO, join a private match, make synchronized moves, finish a match, reconnect and inspect its replay. Check the browser session cookie has `Secure`, `HttpOnly` and `SameSite=Lax`. Verify an unauthenticated request to `/api/admin` returns `401`, a disallowed mutation Origin returns `403`, and `/.env` returns `404`.

Run backend fixtures and browser flows that require direct database setup against an isolated staging database. The local browser suite can target an origin using `E2E_BASE_URL`; that origin must be allowed by the server's `APP_ORIGIN`. For public-URL checks, disable database fixtures, skip administrator promotion and use only normal test accounts. Remove only recorded fixture IDs using the guarded cleanup script. Do not run MySQL backend fixtures against the public production database.

Create the initial administrator through `node src/server/create-admin.mjs` in a private Railway operator shell, using chosen operator credentials. Registration never creates administrators. Before a durable public release, configure database backups, restore verification, ongoing monitoring, actual moderation and measured multiplayer load/balance testing. The release below has passed its build and live checks; provider activation and longer-term operations still require owner configuration.

## Verified full release — 13 October 2026

Public game: [Elemental Arena](https://elemental-arena-production.up.railway.app)

Repository: [Abish133/Tick-tack-toe](https://github.com/Abish133/Tick-tack-toe)

Project: `acc26b6a-93ae-4a71-9ff4-6530b8422722`; environment: `75a274f4-9d00-4dfa-89c8-708f9a25f8d0`. App service: `213443c6-55e7-40cf-8074-90f48b83461a`; private MySQL service: `9302a8c8-b29d-4d94-9fa8-4fb6717f8620`. Successful app deployment: `2e3beee5-b54f-4527-8db5-e05f830ae422`, source commit `96298dad7192d2984513afc9163eea5e8c04da79`.

Both persistent services were verified with one replica in `iad`. The app limit is 1 GB/1 CPU; MySQL is 750 MB/1 CPU with a 128 MB buffer pool and 60 connections, backed by a 500 MB volume. Sleeping is disabled. Authentication secrets and database credentials stay in private Railway variables. Source tracking is `main`, unpinned, with Autodeploy and Wait for CI enabled. The app health check is `/api/health`, timeout 300 seconds, deployment overlap zero and draining 45 seconds; the separate pre-deploy command is empty. Railway account/trial limits apply.

[Release gate run 38346798403](https://github.com/Abish133/Tick-tack-toe/actions/runs/38346798403) passed for the deployed SHA: 174 automated tests, 10 browser flows, production builds, fresh Linux MySQL bootstrap and drained coordinator takeover. Deployment logs confirmed the provider migration, catalog seed and `arena_ready`. The public health response returned the exact SHA with MySQL and active coordinator, and the public catalog exposes all 22 enabled powers. Existing player data was preserved.

The public-URL browser suite passed 9 flows and skipped the premium flow that requires direct database fixtures. No remote backend fixtures or administrator promotion were used. Cloud visual QA checked desktop/mobile lobby and power catalog, including all 22 cards, with no JavaScript errors, missing images, failed asset requests or overflow. Local verification additionally passed the premium journey flow and 11 visual checks. Reports and images are in `docs/screenshots/`; [STATUS.md](STATUS.md) records provider activation boundaries and Android build evidence.

The optional private cleanup job runs `node scripts/cleanup-e2e-job.mjs`, with `E2E_CLEANUP_JOB=confirmed`, exact recorded ID arrays in `E2E_USER_IDS_JSON`/`E2E_TOURNAMENT_IDS_JSON`, and a private database reference. It creates no HTTP listener, must have no public domain and uses restart policy Never. Its guard refuses non-fixture users, unfinished matches and outside opponents. Successful cleanup deployment `61d57392-1e97-4871-b65c-c8e13833803a` removed exactly 10 recorded E2E accounts and 6 finished matches; two outside accounts were preserved and the public leaderboard contained no E2E entries afterward. The completed `qa-cleanup` service remains because deletion was not approved; no volume is attached to it.

[Current release evidence](release-verification.json) records the full-release checks. The older [cloud-verification.json](cloud-verification.json) is retained as evidence for the prior six-power playtest.
