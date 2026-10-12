# MASTER DEVELOPMENT PROMPT — TIC TAC TOE: ELEMENTAL ARENA

## ROLE AND PRIMARY OBJECTIVE

Act as an elite AAA game designer, senior full-stack Next.js engineer, multiplayer networking architect, UI/UX motion designer, database architect, and competitive game economy designer.

Build a complete, production-ready, visually spectacular, strategically deep, highly replayable **3×3 Tic-Tac-Toe game called "Tic Tac Toe: Elemental Arena"**.

The game must transform traditional Tic-Tac-Toe into a competitive, power-based strategy battle while preserving the familiar 3-row, 3-column board.

The game should feel like a combination of:

- A premium competitive mobile game
- A magical elemental battle arena
- A fast-paced multiplayer strategy game
- A rewarding ranked competitive experience
- A polished, cinematic casual game with meaningful progression

**Important:** Do not build a basic Tic-Tac-Toe game with a few decorative power buttons. Build a complete gaming platform with functional powers, genuine competitive strategy, multiplayer synchronization, ranking systems, progression, accounts, social features, and outstanding visual quality.

Every feature must be implemented properly, not merely shown as a UI mockup.

---

# 1. MANDATORY TECHNOLOGY STACK

Use the following technology stack strictly.

### Frontend

- Next.js using App Router
- JavaScript only, including JSX
- React
- Tailwind CSS
- Framer Motion / Motion for React
- GSAP where complex cinematic sequences genuinely benefit from it
- Lucide React icons
- CSS transforms, transitions, particles, shaders, and optimized animations
- Canvas or WebGL only where it provides a meaningful visual improvement

### Backend

- Next.js Route Handlers
- Node.js
- Socket.IO for real-time multiplayer
- Secure server-side authentication and sessions
- Server-authoritative game engine
- Server-side matchmaking, rankings, and rewards

### Database

- MySQL 8+
- Prisma ORM using JavaScript
- Proper relational schemas, constraints, transactions, and indexes
- Database migrations and seed scripts

### Supporting infrastructure

- Redis for multiplayer queues, transient match state, presence, distributed coordination, and rate limiting when necessary
- Secure environment variables
- Structured logging
- Automated tests
- Docker-compatible local development

Do not use TypeScript.

Do not use MongoDB, Firebase, Supabase, or PostgreSQL.

MySQL must be the persistent source of truth for accounts, match history, rankings, progression, and purchases.

Use a deployment architecture that genuinely supports persistent Socket.IO connections. If necessary, use a dedicated Node.js server alongside the Next.js application, still implemented entirely in JavaScript.

Do not rely on serverless functions to maintain persistent WebSocket connections.

Use current stable package versions that are mutually compatible.

---

# 2. GAME IDENTITY AND CREATIVE DIRECTION

Game title: **TIC TAC TOE: ELEMENTAL ARENA**

Tagline: **"Three in a Row. Infinite Ways to Battle."**

Create a premium original visual identity.

### Art direction

Combine:

- Dark futuristic fantasy
- Neon cyberpunk highlights
- Magical elemental powers
- Beautiful glowing game boards
- Premium glassmorphism
- Soft ambient gradients
- Dynamic particle effects
- Smooth animated backgrounds
- Cinematic victory sequences
- Responsive micro-interactions
- Stylized elemental characters or avatars

### Primary color system

- Background: midnight navy and deep black
- Primary accent: electric violet
- Secondary accent: cyan
- Fire: blazing orange and red
- Ice: icy cyan and pale blue
- Lightning: electric yellow
- Nature: emerald green
- Legendary rewards: gold
- Defeat: muted crimson
- Victory: radiant gold and violet

Use color consistently to communicate gameplay states.

Avoid clutter, cheap-looking neon overload, unreadable text, excessive blur, and generic dashboard layouts.

The experience must look like a professionally designed commercial game.

---

# 3. CORE GAMEPLAY — 3×3 ELEMENTAL BATTLE

The board must always have exactly:

- 3 rows
- 3 columns
- 9 cells

The standard objective remains getting three of your symbols in a horizontal, vertical, or diagonal line.

However, players can strategically use powers to influence the board.

### Standard rules

- Two participants use X and O.
- Players alternate turns.
- Only legal actions are accepted.
- Three matching symbols in a valid line wins.
- A full board without a winner is a draw.
- Invalid moves never change the board.
- The server validates every action.
- Each match uses a clearly defined ruleset.

### Enhanced elemental rules

The enhanced game mode introduces powers, energy, cooldowns, temporary status effects, and strategic counterplay.

Powers must add depth without turning the game into random chaos.

Create deterministic rules that prevent ambiguity, infinite loops, and unfair advantages.

All effects must be synchronized for both players.

### Critical rule-engine requirements

Build a pure, testable game engine containing:

- Board state
- Player assignments
- Current turn
- Match phase
- Energy for each player
- Power inventory
- Active effects
- Effect duration
- Cooldowns
- Move history
- Power usage history
- Win detection
- Draw detection
- Timeout detection
- Final outcome

Each power must define:

1. Activation conditions
2. Valid targets
3. Energy cost
4. Cooldown
5. Whether it consumes a turn
6. Effect duration
7. Counterplay
8. Expiration timing
9. Interaction with other powers
10. Animation sequence
11. Server validation logic

No power may bypass server authority.

---

# 4. ADVANCED SUPERPOWER SYSTEM

Design a spectacular system with at least 18 distinct powers.

Each power needs a beautiful icon, unique sound, visual animation, strategic purpose, energy cost, and clear counterplay.

## POWER 1 — ICE FREEZE

Freeze an opponent-owned cell.

- Frozen cells cannot be modified by destructive or conversion powers while frozen.
- The symbol still counts toward winning lines.
- Duration: two owner-turn boundaries.
- The cell displays glowing ice crystals.
- Activation triggers a cinematic frost wave.
- Expiration triggers a satisfying ice-shattering effect.

## POWER 2 — FIRE BLAST

Destroy one eligible opponent symbol.

- Target must be an opponent-owned, unprotected cell.
- The cell becomes empty.
- Fire trails travel across the board.
- Sparks and smoke appear on impact.
- Cannot bypass active shields.

## POWER 3 — LIGHTNING STRIKE

Remove one eligible opponent symbol and temporarily electrify that cell.

- The cell becomes empty.
- The affected cell cannot be occupied for one opponent turn.
- Display electric arcs and lightning particles.
- Clearly distinguish the restriction from ice freezing.

## POWER 4 — SHIELD GUARD

Protect one of your occupied cells.

- Blocks one destructive or conversion effect.
- Protection is consumed when successfully attacked.
- The cell displays a translucent rotating shield.
- A blocked attack produces a powerful impact animation.

## POWER 5 — TIME WARP

Gain additional thinking time.

- Adds a limited number of seconds to the player's turn clock.
- Does not grant another move.
- Cannot exceed the configured maximum clock.
- Displays a clock distortion animation.

## POWER 6 — SHADOW SWAP

Exchange the contents of two eligible occupied cells.

- Cannot target frozen or protected cells.
- Costs substantial energy.
- Counts as the player's action.
- Can rearrange strategic positions.
- Must immediately evaluate resulting winning lines.

## POWER 7 — METEOR CRASH

Strike a selected eligible cell with a falling meteor.

- Destroys an unprotected opponent symbol.
- Leaves temporary scorched terrain.
- The terrain prevents occupation for a limited duration.
- Trigger a dramatic meteor impact animation.

## POWER 8 — HEALING BLOOM

Restore one of your previously destroyed symbols to an eligible empty cell.

- Requires an available restoration charge generated by losing a symbol.
- Does not resurrect an arbitrary move without a valid charge.
- Uses green magical particles and blooming effects.
- Counts as an action.

## POWER 9 — PORTAL SHIFT

Move one of your symbols to an eligible empty cell.

- Source becomes empty.
- Destination receives the symbol.
- Cannot move a frozen or protected symbol.
- Portal animation appears at both positions.

## POWER 10 — MIRROR REFLECT

Apply a temporary reflective defense to one of your cells.

- Reflects the next eligible single-target destructive power.
- Reflected damage affects the attacker's valid source cell where applicable.
- If no valid reflected target exists, the attack is blocked without additional damage.
- Reflection must never create recursive loops.

## POWER 11 — ENERGY SURGE

Gain a controlled amount of energy.

- Consumes an action.
- Has a cooldown.
- Cannot exceed maximum energy.
- Produces glowing energy streams around the player avatar.

## POWER 12 — PHANTOM MARK

Create a temporary illusion on an empty cell.

- Does not count toward a winning line.
- Is visually distinguishable from a real symbol.
- Expires after its defined duration.
- Can mislead opponents strategically without hiding essential rules.

## POWER 13 — GRAVITY PULSE

Shift eligible symbols according to a selected direction.

- Shift behavior must be deterministic.
- Protected or frozen symbols remain anchored.
- Other symbols move only to legal positions.
- Resolve movement in a stable order.
- Recheck winning conditions afterward.

## POWER 14 — POISON CURSE

Mark an opponent-owned cell with a curse.

- The curse expires after a defined duration.
- If not cleansed or protected, the mark is destroyed on expiration.
- Display purple smoke and magical rune effects.
- The affected player receives a clear warning.

## POWER 15 — PURIFY

Remove a negative status effect from one eligible cell.

- Removes poison, electricity, or other removable debuffs.
- Does not destroy normal ownership.
- Does not remove beneficial shields.
- Uses radiant light particles.

## POWER 16 — CRYSTAL LOCK

Temporarily lock an empty cell.

- Neither player can occupy it while locked.
- Duration is strictly limited.
- Cannot be applied if it would make the board permanently unplayable.
- Displays a large glowing crystal formation.

## POWER 17 — DRAGON BREATH

Launch a cinematic dragon-fire attack.

- Choose a row or column.
- Destroy at most one eligible opponent symbol within it.
- Deterministically select the first eligible target according to documented ordering.
- Higher energy cost and longer cooldown.
- Dragon animation must not block player input excessively.

## POWER 18 — ULTIMATE ECLIPSE

A rare, high-cost tactical ultimate.

- Remove one eligible opponent symbol.
- Apply a short darkness effect to that cell.
- Does not hide the actual board from either player.
- Cannot be used during the opening turns.
- Limited to once per match.
- Dramatic eclipse and shockwave animation.

### Additional power design

Create at least four more optional powers with genuinely different tactical functions.

Do not make every power simply destroy or freeze a symbol.

Include defensive, offensive, positioning, energy-management, and counterplay categories.

### Balance requirements

A player cannot use unlimited powers.

Implement:

- Maximum energy capacity
- Energy earned through normal legal actions
- Energy cost for powers
- Cooldowns
- Per-match usage limits
- Power selection before a match
- A maximum of three equipped powers
- Optional ultimate slot where supported
- Clear opponent loadout visibility

Powers must be earned or unlocked through fair gameplay.

No paid power may provide a competitive advantage in ranked play.

---

# 5. TURN STRUCTURE AND GAME BALANCE

A normal turn permits exactly one main action:

- Place a symbol, OR
- Activate a power that consumes a turn.

Non-turn-consuming powers must be explicitly classified and strictly limited.

### Resolution sequence

1. Verify authenticated participant.
2. Verify match is active.
3. Verify current turn.
4. Verify action sequence number.
5. Verify energy and cooldown.
6. Verify legal targets.
7. Apply action.
8. Resolve immediate effects.
9. Resolve expiration and status effects in documented order.
10. Check both players' winning lines.
11. Check draw and stalemate conditions.
12. Advance turn if match continues.
13. Persist authoritative state.
14. Broadcast resulting event.

Define a deterministic rule for simultaneous winning lines created by a power. For example, the acting player wins only if exclusively their own line exists; if both players have lines after the same atomic action, the result is a draw.

Prevent power loops, indefinite blocked boards, and never-ending matches.

Use a configurable maximum turn count for elemental matches.

Add an anti-stall mechanism that safely expires temporary restrictions.

Provide a comprehensive game rules guide explaining every interaction.

---

# 6. GAME MODES

Create multiple complete game modes.

## MODE A — CLASSIC

Traditional Tic-Tac-Toe.

- No powers
- Standard rules
- Quick matches
- Online and offline/AI variants
- Clean visual effects

## MODE B — ELEMENTAL BATTLE

The main signature mode.

- 3×3 board
- Equipped superpowers
- Energy
- Cooldowns
- Turn timers
- Cinematic attacks
- Tactical decisions

## MODE C — RANKED ARENA

Competitive real-player matchmaking.

- Human opponents only
- Server-authoritative gameplay
- Cup rating
- Ranked divisions
- Fair loadouts
- Seasonal leaderboards
- Match history
- Skill-based matchmaking
- Reconnection support

## MODE D — QUICK MATCH

Fast online matches with human opponents.

- Short queue times
- Simplified matchmaking
- Optional powers
- Unranked by default
- No cup penalties

## MODE E — FRIEND CHALLENGE

Play against a real friend.

- Private room code
- Invite link
- Real-time room joining
- Rematch option
- Spectator mode where permitted
- Optional room settings
- No ranked cup farming

## MODE F — AI CHALLENGE

Play against computer opponents.

Provide difficulty levels:

1. Beginner
2. Easy
3. Medium
4. Hard
5. Expert
6. Extreme
7. Nightmare

AI difficulty applies only to computer modes.

**Ranked multiplayer must never use AI opponents disguised as humans.**

### AI difficulty behavior

**Beginner:** Mostly random legal actions, makes frequent mistakes.

**Easy:** Blocks some obvious threats and makes simple decisions.

**Medium:** Uses basic tactics and evaluates immediate winning opportunities.

**Hard:** Uses minimax for classic mode and tactical evaluation for elemental mode.

**Expert:** Uses optimized search, power-aware threat analysis, and positional scoring.

**Extreme:** Uses deeper search, memoization, deterministic game simulation, and intelligent power management.

**Nightmare:** Uses the strongest practical strategy, optimized adversarial search, and carefully designed power combinations.

Classic 3×3 Tic-Tac-Toe is solvable. The strongest AI should be unbeatable under classic rules, resulting in draws against perfect play rather than artificial wins.

For elemental mode, implement actual power-aware search rather than pretending that ordinary minimax understands powers.

AI must have appropriate response delays and visible thinking indicators without slowing gameplay unnecessarily.

AI matches must not award competitive ranked cups.

---

# 7. REAL-TIME HUMAN MULTIPLAYER

Implement genuine real-time multiplayer using Socket.IO.

### Required features

- Live matchmaking
- Human vs human matches
- Authenticated socket connections
- Private match rooms
- Match state synchronization
- Server-controlled turn timers
- Server-side move validation
- Real-time power activation
- Real-time animation events
- Reconnection handling
- Opponent disconnect detection
- Rematch requests
- Match cancellation
- Surrender functionality
- In-game emotes
- Spectator support
- Presence indicators
- Match result confirmation
- Reliable reward calculation

### Matchmaking logic

Match players using:

- Selected game mode
- Compatible ruleset
- Cup rating
- Estimated skill
- Region and latency
- Queue waiting time

Begin with a narrow skill range and gradually expand it.

Never invent a human opponent when the queue is empty.

Show real queue status and estimated waiting time only when there is sufficient data to estimate it.

Allow players to cancel matchmaking.

### Multiplayer security

Clients must never determine:

- Winners
- Cup rewards
- Match outcomes
- Energy balances
- Valid power effects
- Opponent moves
- Turn expiration
- Ranking changes

All critical decisions must happen on the server.

Use atomic state transitions and action sequence numbers to prevent duplicate or conflicting moves.

Handle socket disconnects, stale events, delayed packets, duplicate requests, and race conditions.

For reconnecting players, send a complete authoritative state snapshot.

Do not expose hidden private information through socket events.

---

# 8. CUPS, RANKS, AND COMPETITIVE PROGRESSION

Create a meaningful cup-based ranking system.

Players gain cups for ranked victories and lose cups for ranked defeats.

Draws should have a documented rating outcome.

### Example divisions

| Division | Cups |
|---|---|
| Rookie | 0–99 |
| Bronze | 100–249 |
| Silver | 250–449 |
| Gold | 450–699 |
| Platinum | 700–999 |
| Diamond | 1000–1399 |
| Master | 1400–1899 |
| Grandmaster | 1900–2499 |
| Legend | 2500–3299 |
| Mythic | 3300+ |

### Cup rewards

Use a skill-sensitive rating algorithm.

Illustrative rewards:

- Victory against similar-rated opponent: +25 cups
- Defeat against similar-rated opponent: -20 cups
- Draw: small adjustment based on expected result
- Defeating stronger opponents: potentially higher gain
- Losing to weaker opponents: potentially larger loss

These numbers are starting balance targets, not hardcoded universal rewards.

Use an Elo-inspired expected-score calculation or another clearly documented rating model.

Prevent negative cup balances.

Do not allow farming cups through repeated private friend matches.

### Rank progression animation

After a ranked match:

- Display previous cup count.
- Animate cup gains or losses.
- Show rating progress.
- Trigger a division-promotion cinematic when appropriate.
- Show new badge and unlocks.
- Celebrate major milestones.

### Additional competitive systems

- Seasonal ranking
- Peak cups
- Lifetime victories
- Win streaks
- Best win streak
- Promotion rewards
- Season-end rewards
- Rank decay at high tiers, if justified
- Fair placement matches for new accounts
- Anti-smurf safeguards
- Leaderboard eligibility rules

---

# 9. GLOBAL AND REGIONAL LEADERBOARDS

Create a fully functional leaderboard backed by MySQL.

### Leaderboard categories

- Global cups
- Country cups
- Seasonal cups
- Weekly victories
- Win streak
- Lifetime wins
- Tournament victories
- Friends leaderboard

### Leaderboard UI

Show:

- Position
- Avatar
- Username
- Rank badge
- Cup count
- Win percentage
- Current streak
- Profile access

The top three players receive special podium presentations.

Use animated trophies, premium borders, subtle lighting, and polished transitions.

Highlight the current player's position.

If the player is outside the top displayed rankings, show their own position separately.

Implement pagination or virtualized loading for large leaderboards.

### Database rules

Rankings must use authoritative server-side data.

Use efficient indexed queries and caching where beneficial.

Never trust leaderboard scores submitted directly by a client.

---

# 10. PLAYER AUTHENTICATION AND ACCOUNT SYSTEM

Implement a complete account system.

### Authentication methods

- Email and password
- Google OAuth
- Optional guest account
- Guest-to-registered-account upgrade
- Password reset
- Email verification

Use secure authentication libraries and proper OAuth flows.

Never store plaintext passwords.

### Account registration

Collect:

- Username
- Email
- Password, where applicable
- Optional display name
- Selected starter avatar

Require unique usernames.

Validate input and handle duplicate accounts safely.

### Profile customization

Players can customize:

- Username
- Avatar
- Avatar frame
- Profile banner
- X symbol skin
- O symbol skin
- Board skin
- Victory animation
- Emote selection
- Equipped powers
- Player title

Cosmetics must not change competitive gameplay rules.

### Profile statistics

Display:

- Total matches
- Wins
- Losses
- Draws
- Win rate
- Cups
- Highest cups
- Current division
- Best division
- Current streak
- Longest streak
- Favorite power
- Most-used power
- Account creation date
- Seasonal achievements

Provide privacy controls for profile visibility and friend requests.

---

# 11. PREMIUM GAME LOBBY

The lobby must feel like the central hub of a premium game.

### Lobby composition

At the top:

- Animated player avatar
- Username
- Rank badge
- Cup count
- Currency balance
- Notifications
- Settings

Center:

A spectacular animated arena with a large **PLAY NOW** action.

Show:

- Featured game mode
- Current season
- Rank progress
- Daily challenges
- Active event
- Friend activity
- Available rewards

Bottom or side navigation:

- Home
- Battle
- Powers
- Leaderboard
- Shop
- Friends
- Profile

On mobile, use a beautiful responsive bottom navigation bar.

On desktop, use an adaptive sidebar or top navigation.

Make the lobby lively without excessive CPU/GPU usage.

---

# 12. CINEMATIC GAMEPLAY SCREEN

Design the gameplay screen as the most important part of the application.

### Layout

Top area:

- Opponent avatar
- Opponent username
- Opponent rank
- Opponent cup count
- Connection indicator
- Turn timer

Center:

- Beautiful 3×3 game board
- Dynamic arena background
- Floating particles
- Animated X and O symbols
- Status-effect indicators
- Energy and power effects

Bottom:

- Current player avatar
- Player energy bar
- Three equipped power buttons
- Ultimate power indicator
- Emotes
- Surrender control

### Board interactions

Every move should feel satisfying.

When X is placed:

- A glowing X draws itself with two animated strokes.
- Small particles burst outward.
- A subtle impact wave spreads from the cell.

When O is placed:

- A circular energy ring forms.
- The ring spins briefly and settles.
- A glow pulse radiates outward.

When a winning line forms:

- Winning symbols illuminate.
- The winning line animates across the board.
- Background lighting reacts.
- Camera-style motion emphasizes the result.
- Confetti or elemental particles appear.
- A victory overlay animates in.

### Power activation sequence

1. Player selects a power.
2. Valid target cells become highlighted.
3. Player selects a target.
4. Client sends action request.
5. Server validates the action.
6. Both clients receive the authoritative event.
7. Power animation plays.
8. Board updates visually.
9. New game state becomes interactive.

Optimistic feedback is allowed, but never finalize gameplay state before server confirmation.

Provide reduced-motion alternatives.

---

# 13. ADVANCED ANIMATION SYSTEM

Create a reusable animation architecture.

### Required animations

- Page transitions
- Lobby entrance
- Matchmaking search
- Match found
- Opponent reveal
- Countdown
- Turn switching
- Symbol placement
- Power charging
- Fire explosion
- Ice freeze
- Lightning strike
- Shield activation
- Shield breaking
- Portal transition
- Meteor impact
- Energy charging
- Critical tactical move
- Victory
- Defeat
- Draw
- Rank promotion
- Cup gain
- Cup loss
- Reward collection
- Achievement unlock
- Daily streak reward

### Animation quality rules

Animations must feel:

- Fluid
- Responsive
- High quality
- Cinematic
- Satisfying
- Consistent
- Optimized

Target 60 FPS on capable devices.

Use GPU-friendly transforms and opacity where practical.

Avoid expensive layout animations during gameplay.

Implement animation quality settings:

- Low
- Medium
- High
- Ultra

Support devices with limited performance.

Provide an option to disable intense screen shake and flashes.

Use Web Audio responsibly and respect browser autoplay restrictions.

---

# 14. GAME ECONOMY AND REWARDS

Create a fair progression economy.

### Currency types

**Cups:** Competitive ranking score, not spendable currency.

**Coins:** Earned through gameplay and challenges.

**Gems:** Optional premium cosmetic currency.

**XP:** Account progression experience.

Do not mix ranking cups with spendable currency.

### Reward sources

- Match completion
- Daily login
- Daily missions
- Weekly missions
- Level progression
- Achievements
- Tournaments
- Seasonal milestones
- Special events

### Reward examples

- Win three matches.
- Use five defensive powers.
- Win a match without using powers.
- Reach a new rank.
- Complete a daily challenge.
- Play against three unique human opponents.
- Finish a match with no invalid actions.

### Anti-abuse rules

Rewards must be calculated server-side.

Prevent farming using repeated suspicious matches, automation, or fake clients.

Do not reward users merely for keeping a match open.

Never allow users to purchase cups.

---

# 15. POWER UNLOCKS AND COLLECTION SYSTEM

Create a visually attractive power collection page.

Every power card should show:

- Name
- Icon
- Element
- Rarity
- Description
- Energy cost
- Cooldown
- Strategic role
- Unlock requirement
- Preview animation

### Rarity tiers

- Common
- Rare
- Epic
- Legendary
- Mythic

Rarity describes presentation and unlock progression, not automatic competitive superiority.

### Loadout builder

Players select three powers before a match.

Show:

- Offensive balance
- Defensive balance
- Mobility options
- Energy cost
- Synergy hints
- Weaknesses
- Recommended combinations

For ranked play, all competitors must have access to the same mechanically balanced power pool, or use a fair predefined draft/loadout system.

Do not create pay-to-win mechanics.

---

# 16. DAILY MISSIONS AND ACHIEVEMENTS

Implement a complete challenge system.

### Daily missions

Generate a rotating set of missions with achievable targets.

Examples:

- Play two matches.
- Win one elemental match.
- Block an attack using a shield.
- Earn 50 XP.
- Complete an AI challenge.

### Weekly missions

- Win ten ranked matches.
- Use six different powers.
- Reach a three-match win streak.
- Complete a tournament.

### Achievements

Examples:

- First Blood
- Ice Master
- Fire Lord
- Untouchable
- Comeback King
- Perfect Defense
- Lightning Champion
- Ten Wins
- Hundred Wins
- Thousand Wins
- Legend Reached
- Tournament Champion

Show achievement progress, unlock animations, and cosmetic rewards.

---

# 17. FRIENDS AND SOCIAL SYSTEM

Implement:

- Friend requests
- Accept/reject requests
- Remove friend
- Block user
- Online status
- Friend profiles
- Direct game challenges
- Invite links
- Recent opponents
- Rematch invitations
- In-game emotes
- Optional preset quick-chat messages

Do not require unrestricted chat for the initial release.

Use safe preset messages such as:

- Good luck!
- Nice move!
- Well played!
- Wow!
- Rematch?
- GG!

Add mute and report controls.

Prevent spam through rate limits.

---

# 18. TOURNAMENT SYSTEM

Create tournament support with:

- Scheduled tournaments
- Tournament registration
- Participant limits
- Bracket generation
- Single-elimination format
- Match scheduling
- Match result verification
- Automatic advancement
- Tournament standings
- Final championship screen
- Winner rewards
- Tournament history

Start with single-elimination tournaments.

Do not claim to support additional bracket types until implemented.

### Tournament presentation

Create a dramatic bracket UI with:

- Player avatars
- Live match status
- Winner progression
- Animated bracket transitions
- Final match spotlight
- Champion celebration

---

# 19. SEASONAL BATTLE PASS

Implement an optional seasonal progression system.

### Free track

- Coins
- Profile frames
- Board skins
- Basic emotes
- Seasonal badges

### Premium track

- Exclusive cosmetic skins
- Special victory animations
- Premium avatar frames
- Cosmetic power effects
- Unique profile banners

Premium rewards must not provide gameplay advantages.

Implement season start/end dates, XP milestones, reward claiming, and rollover rules.

Do not implement real-money payment processing until the required provider, region, and compliance requirements are configured.

---

# 20. COSMETIC SHOP

Create an attractive game shop.

Categories:

- X skins
- O skins
- Board themes
- Arena backgrounds
- Avatar frames
- Victory effects
- Power animation skins
- Emotes
- Profile banners

Examples:

- Galaxy X
- Inferno O
- Frozen Crystal Board
- Cyber Grid Arena
- Golden Champion Frame
- Dragon Victory Effect
- Cosmic Portal Animation

Provide live cosmetic previews.

Cosmetic ownership and purchases must be validated on the server.

Prevent duplicate purchases and negative balances.

Use transactional purchase processing.

---

# 21. MATCHMAKING AND WAITING EXPERIENCE

The matchmaking screen should be visually exciting.

Display:

- Player avatar
- Selected mode
- Current rank
- Animated searching indicator
- Queue duration
- Cancel button
- Optional gameplay tips

When an opponent is found:

- Play a cinematic transition.
- Reveal both players.
- Display usernames and rank badges.
- Show equipped powers.
- Present a short countdown.
- Enter the match.

Do not display invented matchmaking statistics.

---

# 22. VICTORY AND DEFEAT SCREENS

Create premium post-match experiences.

### Victory screen

Show:

**VICTORY**

- Cinematic golden lighting
- Animated trophy
- Winner avatar
- Cup gain
- XP earned
- Coins earned
- Win streak
- Rank progress
- Mission progress
- Rematch button
- Return to lobby

### Defeat screen

Show:

**DEFEAT**

- Elegant darker lighting
- Cup loss
- XP earned
- Match summary
- Useful strategic insight where available
- Rematch option
- Return to lobby

Avoid humiliating or manipulative defeat messaging.

### Draw screen

Show:

**DRAW**

- Balanced visual presentation
- Match statistics
- Appropriate rating adjustment
- Rematch option

---

# 23. GAME HISTORY AND REPLAYS

Store completed match history.

Each record should contain:

- Match ID
- Participants
- Mode
- Ruleset version
- Start time
- End time
- Winner or draw
- Cup changes
- Turn count
- Power usage
- Final board
- Action event history

Create a replay viewer.

Players can:

- Replay a match
- Pause
- Advance one move
- Go backward
- Inspect power activations
- Review tactical decisions

Replays must reconstruct authoritative recorded events rather than trusting the current client state.

---

# 24. DATABASE ARCHITECTURE

Design a normalized MySQL database using Prisma.

Include appropriate models such as:

- User
- Account
- Session
- VerificationToken
- PlayerProfile
- PlayerSettings
- PlayerStats
- PlayerRating
- RankDivision
- Season
- SeasonParticipation
- Match
- MatchParticipant
- MatchAction
- MatchResult
- PowerDefinition
- PlayerPower
- PowerLoadout
- PowerLoadoutSlot
- CurrencyWallet
- CurrencyTransaction
- RewardClaim
- DailyMission
- PlayerMissionProgress
- Achievement
- PlayerAchievement
- FriendRequest
- Friendship
- BlockedUser
- Tournament
- TournamentParticipant
- TournamentRound
- TournamentMatch
- CosmeticItem
- PlayerInventory
- ShopPurchase
- LeaderboardSnapshot
- Notification
- PlayerReport
- AuditLog

### Database requirements

- Use appropriate foreign keys.
- Use unique constraints.
- Index frequent queries.
- Use transactions for cup updates.
- Use transactions for wallet changes.
- Prevent duplicate match settlement.
- Track rating history.
- Store match events in sequence.
- Support season-specific statistics.
- Store timestamps consistently.
- Avoid unnecessary duplicated data.
- Use cursor pagination where appropriate.

Use integer minor units for currencies rather than floating-point values.

Ensure concurrent match settlement cannot award duplicate rewards.

Include complete Prisma schema, migrations, and seed data.

---

# 25. BACKEND API DESIGN

Implement documented endpoints for:

### Authentication

- Register
- Login
- Logout
- Session
- Password reset
- Profile verification

### Player

- Get profile
- Update profile
- Get statistics
- Get inventory
- Update loadout
- Get match history

### Game

- Create match
- Get match state
- Get match history
- Request surrender
- Request rematch

### Rankings

- Global leaderboard
- Regional leaderboard
- Seasonal leaderboard
- Current player rank

### Social

- Send friend request
- Accept request
- Reject request
- List friends
- Block player

### Economy

- Wallet
- Shop catalog
- Purchase cosmetic
- Claim rewards
- Mission progress

### Tournament

- List tournaments
- Register
- View bracket
- Get standings

Implement schema validation, authentication, authorization, consistent errors, and rate limiting.

Use appropriate HTTP methods and status codes.

---

# 26. SOCKET.IO EVENT DESIGN

Create clearly documented real-time events.

### Client-to-server events

- queue:join
- queue:leave
- match:join
- match:reconnect
- match:move
- match:power
- match:surrender
- match:rematchRequest
- match:emote
- room:create
- room:join
- room:leave

### Server-to-client events

- queue:joined
- queue:status
- queue:cancelled
- match:found
- match:started
- match:state
- match:actionApplied
- match:turnChanged
- match:powerActivated
- match:playerDisconnected
- match:playerReconnected
- match:finished
- match:rewardSettled
- match:error
- room:updated

Use consistent event payload schemas.

Add acknowledgments, request IDs, idempotency keys, and state sequence numbers.

Do not broadcast private session credentials or unnecessary personal information.

---

# 27. ANTI-CHEAT AND SECURITY

Treat the browser as untrusted.

Implement:

- Secure authentication
- Server-authoritative game logic
- Input validation
- Action rate limits
- Socket authentication
- Origin validation
- Match membership validation
- Duplicate action prevention
- Transactional rewards
- Secure password hashing
- CSRF protections where applicable
- Secure cookie settings
- Environment-based secrets
- Safe database queries
- Report and moderation systems
- Suspicious match detection
- Anti-collusion protections
- Ranked match farming prevention

Never trust client-supplied cup changes.

Never trust client-supplied match outcomes.

Never trust client-side timers as authoritative.

Use structured audit logs for sensitive actions.

---

# 28. RESPONSIVE DESIGN

The game must work beautifully on:

- Mobile phones
- Tablets
- Laptops
- Desktop monitors
- Large screens

### Mobile requirements

- Touch-friendly controls
- Large playable cells
- No horizontal overflow
- Compact power toolbar
- Responsive board scaling
- Safe-area support
- Portrait orientation support
- Fast transitions
- Readable text
- Accessible interaction states

### Desktop requirements

- Centered cinematic arena
- High-quality layout
- Keyboard accessibility
- Hover interactions
- Optional enhanced visual effects
- Appropriate use of larger screen space

Avoid building the desktop UI first and simply shrinking it for mobile.

Design both experiences intentionally.

---

# 29. PERFORMANCE OPTIMIZATION

Optimize for real-world devices and network conditions.

### Frontend

- Lazy-load heavy visual effects.
- Split large components.
- Memoize expensive computations.
- Minimize unnecessary re-renders.
- Use optimized images.
- Load fonts efficiently.
- Limit particle counts.
- Pause decorative animations in inactive tabs.
- Support reduced motion.
- Clean up animation listeners and timers.
- Prevent memory leaks.

### Multiplayer

- Use small socket payloads.
- Avoid broadcasting unchanged state unnecessarily.
- Support reconnect synchronization.
- Measure event latency.
- Handle network instability.
- Avoid excessive database writes.
- Use Redis only where its benefits justify complexity.

### Database

- Add proper indexes.
- Avoid N+1 queries.
- Use pagination.
- Optimize leaderboard queries.
- Cache high-traffic read endpoints where appropriate.

Measure performance rather than assuming it is optimized.

---

# 30. SOUND AND HAPTIC EXPERIENCE

Create a premium audio-feedback system.

Sound categories:

- UI clicks
- Match found
- Countdown
- Symbol placement
- Fire attack
- Ice attack
- Lightning attack
- Shield impact
- Energy recharge
- Victory
- Defeat
- Cup gain
- Rank promotion
- Reward claim

Provide:

- Master volume
- Music volume
- Effects volume
- Mute toggle
- Optional vibration on supported mobile devices

Audio should begin only after appropriate user interaction and browser permission conditions.

---

# 31. ACCESSIBILITY AND PLAYER SETTINGS

Include:

- Reduced motion
- High-contrast mode
- Colorblind-friendly symbol differentiation
- Keyboard navigation
- Visible focus states
- Screen-reader labels
- Sound controls
- Animation quality controls
- Notification settings
- Privacy controls
- Language-ready architecture

Never rely solely on color to communicate game states.

---

# 32. ADMIN DASHBOARD

Build a protected admin interface.

### Dashboard capabilities

- Total users
- Active users
- Concurrent matches
- Matches completed
- Queue health
- Match completion rate
- Average match duration
- Power usage statistics
- Rank distribution
- Reports
- Suspicious activity
- Economy metrics

### Admin controls

- Suspend abusive accounts
- Review player reports
- Configure seasons
- Configure missions
- Configure cosmetic catalog
- Schedule tournaments
- Manage announcements
- Inspect match logs
- Adjust future balance configurations

Protect admin access with role-based authorization.

Log all sensitive admin actions.

---

# 33. ADDITIONAL ENGAGEMENT FEATURES

Implement thoughtful systems that increase long-term enjoyment and replayability.

### A. Daily Login Calendar

Seven-day rotating rewards with an attractive calendar UI.

Do not use punitive streak resets or manipulative pressure.

### B. Daily Puzzle Challenge

Give all players the same carefully generated tactical puzzle.

Examples:

- Win in one move.
- Survive an opponent's ultimate.
- Use exactly one power to force a draw.
- Find the best defensive move.

### C. Combo Showcase

Display special animation names when players create meaningful tactical sequences.

Examples:

- Frozen Victory
- Flame Reversal
- Perfect Counter
- Shield Master
- Portal Checkmate

Combo labels are cosmetic achievements, not arbitrary bonus damage.

### D. Dynamic Arena Themes

Different cosmetic environments:

- Frozen Kingdom
- Volcano Temple
- Cyber Arena
- Ancient Ruins
- Cosmic Void
- Thunder Citadel

### E. Player Titles

Examples:

- The Strategist
- Ice Commander
- Fire Champion
- Unbreakable
- Arena Legend
- Mythic Tactician

### F. Match Highlights

Automatically identify interesting moments such as:

- Winning-line prevention
- Successful shield counter
- Comeback after a disadvantage
- Final-turn victory
- Tactical power combination

### G. Spectator Mode

Allow spectators in eligible rooms.

Spectators must not be able to send gameplay actions.

Add privacy settings and prevent spectators from leaking restricted information.

### H. Practice Arena

Allow users to experiment with powers against scripted situations without risking cups.

### I. Personalized Progress

Display genuine player milestones, skill improvement, and recent achievements.

### J. Seasonal Events

Introduce cosmetic arena themes, missions, and limited-time challenge formats.

Never create artificial countdowns or misleading scarcity.

---

# 34. COMPLETE PAGE LIST

Implement the following routes or their well-structured equivalents.

Public pages:

- Landing page
- Login
- Register
- Forgot password
- Email verification
- Terms
- Privacy
- Game rules

Authenticated pages:

- Lobby
- Mode selection
- Matchmaking
- Active match
- Match results
- AI challenge
- Friend challenge
- Private room
- Leaderboards
- Player profile
- Profile editing
- Match history
- Replay viewer
- Power collection
- Loadout builder
- Shop
- Inventory
- Daily missions
- Achievements
- Friends
- Tournaments
- Tournament details
- Season pass
- Rewards
- Notifications
- Settings

Admin pages:

- Admin overview
- User moderation
- Match monitoring
- Economy monitoring
- Tournament management
- Season management
- Content configuration

Every page must use the same cohesive design system.

Implement appropriate loading, empty, success, and error states.

---

# 35. ARCHITECTURE AND FOLDER ORGANIZATION

Use a scalable modular structure.

Suggested organization:

- src/app
- src/components
- src/components/ui
- src/components/game
- src/components/lobby
- src/components/animations
- src/components/leaderboard
- src/components/profile
- src/components/powers
- src/components/shop
- src/hooks
- src/lib
- src/lib/auth
- src/lib/db
- src/lib/game-engine
- src/lib/game-engine/powers
- src/lib/matchmaking
- src/lib/ranking
- src/lib/economy
- src/lib/security
- src/server
- src/server/socket
- src/server/services
- src/server/repositories
- src/styles
- prisma
- tests
- public/assets
- public/audio

Separate pure game logic from React components and network handlers.

Reuse the same authoritative game engine for AI simulations and multiplayer validation where appropriate.

Keep game configuration data-driven.

---

# 36. TESTING AND VALIDATION

Do not claim the game is complete until core flows have been tested.

### Unit tests

Test:

- Every classic win condition
- Draw detection
- Illegal moves
- Turn order
- All powers
- Power cooldowns
- Energy calculations
- Effect expiration
- Simultaneous winning-line resolution
- Rank calculations
- Reward calculations
- AI move legality

### Integration tests

Test:

- Registration
- Login
- Google OAuth callback handling
- Profile updates
- Database persistence
- Match creation
- Match settlement
- Leaderboard updates
- Shop transactions

### Multiplayer tests

Test:

- Two real authenticated browser clients joining a match
- Turn synchronization
- Simultaneous move requests
- Duplicate events
- Disconnect and reconnect
- Timeout resolution
- Surrender
- Rematch
- Power synchronization
- Cup settlement exactly once

### End-to-end tests

Use Playwright or an equivalent JavaScript-compatible tool.

Validate:

- New user registration
- Login
- Enter lobby
- Select game mode
- Play AI match
- Find a human opponent
- Complete multiplayer match
- Receive cups
- View updated leaderboard
- Equip powers
- Use powers in battle
- View match history
- Replay completed match

Provide reproducible test commands.

---

# 37. IMPLEMENTATION PRIORITIES

Build the application in carefully validated phases.

## Phase 1 — Foundation

- Next.js project
- JavaScript configuration
- Tailwind design system
- MySQL connection
- Prisma schema
- Authentication
- Core layouts
- Reusable UI components

## Phase 2 — Game Engine

- Classic 3×3 rules
- Deterministic elemental rules
- Turn management
- Power system
- Win/draw detection
- Unit tests

## Phase 3 — Core Gameplay UI

- Responsive arena
- Board animations
- Power toolbar
- Energy indicators
- Turn timers
- Victory/defeat screens
- Audio controls

## Phase 4 — AI Opponents

- All seven difficulties
- Classic AI
- Elemental power-aware AI
- AI challenge interface
- Difficulty validation

## Phase 5 — Real Multiplayer

- Socket.IO server
- Authentication
- Matchmaking
- Real-time game rooms
- Disconnect/reconnect
- Private challenges
- Multiplayer tests

## Phase 6 — Competitive Systems

- Cups
- Rank divisions
- Leaderboards
- Seasons
- Player statistics
- Match history

## Phase 7 — Progression and Social

- Missions
- Achievements
- Friends
- Power collection
- Loadouts
- Rewards
- Cosmetics

## Phase 8 — Advanced Features

- Tournaments
- Replays
- Spectator mode
- Seasonal pass
- Admin dashboard
- Seasonal events

## Phase 9 — Final Polish

- Cinematic animation improvements
- Responsive optimization
- Accessibility
- Security audit
- Performance testing
- Bug fixes
- Deployment documentation

Each phase must produce functional, integrated code.

Do not skip core functionality to create superficial advanced screens.

---

# 38. EXPECTED DELIVERABLES

Deliver a complete working project containing:

1. Full Next.js JavaScript source code.
2. MySQL database schema.
3. Prisma migrations.
4. Seed data.
5. Authentication implementation.
6. Functional classic game engine.
7. Functional elemental power engine.
8. AI difficulty system.
9. Real-time human multiplayer.
10. Socket.IO server.
11. Ranked cup system.
12. Leaderboard system.
13. Player profiles.
14. Match history.
15. Power loadouts.
16. Progression and rewards.
17. Shop and cosmetic inventory.
18. Friends and private challenges.
19. Tournaments.
20. Cinematic responsive UI.
21. Admin tools.
22. Automated tests.
23. Environment variable example.
24. Local setup instructions.
25. Production deployment instructions.

### Required documentation

Provide:

- README.md
- .env.example
- Database setup instructions
- Socket.IO architecture explanation
- Ruleset documentation
- Power interaction documentation
- Ranking formula documentation
- Security assumptions
- Deployment requirements
- Testing commands

---

# 39. QUALITY REQUIREMENTS

The finished product must satisfy these conditions:

- It must look premium rather than generic.
- The 3×3 board must remain central.
- Every power must have meaningful mechanics.
- Powers must be balanced and understandable.
- Human multiplayer must involve genuine human players.
- AI difficulties must actually behave differently.
- Cup changes must be accurate and secure.
- Leaderboards must use real database data.
- Match results must be persisted.
- UI animations must be polished and performant.
- Gameplay must be responsive.
- Authentication must be secure.
- The game must work on mobile and desktop.
- Every major feature must have functional backend support.
- No fake buttons.
- No fake multiplayer.
- No hardcoded leaderboard pretending to be live.
- No simulated match results.
- No placeholder power mechanics presented as finished.
- No pay-to-win competitive systems.
- No hidden client-side authority over match outcomes.

---

# 40. FINAL CREATIVE EXPECTATION

Imagine the player opens the website for the first time.

The screen reveals a beautiful futuristic elemental arena.

A glowing Tic-Tac-Toe board floats in the center.

Electric energy travels along the edges.

A powerful title appears:

**TIC TAC TOE: ELEMENTAL ARENA**

Underneath:

**THINK. STRIKE. CONQUER.**

The player registers, chooses an avatar, explores powers, and enters their first battle.

During gameplay:

- X and O symbols materialize with beautiful energy effects.
- Fire attacks explode across the arena.
- Ice powers cover cells in glowing crystals.
- Shields absorb attacks with cinematic impact effects.
- Lightning strikes illuminate the board.
- Strategic power combinations create memorable moments.
- The match remains fast, fair, understandable, and exciting.

After winning, the player sees a satisfying victory sequence, gains cups, progresses toward the next rank, and can immediately queue for another match.

The result should feel like an original, premium competitive game rather than a basic classroom Tic-Tac-Toe project.

---

# 41. DEVELOPMENT EXECUTION INSTRUCTIONS

Do not respond with only a concept, architecture diagram, or explanation.

Actually implement the application.

Begin by defining the ruleset and technical architecture, then build the working project.

For each implementation phase:

1. Create real files and code.
2. Connect frontend and backend functionality.
3. Implement actual database operations.
4. Add appropriate tests.
5. Run tests and fix failures.
6. Verify the feature in a browser where tools permit.
7. Report what works and what remains incomplete.
8. Continue to the next phase.

Do not replace complex requirements with static mockups.

Do not falsely claim untested functionality works.

Do not invent deployment URLs or pretend third-party credentials are configured.

When external credentials or infrastructure are required, document the exact configuration and continue implementing everything that can be completed locally.

Prioritize a genuinely playable, polished, secure multiplayer game over an enormous collection of unfinished features.

If the full scope cannot be completed in one execution, deliver the smallest fully working vertical slice first:

**Authentication → Lobby → Matchmaking → Human Multiplayer → 3×3 Elemental Game → Match Result → Cup Update → Leaderboard.**

Then extend it systematically with powers, AI, progression, tournaments, and cosmetics.

## FINAL SUCCESS CRITERION

The project is successful only when two real users can log in from separate browsers, enter matchmaking, join the same live 3×3 match, use validated elemental powers, see synchronized animations, finish the match, receive correct cup changes, and view their updated rankings in a polished, responsive gaming interface.

**Build Tic Tac Toe: Elemental Arena as a real game that people will want to play repeatedly, master strategically, and recommend to friends.**