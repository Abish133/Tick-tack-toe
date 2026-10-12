# Backend and operating contract

## Runtime

`server.mjs` runs one persistent Node process containing Next App Router and Socket.IO on the same port. Start with `npm run dev`, or build with `npm run build` and use `npm start`. Running `next start` alone does not start the match coordinator.

MySQL 8 is the persistent source of truth. Prisma migrations create the relational schema; `node prisma/seed.mjs` inserts all 22 powers, real cosmetic items including exclusive premium rewards, divisions, missions, achievements and the initial season. Existing players receive all 22 powers without losing their selected loadout. Seed never creates fictitious players or results, and preserves configured cosmetic prices and availability.

The shared `globalThis.__elementalArena` service allows Route Handlers and Socket.IO to use the same coordinator. Persistent matches are loaded on startup. Temporary queues, presence, rematch votes, OAuth state and unfilled private rooms are memory-resident. Unfilled rooms expire after 30 minutes. Active private matches, match actions, outcomes, profiles, currency, friendships, bracket state and rewards survive restarts.

This build supports **one Node instance**. Do not run multiple replicas against the same environment: distributed queues/presence and rate limiting require a Redis adapter, distributed coordination and load-balancer affinity before horizontal deployment. Database transition guards still reject stale state and multiple active matches per player, but do not supply distributed queue ownership.

## Configuration

Required:

- `DATABASE_URL`: MySQL connection URL for this game's database.
- `AUTH_SECRET`: at least 32 unpredictable characters. `SESSION_SECRET` is accepted as an alternative.
- `APP_ORIGIN`: exact allowed browser origin, normally `http://localhost:3000`. Additional origins may be comma separated. Origins include protocol and port.
- `PORT`: normally `3000`.
- `HOST`: listener address; default `0.0.0.0`. A laptop tunnel preview sets `127.0.0.1` so the origin server is accessible only locally.

Use `TRUST_PROXY=cloudflare` for a local Cloudflare tunnel. HTTP and Socket.IO rate limits then use a validated, single `CF-Connecting-IP` only when the TCP peer is loopback; other peers retain their actual socket identity. This mode ignores `X-Forwarded-For` and browser-supplied internal identity headers. `TRUST_PROXY=true` supports a local trusted generic proxy which replaces `X-Forwarded-For`, with a validated first address and bounded chain. Forwarding headers are ignored for non-loopback peers. Otherwise rate limits use the actual socket address. Use HTTPS in production; production session cookies have `Secure`, `HttpOnly` and `SameSite=Lax`. `/api/health` checks the actual database and returns feature availability.

The deployment dependency audit on 12 October 2026 flagged GHSA-ggr8-5vv4-36mx in `deepmerge-ts` through the Prisma CLI configuration package. That advisory concerns recursive object graphs in operator-supplied configuration; the app does not pass HTTP JSON bodies to that package. It is recorded as a CLI maintenance item, not a reason to disable request protection or run an untested forced Prisma downgrade. The audit reported no Next.js or Socket.IO advisory in this dependency tree.

Create an administrator from the local operator terminal:

```sh
node src/server/create-admin.mjs
```

It prompts for email and an initial password when needed. Alternatively set `ADMIN_EMAIL` and `ADMIN_PASSWORD` in the local command environment. The command can promote an existing account. Public registration never accepts role changes and never grants administration merely because an email matches an environment variable. Administrative changes are recorded in `AuditLog`.

## Authentication and optional providers

Passwords use salted scrypt with N=16384, r=8, p=1 and 64-byte derived keys. Random 256-bit session tokens exist only in the HTTP-only cookie; the database stores their HMAC-SHA256 hashes. Sessions expire after 30 days. Each socket event revalidates its original session, so logout, suspension and password resets revoke existing socket authority. Guest registration upgrades the same account ID and preserves its collection, wallet, profile and history; upgrade invalidates earlier guest sessions. Usernames contain 2–20 characters and have a database unique constraint using the database's case-insensitive collation. Duplicate names return a readable `USERNAME_TAKEN` error. Google display-name collisions receive a random suffix instead of taking another player's name.

Google sign-in requires `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`. Register the exact redirect URL `APP_ORIGIN/api/auth/google/callback` in Google Cloud. The implementation performs authorization-code exchange with PKCE, a one-time state value bound to an HTTP-only cookie, and verified user-info retrieval. Existing password accounts are not silently linked to Google email identities. Without credentials, the provider returns an explicit unavailable response. Automated tests check disabled-provider behavior and rejection of invalid callback state; a live Google account flow requires the operator's credentials and has not been asserted as tested.

Password reset and email verification delivery require:

- `EMAIL_FROM`: sender address.
- `EMAIL_WEBHOOK_URL`: trusted email adapter endpoint, HTTPS in production.
- `EMAIL_WEBHOOK_TOKEN`: optional bearer credential for that adapter.

The adapter receives POST JSON `{from,to,subject,text}` and must send the email, returning a successful status only after accepting delivery. Reset/verification links contain a one-time random token; only its hash is stored, with a one-hour expiry. Delivery remains unavailable unless configured. Reset request responses conceal whether an email exists. Reset confirmation consumes the token and revokes all account sessions. Automated tests validate token consumption, password changes and socket revocation; delivery to an actual mailbox remains provider-dependent.

The premium pass works with 900 earned coins; its five exclusive rewards require current season XP and persisted entitlement. Razorpay cash checkout and Android AdMob SSV are integrated and stay disabled until configured. Original-byte webhook HMAC, captured-payment matching, unique grant references and transactional wallet locking protect settlement; native ad events cannot grant currency. See [COMMERCE.md](COMMERCE.md) for exact credentials, callback URLs and live validation.

## Match authority and settlement

Every authenticated match mutation checks participant membership, current engine revision, current turn, deadlines, energy, loadout, legal targets and effect rules on the server. Action requests include a unique `requestId`; replaying the same request and action returns current authoritative state. Reusing that ID for another action is rejected. The database enforces unique `(matchId, sequence)` and `(matchId, requestId)` pairs.

The match row stores the initial state and current state. Each accepted transition records action, engine event and resulting snapshot in `MatchAction`. A conditional update on the stored revision commits one state transition. A transactional conditional `User.activeMatchId` claim ensures that competing AI, room and queue requests cannot place the same human in two active games. The occupancy clears with settlement.

The state transition, result, participant rewards, rating history, profile XP, wallet ledger, mission progress and achievements commit in one transaction. `Match.settledAt`, one result per match and unique ledger references prevent duplicate settlement. A match that cannot commit its transaction does not broadcast a successful transition. Replays use recorded snapshots rather than accepting client board data.

Players have 20-second turns and a 120-second thinking bank each, with up to three elemental rounds. The initial playtest target is 2–5 minutes. Classic matches use one standard round. Client countdowns are display only. Disconnecting does not pause the clock; reconnect sends the complete server state. AI actions use the same engine and never award ranked cups or match coins.

### Rating formula

For each player, expected score is `1 / (1 + 10 ** ((opponentCups - playerCups) / 400))`. A win scores 1, a draw 0.5, a loss 0. The rounded change is `40 * (score - expected)`, and cups cannot fall below zero. Equal-rating wins earn 20 cups, losses lose up to 20, and equal-rating draws change nothing. Only human ranked queue matches change cups. Private rematches, quick/classic, AI and tournaments remain unranked.

After three settled ranked games against the same pair within a rolling 24 hours, further ranked pair results record normally but award no cups. Separately, only the first five completed human games between a pair during that window award match coins, counted across ranked, friend, quick, classic and tournament modes. Subsequent games still record their real outcomes and update statistics. AI games never award match coins. These are basic farming restraints, not a claim of a complete public-scale anti-collusion system.

Human match coin rewards: win 50, draw 25, loss 15, subject to the pair limit above. Account XP: human win 60, other human result 30, AI completion 10. Levels advance every 500 XP; each newly crossed account level credits 50 cosmetic coins once with a unique reward claim and ledger reference. Human victories increment the current streak and update the best streak; defeat resets the current streak to zero. Draws preserve the current streak without incrementing it, and AI results do not affect human streaks. Daily missions use UTC day keys; weekly missions use the UTC date of the Monday starting that week and reset at the next Monday 00:00 UTC. Both progress from settled human matches and claim transactionally. Seven-day login coin rewards rotate `[40,50,60,70,80,90,120]` by total claims, with no missed-day punishment. Season participation records XP from actual matches belonging to that season, including 10 XP for AI completion. Free season journey tiers use seasonal XP thresholds 100, 500, 1000, 2000 and 3500; rewards 40, 100, 150, 200 and 300 coins can be claimed once per active season. These rewards buy cosmetic items only.

## Socket contract

All socket actions use authenticated same-origin cookies. Acknowledgments are `{ok:true,...payload}` or `{ok:false,error:{code,message}}`. Invalid actions also emit `match:error`. Match payloads include `{matchId,mode,ruleset,you,spectator,serverTime,state,participants,settlement}`. `state` is the engine schema; board entries are player IDs or `null`, and players have their own `mark` values.

| Client event | Payload |
| --- | --- |
| `queue:join` | `{mode:'ranked'|'quick'|'classic',ruleset?,requestId?}` |
| `queue:leave` | `{}` |
| `match:join`, `match:reconnect`, `match:leave` | `{matchId}` |
| `match:move` | `{matchId,revision,cell,requestId}` |
| `match:power` | `{matchId,revision,powerId,cell?,from?,to?,requestId}` |
| `match:surrender` | `{matchId,requestId}` |
| `match:rematchRequest` | `{matchId}` |
| `match:emote` | `{matchId,emote:'wave'|'gg'|'wow'|'think'|'fire'|'shield'|'star'|'snow'}` |
| `room:create` | `{ruleset:'classic'|'elemental',allowSpectators?}` |
| `room:join`, `room:leave` | `{code}` |

Server events: `queue:joined`, `queue:status`, `queue:cancelled`, `match:found`, `match:started`, `match:state`, `match:actionApplied`, `match:powerActivated`, `match:playerDisconnected`, `match:playerReconnected`, `match:finished`, `match:rewardSettled`, `match:rematchRequested`, `match:emote`, `match:error`, `room:updated`. Queue status always reports actual humans and has no invented wait estimate. An empty queue remains empty. Spectators cannot act, surrender or send emotes. Star and Snow require an owned, equipped Celestial Signals cosmetic pack. Participant cosmetics are captured server-side in state.players[].profile and participants[].profile at match creation, so their appearance is stable during the match. Spectator permission also requires both participants' privacy settings to allow it. Each socket subscribes to one match view at a time. Switching, room join and new participant matches leave older match rooms. An active participant game takes priority over spectating another game (ACTIVE_MATCH_VIEW). Leaving a view never pauses the authoritative turn clock.

## HTTP API

JSON mutations require an allowed `Origin` header. Body size is limited to 16 KiB. Authentication and normal traffic have separate limits. Errors return `{error:{code,message}}` with corresponding HTTP status.

| Group | Endpoints |
| --- | --- |
| Public | GET `/api/health`, `/features`, `/catalog`, `/leaderboard`, `/tournaments`, `/tournaments/:id`, `/players/:id` |
| Account | POST `/auth/register`, `/auth/login`, `/auth/guest`, `/auth/logout`; GET `/auth/session`, `/auth/google`, `/auth/google/callback`; POST `/auth/reset/request`, `/auth/reset/confirm`, `/auth/verify/request`, `/auth/verify` |
| Profile | GET/PATCH `/profile`; PATCH `/settings`; PUT `/loadout {powers:[three ids]}`; GET `/powers`, `/rank-history?offset=` |
| Matches | POST `/matches {mode:'ai',ruleset,difficulty}`; GET `/matches/active`, `/matches/:id`, `/history?cursor=`, `/replay/:id`; POST `/matches/:id/surrender`, `/matches/:id/rematch`; GET `/queue`; POST `/rooms`, `/rooms/join` |
| Economy | GET `/wallet`, `/inventory`, `/missions`, `/achievements`, `/rewards`, `/season-pass`; POST `/purchases {cosmeticId,requestId}`, `/inventory/equip {cosmeticId}`, `/rewards/daily`, `/missions/claim {missionId}`, `/season-pass/claim {level}` |
| Social | GET `/friends`, `/players/search?q=`, `/notifications`, `/presence`; POST `/friends/request {userId}`, `/friends/respond {requestId,action:'accept'|'reject'}`, `/friends/block {userId}`, `/reports {userId,reason,matchId?}`, `/notifications/read {id?}`; DELETE `/friends/:userId`, `/friends/block/:userId`; POST `/friends/unblock`, `/friends/challenge`, `/challenges/:id/accept` |
| Tournament | POST `/tournaments/:id/register` |
| Admin | GET `/admin`, `/admin/users`, `/admin/matches`, `/admin/audit`, `/admin/catalog`, `/admin/seasons`, `/admin/missions`; POST `/admin/suspend`, `/admin/tournaments`, `/admin/tournaments/:id/start`, `/admin/season`; PATCH `/admin/reports`, `/admin/catalog`; PUT `/admin/missions`; POST `/admin/announcements` |

Leaderboard queries accept `category=cups|wins|streak|weekly|tournaments`, `scope=global|regional|friends|season`, optional `region`, `season`, bounded `limit` and `offset`. Entries expose exact rank, cups, wins, played, winRate (a 0–1 fraction), streak, weekly human wins, tournament championships, level and public profile. Responses include total, hasMore, nextOffset and the authenticated player's exact currentPlayerRank even when outside the page. Ties use metric, cups, wins and player ID in that order. Global win statistics exclude AI. Seasonal standings include ranked participants; weekly victories count real human wins since Monday 00:00 UTC. Tournament victories count champions of completed tournaments. Friend scope requires authentication. Match history returns 20 rows and a cursor. Private replay access requires match participation, enabled spectators or an administrator role.

## Tournament behavior

Single-elimination brackets accept 2, 4, 8, 16 or 32 entrants. Admins can start manually. At the real scheduled start time the coordinator starts a bracket automatically when a supported number of entrants is available; incomplete brackets or busy entrants remain open for retry. Start and registration use the same coordinator lock; seeds and bracket metadata commit atomically. Seeds use rating order with ID tie ordering. Each bracket slot links to its server match in the same transaction that claims its players. Busy entrants leave the slot pending until they are free. A five-second coordinator task resumes pending slots and unfinished advancement after restarts.

Tournament matches award no cups. A draw automatically replays the same bracket pair until a decisive result, preserving each drawn game in match history. Winner advancement and elimination commit together; the final decisive result identifies the real champion. The champion receives 500 cosmetic coins and the Tournament Champion achievement, transactionally and once per tournament. No randomly assigned or client-declared winners are accepted.

## Verification

```sh
node --test tests/backend.test.js
```

The backend suite uses the configured MySQL database with unique temporary fixture identities and deletes its users, matches and tournament fixtures afterward. Use a dedicated development/test database; never run tests against production. The backend suite currently has 32 passing tests, including real Socket.IO humans, auth, power synchronization, duplicate/stale requests, reconnect, settlement, wallets, ownership, guest upgrade, concurrent match entry, spectator privacy, tournament draws/championship settlement, true seasonal journey XP, weekly missions, calendar cycles, exact leaderboard ranks, social invitation ownership, public profile privacy, level milestones, administration and password reset revocation. Optional credential-dependent provider delivery requires a separate operator smoke test.

## Social invitations, privacy and cosmetic customization

GET /friends returns friends, incoming/outgoing pending requests, blocks (also aliased as blocked), recent human opponents, and challenge notifications. Public profile responses contain no email, role, password or session fields. Player search hides blocked relationships. Online visibility honors showOnline; friend requests honor allowFriendRequests. profileVisibility accepts public, friends or private. Full /players/:id detail requires the owner, an approved friend when set to friends, or a public profile. Private profiles remain visible as basic name, cosmetics and competitive scores on leaderboards and social lists; summaries never expose biography, account XP or favorite-power history. Block removes the relationship and rejects pending requests. Unblocking restores contact eligibility, without recreating friendship. Reports validate that both players participated when a match ID is supplied.

POST /friends/challenge {userId,ruleset,allowSpectators} requires an existing friendship and creates an actual waiting room plus a persisted recipient notification. The response contains invitation {id,code,url,expiresAt}, url and room. Notifications store metadata {kind:'challenge',hostId,code,url,expiresAt,status:'pending'}. POST /challenges/:notificationId/accept requires that exact recipient, an unblocked relationship and an unexpired room; repeated acceptance returns the accepted match. Unfilled rooms remain temporary and invitations clearly fail after room closure or a server restart. Rematch requests send a persisted notification with metadata {kind:'rematch',matchId,requestedBy,expiresAt} and a match:rematchRequested event. Both participants request via /matches/:id/rematch to start the real new match.

Inventory now supports avatar, board, marks, title, effect, frame, banner, arena and emote. Profile fields equippedFrame, equippedBanner, equippedArena and equippedEmote may be updated only with matching owned catalog items. Aurora Nexus selects the generated arena-aurora.png environment; Astral Halo and Elemental Convergence are native interface treatments. Celestial Signals adds two emotes and no gameplay benefit.

## Content operations

GET /admin includes real match completion rate, mean recorded duration, power use counts, economy totals by ledger reason, current queue health and recent repeated-pair audit events. activePlayers24h counts distinct accounts with a session created in the previous 24 hours; online counts current authenticated socket presence.

GET /admin/missions lists active and inactive definitions. PUT /admin/missions accepts id, name, description, period ('daily' or 'weekly'), metric ('played', 'wins', 'powersUsed'), integer target 1–1000, integer coins 0–10000 and boolean active. Existing IDs retain period and metric to preserve progress; use a new ID for a changed identity. Every mutation is audited. POST /admin/announcements {message} accepts 5–250 characters and persists an announcement notification for unsuspended accounts that allow notifications. No arbitrary player can publish announcements.
