# Elemental Arena rules: ranked-elemental-v2

Ranked Elemental Battle is the flagship: a visible three-power loadout, a choice of 3×3 through 6×6 boards and 20-second turns. 3×3 retains up to three rounds; larger boards use one scored round. All 22 catalog powers are implemented and available equally to every player. Cosmetic purchases never alter power strength, energy, targeting, clocks, or rewards. The initial match-duration target is 2–5 minutes; human playtests are needed to measure actual duration and balance.

The 4×4, 5×5 and 6×6 scoring rules and transparent Ranked bot fallback are detailed in [Game UI and scoring boards](GAME_UI.md). The first-line and three-round statements below apply to 3×3.

## Match and turn structure

- X starts round one. O starts round two. X starts round three. Marks stay assigned to the same players throughout the match.
- The winner of two rounds wins immediately. Otherwise the higher round-win total after three rounds wins; tied totals draw. Drawn rounds count toward the three-round cap.
- One main action is a placement or a power activation. Time Warp is the sole auxiliary power: it extends the clock without consuming or adding a main action. Every other power consumes the whole turn.
- Each player starts each elemental round with three energy. Ordinary placement earns one, capped at six. Power actions do not earn placement energy. Classic has no energy or powers.
- Equip exactly three different powers before a match. Both loadouts stay visible. Each equipped power can be used once per round; Eclipse is additionally limited to once per match. Energy and round cooldowns reset on a new round. Match usage remains available for statistics and Eclipse validation.
- A line of three real owned marks wins. Frozen, rooted, mirrored and shielded marks still count. A full board without a line draws immediately, even when a destructive power remains available. Phantom illusions are effects and never real marks.
- Check both owners after the complete action and its effect expiration. Simultaneous winning lines draw. Ownership uses participant IDs; X and O are visual assignments.
- Thirty completed main actions without another result draw the round. Time Warp does not increment this counter and cannot be used repeatedly in the same round.

## Clocks and rejected actions

The server sets a deadline of the smaller of the configured turn limit (default 20 seconds; permitted range 15–30) and the player's remaining match bank. Each player starts with a 120-second thinking bank across all 3×3 rounds. Larger boards use 240/360/480-second banks for 4×4/5×5/6×6. Accepted actions charge elapsed thinking time. Time Warp can restore up to eight seconds to that bank, capped at the selected board’s initial bank, and extend the current deadline by up to eight seconds. Its absolute turn deadline remains capped at 30 seconds from the original start of the turn. It never grants another placement or power action.

A turn timeout loses the current round; exhausting the bank loses the whole match. A delayed timer callback charges only up to the deadline. New-round clocks start when the server processes the transition. Animation and reconnect delays do not pause the clock; the client clock is a display.

Surrender ends the whole match and is allowed by either participant regardless of whose turn it is. Spectators cannot act. Every action, including surrender, requires a valid current integer revision. A duplicate or stale revision, wrong turn, invalid target, unavailable power or insufficient energy rejects the request without changing state, deadline, energy, effects, usage or history. At or after a deadline main actions reject with `TURN_EXPIRED`; the server's `tick` resolves the timeout.

## All 22 powers

| Power | Energy | Activation and targets | Duration and counterplay |
|---|---:|---|---|
| Fire Blast | 2 | Target an unfrozen enemy mark. Destroy it, or consume its shield. | Instant. Mirror may reflect it once. No terrain is created. |
| Shield Guard | 1 | Protect a friendly mark without a shield. | Absorbs one destructive hit or lasts to round end. Shield resolves before Mirror. |
| Portal Shift | 2 | Move an eligible friendly source to an empty unlocked destination. | Instant. Frozen, rooted, shielded and mirrored sources cannot move. |
| Ice Freeze | 1 | Freeze an unfrozen enemy mark. Its symbol still counts toward lines. | Through the next two completed owner turns. It anchors the mark and prevents destructive targeting. Purify removes frost. |
| Crystal Lock | 1 | Restrict an empty unlocked cell for both players. | Through the opponent's next main action. Purify removes it; Tide redirects it. |
| Energy Surge | 0 | Activate while below six energy. Gain up to three. | The whole main action is spent; the opponent acts next. Invalid at full energy. |
| Lightning Strike | 3 | Target an unfrozen enemy mark. Destroy it and electrify the resulting empty cell. | Terrain persists through one opponent action. Shield absorbs impact without terrain; Mirror may reflect impact and terrain. Purify or Tide counters terrain. |
| Time Warp | 1 | Extend the current deadline and restore bank time. No board target. | Once per round; up to eight seconds, a 30-second absolute turn cap and initial match-bank cap. The same player retains the one main action. |
| Shadow Swap | 3 | Choose a friendly source, then an enemy destination, and exchange ownership, effects and mark provenance atomically. | Both marks must be movable: no freeze, root, shield or mirror. Both players' lines are checked. |
| Meteor Crash | 4 | Target an unfrozen enemy mark. Destroy it and scorch the resulting empty cell. | Terrain persists through two opponent actions. Shield or Mirror counters impact; Purify or Tide counters terrain. |
| Healing Bloom | 2 | Spend the oldest genuine destroyed-friendly-mark charge to restore a mark on any empty unlocked cell. | A real mark must first be destroyed in this round. Each charge restores at most one mark and is shared with Echo. |
| Mirror Reflect | 2 | Give a friendly mark a reflective defense. | Through two subsequent completed owner turns or the next eligible single-cell hit. Select the first unfrozen, unshielded, unmirrored attacker mark in ascending cell order; destroy that mark once. With no eligible attacker mark, block the attack. Dragon and poison cannot be reflected. |
| Phantom Mark | 1 | Put a visibly labelled illusion on an empty unlocked cell. | Through one opponent action. It never counts toward lines or blocks a real placement. A real placement clears it; Purify also removes it. |
| Gravity Pulse | 3 | Choose up, down, left or right. Slide every eligible mark one square, resolving the leading edge first. | Anchored marks stay fixed. Occupied and locked destinations stop movement; no edge wrap occurs. A direction with no movement is invalid. |
| Poison Curse | 2 | Curse an unfrozen enemy mark and display a warning to its owner. | After that owner's next main action, apply a delayed destructive hit before line checks. Purify cleanses the curse; Shield absorbs the hit. A mark still frozen at expiration survives. Mirror does not reflect poison. |
| Purify | 1 | Choose a cell with a removable negative effect. Remove frost, poison, hostile root, phantom and restricted terrain. | Ownership, beneficial shield, Mirror and the caster's own root remain. An unaffected cell is invalid. |
| Dragon Breath | 4 | Choose a row or column. Hit its first unfrozen enemy mark in ascending cell order. | At most one target per activation. Shield absorbs that hit; Mirror cannot reflect it. Frozen marks are skipped. |
| Ultimate Eclipse | 6 | After four completed main actions in the current round, strike an unfrozen enemy mark and darken the resulting empty cell. | Once per match across all rounds. Darkness persists through one opponent action and never conceals the board. Shield or Mirror counters impact; Purify or Tide counters terrain. |
| Tide Reversal | 2 | Choose enemy-created terrain on an empty locked cell, then transfer it to a different empty unlocked destination. | Preserve terrain type without duplicating it; the redirected terrain lasts through one opponent action. Occupied cells and the caster's own terrain are invalid sources. |
| Wind Step | 1 | Move an eligible friendly mark exactly one square diagonally to an empty unlocked cell. | No orthogonal or multi-square shortcut. Freeze, root, shield and mirror anchor the source. |
| Root Anchor | 1 | Anchor a friendly mark without an existing root. | Through two subsequent completed owner turns. Prevents Portal, Wind, Shadow and Gravity movement. Destructive powers still work. |
| Chrono Echo | 2 | Restore the caster's most recent basic placement at its original cell, consuming that exact mark's genuine destruction charge. | The most recent placement must have been destroyed in this round; its original cell must be empty and unlocked. Movement alone gives no charge. It cannot reuse a charge already consumed by Bloom. |

## Effect timing and atomic resolution

`turnNumber` increments after main actions; Time Warp does not advance it or expire effects. Effects reset at round boundaries, including timeout boundaries.

- Ice cast at turn N stores `frozenUntil = N + 4`, covering enemy owner turns N + 1 and N + 3.
- Root and Mirror cast at turn N store their deadline at N + 5, covering the caster's next two completed owner turns N + 2 and N + 4.
- Crystal, Lightning, Eclipse, Tide and Phantom store a deadline at N + 2, covering the opponent's next main action N + 1.
- Meteor stores `lockedUntil = N + 4`, covering two opponent actions.
- Poison stores `poisonUntil = N + 2`. Its warning gives the mark owner the incoming main action to respond. Expiration happens before winning lines are checked.

The resolution order is authentication and membership in the server adapter; phase, revision, turn, time, power, energy and target validation; clone the state; charge the clock; apply one action and any shield or one-level Mirror reaction; advance the turn for main actions; expire timed effects and resolve poison; check both owners' lines, board fullness and action cap; set the next deadline. Shield resolves before Mirror. Mirror reflection never recursively reflects. Gravity's stable leading-edge order allows a chain to move one cell each without collisions. Dragon and Mirror use ascending row-major cell order for deterministic targets.

Destruction records the lost mark's owner, original placement and loss identifier as a restoration charge. Bloom and Echo consume this same inventory. Charges reset between rounds, so neither power can fabricate, duplicate or restore marks from earlier rounds. If temporary terrain leaves the incoming player with no legal main action, the engine clears terrain early instead of forcing a timeout. Time Warp alone does not count as an available main action for this safeguard.

History records accepted actions with revision and server timestamp. Invalid actions never append history. Board coordinates are A1, B1, C1, then A2, B2, C2, then A3, B3, C3. Cell indices are row-major, from zero to boardSize²−1. Larger boards extend columns through F and rows through 6.

## Practice, Classic and AI

The Power Lab on `/powers` offers one prepared scenario for each of the 22 powers. Prerequisites such as a genuinely destroyed mark, hostile terrain, a poison curse and Eclipse's opening limit are created by recorded legal engine actions. Only the starting demonstration energy is supplied. Training is local, has no rewards and uses the same immutable transition function as multiplayer.

Classic uses authoritative alternating turns and deadlines with ordinary placement only. Online, private and AI Classic matches use one round. It evaluates all eight lines and full-board draws. Elemental matches use the three-round shell.

AI has seven levels. Beginner uses mostly random legal choices; Easy mixes random actions with one-action tactics; Medium targets two-action search with occasional mistakes; Hard targets three elemental actions; Expert, Extreme and Nightmare target progressively deeper adversarial search, move ordering, alpha-beta pruning, memoization and bounded node/thinking-time budgets. Iterative deepening returns the strongest fully completed depth. Simulations use the same legal power transitions, targets and durations as multiplayer. This is bounded search, not a claim of a solved elemental ruleset. Hard and higher 3×3 Classic AI use full-board minimax and cannot lose under ordinary Classic rules. Larger boards use bounded search. AI actions carry the current revision. Practice awards no cups; explicitly labelled Ranked competitive bots use the existing cup formula. Bots never impersonate humans.

## Engine API

The browser and Socket.IO adapter import ESM from `src/lib/game-engine/index.js`. The module has no database, browser, network or timer side effects.

- `createGame({ mode: 'elemental' | 'classic', players: [{ id, name, loadout }], turnSeconds: 20, now, rounds: 3 })` creates a JSON-serializable state.
- `applyAction(state, playerId, action, now)` returns a new state or throws an `Error` with a stable `.code`. Actions are `{ type: 'place', cell, revision }`, `{ type: 'power', powerId, cell?, from?, to?, direction?, axis?, index?, revision }`, or `{ type: 'surrender', revision }`. Cell-targeted powers also accept `target` as an alias of `cell`. Gravity uses `direction: 'up' | 'down' | 'left' | 'right'`. Dragon uses `axis: 'row' | 'column'` and a zero-based `index` from 0 to 2.
- `tick(state, now)` returns the original reference until a timeout, then a new resolved state. Finished states stay unchanged.
- `legalActions(state, playerId)` returns validated main and auxiliary actions with the current revision. It excludes surrender, so AI never randomly forfeits. The frontend derives target highlights and direction/line controls from this exact list.
- `chooseAIAction(state, difficulty, { rng?, depth?, maxNodes?, maxTimeMs? })` returns a legal action or null. Tests can use `maxTimeMs: Infinity` for a deterministic node budget.
- `detectOutcome(board)` returns deterministic real-mark line and full-board results.
- `POWER_CATALOG`, `RANKED_POWER_IDS`, `DEFAULT_LOADOUT`, `WIN_LINES` and `RULESET` provide shared validation and presentation data.

Run `node --test tests/engine.test.js tests/all-powers.test.js tests/power-training.test.js tests/replay-analysis.test.js` to validate engine behavior, every training scenario and replay explanations. The Classic tests also enumerate every human continuation against Nightmare AI as either side.
