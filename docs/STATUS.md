# Implementation and verification status

Updated 12 October 2026. All 22 powers are implemented and available equally. Ranked equips exactly three powers, uses 20-second turns with bounded Time Warp and 120-second banks, and runs up to three rounds. The 2–5-minute duration remains an initial human-play target.

## Implemented game

| Area | Working behavior |
| --- | --- |
| Rules | Deterministic classic and 22-power elemental engine; energy, targets, shield/mirror/freeze/root, poison, terrain, restoration provenance, atomic movement, simultaneous lines, expiry and stall limits |
| Modes | Human Ranked, Quick, Classic, private friend rooms, seven AI levels, same-device and genuinely offline Classic |
| Multiplayer | Authenticated Socket.IO, genuine queues, snapshots, timers, revisions, duplicate actions, reconnect, surrender, emotes, mutual rematch and read-only spectators |
| Competition | Skill-sensitive cups, divisions, five leaderboard categories and scopes, seasonal XP, history/replays/tactical highlights, real elimination tournaments |
| Progress | Daily/weekly missions, rotating login calendar, achievements, milestones, free and premium season journeys |
| Cosmetics | Generated backgrounds and transparent avatars; transactional shop, inventory/equip and five premium-exclusive frame/banner/marks/effect/arena styles |
| Premium | 900-earned-coin pass, season entitlement, actual season XP and exactly-once rewards; no paid power advantages |
| Accounts | Password/guest accounts, persistent guest upgrade, secure sessions, Google OAuth PKCE/state and one-time email tokens |
| Social/admin | Friends/invitations/presence, profiles/privacy, blocks/reports, notifications; protected moderation, metrics, tournaments, seasons, missions, catalog and audit |
| Learning/UI | 22 Power Lab scenarios, three tutorials, daily puzzle, actual targeting controls/effects/sounds, responsive layouts, contrast and reduced motion |
| Operations | Isolated local MySQL, launchers, migrations/seed, Docker, one-owner database coordination and drained rolling takeover |

## Provider integrations

Razorpay checkout and signed webhooks validate actual captured payments before rewards. Full refunds and duplicate/delayed events are handled transactionally. Android AdMob uses consent, a restricted native bridge, player-bound nonces and Google-signed SSV; native reward events cannot credit coins. Email supports Resend, TLS SMTP and an HTTPS adapter. Google sign-in has its real authorization-code implementation.

These integrations require owner credentials. No real merchant charge, delivered ad impression, sent mailbox email or live Google login is claimed before configuring and testing those accounts. Exact setup is in [COMMERCE.md](COMMERCE.md); Android instructions are in [ANDROID.md](ANDROID.md).

## Current local evidence

- **174 automated tests passed** against isolated MySQL: classic/all-power rules, training, replay, authentication, real sockets, rating/economy, coordinator locks, provider signatures/transactions and premium journey.
- Production Next.js build passed; all 242 imported Lucide icons resolve.
- **10 browser flows passed** across the existing suite, all 22 Power Lab activations/catalog controls and earned-pass unlock/claim/equip. One social flow initially hit the unchanged shared-IP request budget; a 60-second test cooldown resolved it and the flow passed on rerun.
- Provider suite: 23 passing tests, including ECDSA fixtures, concurrent refunds/spending, capture/refund races, delayed pass reconciliation, daily ad caps and Ranked denial.
- Android Gradle wrapper integrity, project configuration and dependency resolution passed locally. APK compile/lint run in GitHub Actions; device delivery is not yet asserted.

## Release pipeline and deployment

GitHub release gate runs pure tests/build, fresh MySQL Linux container migrations, actual coordinator handoff and in-flight draining, real database/socket/provider tests and Chromium flows. The Android workflow compiles/lints a debug APK. Native Railway **Wait for CI** is enabled; the legacy pinned source must be upgraded to main after successful CI and a one-time legacy coordinator stop.

The existing HTTPS game is [Elemental Arena](https://elemental-arena-production.up.railway.app), initially deployed at commit `a57614dcc984d506feed5a5be00ff8348e2267b7`. The updated 22-power cloud release and CI run are pending at this snapshot; final evidence will record their exact revisions.

One app replica, private MySQL, a persistent volume and ownership-aware health checks are required. Temporary queues/private room codes restart during deployment; persistent matches and player data recover. Railway account/trial limits apply. Provider credentials, moderation, representative human balance/load testing and commercial backup/uptime operations remain owner configuration work.

The completed private `qa-cleanup` job has no public endpoint and restart policy Never; its deletion was previously declined. Test cleanup targets only recorded fixture IDs and refuses matches with outside players. Laptop MySQL service data is never removed.
