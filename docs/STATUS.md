# Implementation and verification status

This document distinguishes playable features, configured integrations, and further release work. The project stays in this folder, including generated artwork, source, launchers, and the isolated local MySQL data. Review date: 12 October 2026.

## Competitive release contract

Ranked Elemental is the flagship. Every competitor equips exactly three different powers from the same approved pool. Turns last 20 seconds, with a 120-second thinking bank per player and up to three rounds. The 2–5-minute match length is an initial playtest target. The six released powers are Fire Blast, Shield Guard, Portal Shift, Ice Freeze, Crystal Lock, and Energy Surge. Sixteen additional concepts remain unavailable while rules, counterplay, interaction tests, and balance are developed progressively.

The platform never sells stronger powers, cups, extra ranked turns, or competitive timer advantages. Earned cosmetic coins, profile XP, and rating cups are separate.

## Feature matrix

| Area | Implemented behavior | Release boundary |
| --- | --- | --- |
| Core rules | Pure deterministic nine-cell engine; all classic lines, draws, legal actions, energy, protections, effect expiry, simultaneous outcomes, round and action caps | Six-power approved launch pool; additional concepts are planned |
| Real multiplayer | Human ranked/classic/quick coordinator, authenticated sockets, private rooms, server deadlines, revisions, duplicate action handling, emotes, surrender, rematches, complete reconnect snapshots | One persistent Node process; public scale needs distributed coordination |
| AI | Seven real difficulty levels; power-aware elemental search; complete classic search at Hard and above | Elemental strategy remains bounded search, not a claim of solved optimal play |
| Local classic | Same-device two-player and seven AI levels; untimed shared-engine games, keyboard cells, winning lines, saved local board and score | Browser offline cache is scoped to local practice; no offline ranked rewards |
| Learning | Three interactive lessons demonstrate classic lines, shield/fire counterplay and a winning Portal Shift; a shared daily winning-move puzzle | Practice scenarios award no competitive rewards |
| Accounts | Password accounts, HTTP-only sessions, guests, persistent guest upgrade, unique usernames, protected reset and verification tokens | Google credentials and actual email delivery must be configured by the operator |
| Rating and history | Skill-sensitive cups, divisions, exactly-once settlement, repeated-pair restraint, human streaks; five ranking categories with global/region/season/friend scopes, exact personal rank and pagination; paginated match history, recorded replay and tactical highlight analysis | Public abuse detection and representative human balance/load tests remain operational work |
| Cosmetics | Real generated arena art and transparent avatars; earned-coin purchases, ownership checks, inventory and profile equip; board/marks/avatar/title/effect/frame/banner/arena/emote customization | Real-money payments and rewarded advertising are unavailable |
| Progress | Seven-day rotating login calendar, daily and weekly missions, achievements, level milestones and free journey tiers earned with true seasonal XP | Premium checkout is not enabled |
| Social | Requests, accept/reject, removal, block/unblock, report controls, privacy settings, online presence, public profiles, recent opponents, real friend invitations, invite links, notifications and spectating | Public operation still requires actual moderators and an abuse-response process |
| Tournaments | Real single-elimination brackets; registration, manual or scheduled start, synchronized matches, advancement, draw replay, champion view and exactly-once champion coins | No other bracket formats are claimed |
| Administration | Role-protected metrics, queue/economy/integrity views, players, reports, matches, tournaments, seasons, cosmetics, missions, announcements and audit records | Create the initial administrator through the local operator command |
| Accessibility | Keyboard controls, named inputs, modal focus management, reduced motion, contrast, responsive layouts and mobile navigation | Broader assistive-technology testing remains part of public release QA |
| Operations | Managed isolated MySQL, repeatable setup/seed/migrations, local launch/stop, persistent Node runtime, health checks and Docker configuration | Linux Docker build and Railway app/private MySQL verified; provider integrations and commercial operations remain |

## Automated evidence

The engine and backend suites cover actual rule transitions, MySQL transactions and authenticated Socket.IO connections. Browser tests use real Chrome contexts and the running local app. They create isolated fixtures, perform game actions through the UI, and assert authoritative state through real endpoints.

Reproduce from the project folder:

```powershell
node scripts/stop-local.mjs
node scripts/setup-local.mjs
npm test
node scripts/start-local.mjs --rebuild
npm run test:e2e
node scripts/cleanup-e2e.mjs
```

The seven browser flows cover ranked synchronization, powers and cups, history/replay and tactical inspection, cosmetics and profile equip, guest practice and settings, administration and a real two-player tournament, public profiles and leaderboard filters, social requests and notifications, daily claiming, private classic/reconnect/rematch, daily puzzles, direct friend invitations and read-only spectators, block/unblock/reject controls, an actual offline-browser local game, all three interactive tutorial lessons, and real human Quick Match with zero cup changes. Screenshots are saved in `docs/screenshots/`; failed-run reports and traces are kept in `playwright-report/` and `test-results/`.

The final core suite passed all 59 tests: 32 backend tests against real MySQL, 22 engine tests and five replay-analysis tests. The final production browser suite passed all seven flows in 2.2 minutes with no failed tests. This includes a genuine network-off reload and playable local game, live read-only spectating, mutual private rematch, all tutorial mechanics and unranked Quick Match. Visual QA completed 24 desktop/mobile checks without JavaScript errors, missing image assets, or horizontal overflow; the final lobby check also had no browser errors or horizontal overflow.

An immediate managed Stop/Start completed successfully after the launcher was fixed to await full MySQL shutdown. Setup preserves existing data and reuses the unchanged Prisma client on Windows. Final health is HTTP 200 with the MySQL connection live. The recorded browser fixtures were safely removed: 51 temporary test accounts and 32 completed test matches, with outside accounts and their history protected.

The browser suite uses a cooldown before its largest social flow to respect the normal shared-localhost request limit. Server protection remains enabled. Test artifacts may be inspected in the excluded Playwright report directory; the reusable screenshots remain in docs/screenshots/.

Browser cleanup only touches exact fixture IDs written to `.runtime/e2e-test-users.json` and the corresponding tournament manifest. It refuses to delete a match involving an outside player or an unfinished test match. It does not remove the project's database or the laptop's existing MySQL service data.

## External launch work

The cloud playtest is deployed on Railway with HTTPS and private MySQL. Commercial launch additionally needs tested backups/restore, ongoing monitoring, sender/email credentials, Google OAuth credentials if enabled, and real operator moderation. Payment and advertising integrations need the intended provider and region; until then, the UI must describe their availability honestly. Multi-server deployment additionally needs a Socket.IO adapter and shared queues, presence, rate limits and match coordination.

## Railway cloud playtest — 12 October 2026

[Play Elemental Arena](https://elemental-arena-production.up.railway.app). The application is pinned to verified source commit `a57614dcc984d506feed5a5be00ff8348e2267b7`; a normal GitHub push does not silently replace the live coordinator. It runs independently of the laptop. Railway account and trial limits still apply.

The Linux container build succeeded. Fresh database setup exposed two Windows-origin table-name casing errors. An exact-checksum guarded compatibility bootstrap completed their equivalent canonical DDL in the empty Linux database, preserved the historical migration SQL and checksums, and completed all five migrations. Seven safety tests cover source/history mismatch, nonempty data, unrelated failures, incompatible schema and interrupted completion. Five proxy identity tests also pass.

All seven browser flows passed through Railway HTTPS in 4.1 minutes: ranked powers/cups/replay, AI practice and cosmetics/settings, social/private/reconnect/rematch, genuinely offline Classic, invitations/spectating/privacy controls, interactive tutorials, and human Quick Match. Cloud administration fixture promotion was disabled; administration and tournament operations remain covered by the earlier real local MySQL suite. No payment, email or Google provider is represented as live.

Cloud desktop/mobile checks reported no browser errors, missing image assets or horizontal overflow. Health returned HTTP 200, unauthenticated admin returned HTTP 401, a rejected Origin returned HTTP 403, and local environment/runtime paths returned HTTP 404. Secure/HTTP-only/SameSite=Lax cookie flags were checked. The database was restarted with its persistent volume; all ten recorded test accounts remained and were subsequently removed with six finished test matches by the guarded private cleanup job. An outside account was preserved. No E2E account remains on the leaderboard.

The app uses one replica, a 1 GB cap and no sleeping. MySQL has no public domain/TCP proxy, a 750 MB cap, a 128 MB buffer pool, limit of 60 connections and a 500 MB persistent volume. The completed private `qa-cleanup` service remains because its deletion approval was declined; it has no public endpoint and its restart policy is Never.

Both final cloud and local health returned HTTP 200. The temporary laptop tunnel is closed, its prior local origin/proxy settings are restored, and the laptop production build is updated. Detailed evidence is in `cloud-verification.json`; screenshots are `screenshots/cloud-lobby-1440.png` and `screenshots/cloud-lobby-390.png`.
