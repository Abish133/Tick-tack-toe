# Implementation and verification status

Updated 14 October 2026. The game UI update adds the illustrated title screen, player HUD, game destination dock, expandable battle panels, scored 4×4/5×5/6×6 boards and clearly labelled Ranked bot fallback. It preserves 3×3 rules, all 22 powers, progression and commerce. Local verification passed 273 automated tests, all 16 distinct browser flows and the production build. [Game UI and board rules](GAME_UI.md) describe the changes; [GitHub release checks](https://github.com/Abish133/Tick-tack-toe/actions) gate Railway's automatic deployment to [Elemental Arena](https://elemental-arena-production.up.railway.app).

The following deployed-release snapshot predates that update. All powers are implemented and available equally. Ranked equips exactly three powers. 3×3 uses 20-second turns with bounded Time Warp and 120-second banks, and runs up to three rounds. The 2–5-minute duration remains an initial human-play target.

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

## Collection expansion — 13 October 2026

The collection adds 90 styles across ten themed sets, bringing the public coin catalog to 103 styles and the total including exclusive season rewards to 108. All nine categories have real previews and equipped presentation. Twenty new raster images were generated with the built-in imagegen tool: ten transparent avatars and ten arena backgrounds, optimized to WebP while preserving avatar alpha. Original PNGs remain in the project artwork folder. [COLLECTION.md](COLLECTION.md) lists every set and price; [collection-art-prompts.json](collection-art-prompts.json) records prompts, dimensions and asset hashes.

Ten complete nine-style sets are listed for Razorpay checkout at ₹149 by default, adjustable with `RAZORPAY_COLLECTION_PAISE`. Actual capture grants immutable recorded item snapshots, with provenance-aware refunds and equipment resets only for revoked items. Existing coin purchases and other ownership sources survive refunds. Cash checkout activates after merchant configuration; no live merchant payment is claimed. The additive seventh migration preserves existing inventory and player data.

Local automated verification passed **187 tests**, including real payment/refund ownership races, serialized surrender during AI/timeout transitions and an actual InnoDB deadlock with exactly-once settlement. The two collection browser flows passed, and the existing ten game flows passed across the verification runs. Final visual QA passed **36 desktop/mobile checks**, including all nine previews, generated assets and ten correctly priced cash bundles, with no missing artwork, page errors or horizontal overflow. Final release/CI evidence is maintained locally in `.runtime/collection-release-verification.json`; the earlier deployment evidence below remains the initial full-game release snapshot.

## Provider integrations

Razorpay checkout and signed webhooks validate actual captured payments before rewards. Full refunds and duplicate/delayed events are handled transactionally. Android AdMob uses consent, a restricted native bridge, player-bound nonces and Google-signed SSV; native reward events cannot credit coins. Email supports Resend, TLS SMTP and an HTTPS adapter. Google sign-in has its real authorization-code implementation.

These integrations require owner credentials. No real merchant charge, delivered ad impression, sent mailbox email or live Google login is claimed before configuring and testing those accounts. Exact setup is in [COMMERCE.md](COMMERCE.md); Android instructions are in [ANDROID.md](ANDROID.md).

## Completed verification

- **174 automated tests passed** against isolated MySQL: classic/all-power rules, training, replay, authentication, real sockets, rating/economy, coordinator locks, provider signatures/transactions and premium journey.
- Production Next.js build passed; all 242 imported Lucide icons resolve.
- **10 browser flows passed locally and in Linux CI**, covering multiplayer, progression, social features, all 22 Power Lab activations/catalog controls and earned-pass unlock/claim/equip. Social tests include a 60-second cooldown to respect the unchanged shared-IP request budget.
- **9 public-URL browser flows passed; 1 was intentionally skipped** because the premium fixture requires direct database setup. Cloud tests used normal browser accounts without remote backend fixtures or administrator promotion.
- Local visual QA passed **11 desktop/mobile checks** and saved 12 images. Cloud visual QA passed **4 desktop/mobile lobby and power-catalog checks**, confirmed all 22 power cards, and found no JavaScript errors, missing images, asset request failures or horizontal overflow.
- Provider suite: 23 passing tests, including ECDSA fixtures, concurrent refunds/spending, capture/refund races, delayed pass reconciliation, daily ad caps and Ranked denial.
- Android APK compilation and lint passed in [Android CI run 38346112814](https://github.com/Abish133/Tick-tack-toe/actions/runs/38346112814) for `d81345af394ca277e39e72b344dfd0aafafc2204`, whose native code is unchanged in the deployed release. The debug APK is saved locally at `downloads/ElementalArena-debug.apk`; SHA-256: `ba1c62fe4337e0d1a6830db6ffee42713a77fd5eebf80db223e5cf878cfcf698`. Device installation and real ad delivery remain unverified.

## Release pipeline and deployment

The [GitHub release gate run 38346798403](https://github.com/Abish133/Tick-tack-toe/actions/runs/38346798403) passed for `96298dad7192d2984513afc9163eea5e8c04da79`: 174 automated tests, 10 Chromium flows, both production builds, fresh Linux MySQL migrations, and actual coordinator handoff with accepted requests drained before ownership transfer. The Android workflow separately compiles/lints a debug APK.

Railway deployment `2e3beee5-b54f-4527-8db5-e05f830ae422` succeeded for that tested commit. The public health endpoint returned `200`, `database: mysql`, `coordinator: active`, and the exact release SHA; the public features and catalog endpoints confirm all 22 powers enabled. The provider migration completed and player data was preserved. The old six-power deployment was stopped once before upgrading because it predates coordinator ownership.

The application now follows `Abish133/Tick-tack-toe`, branch `main`, with no commit pin. Railway **Autodeploy** and **Wait for CI** are enabled, so normal pushes are configured to deploy after passing CI. Verify each release by comparing the public health SHA with its successful GitHub Actions run; local operational evidence is stored separately in `.runtime/automatic-release-verification.json`.

One app replica, private MySQL, a persistent volume and ownership-aware health checks are required. Temporary queues/private room codes restart during deployment; persistent matches and player data recover. Railway account/trial limits apply. Provider credentials, moderation, representative human balance/load testing and commercial backup/uptime operations remain owner configuration work.

The completed private `qa-cleanup` job has no public endpoint and restart policy Never; its deletion was previously declined. Its successful cloud cleanup removed exactly 10 recorded E2E accounts and 6 finished matches; two outside accounts were preserved and no E2E leaderboard entries remained. The guard refuses matches with outside players. Laptop MySQL service data is never removed. [Current release evidence](release-verification.json) records these checks; the older [cloud-verification.json](cloud-verification.json) remains historical playtest evidence.
