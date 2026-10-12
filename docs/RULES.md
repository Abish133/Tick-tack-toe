# Elemental Arena rules: v1

Ranked Elemental Battle is the flagship: a visible three-power loadout, a 3 by 3 board, 20-second turns, and best-of-three rounds. The initial match-duration target is 2–5 minutes, to be measured with human playtests rather than treated as a guaranteed duration. The six released powers are available equally to every player. Sixteen other concepts remain explicitly locked and unimplemented until progressive balance work is complete. Purchases never increase ranked power strength.

## Match and turn structure

- X starts round one. O starts round two. X starts round three. Marks stay assigned to the same players throughout the match.
- The winner of two rounds wins immediately. Otherwise the higher round-win total after three rounds wins; tied totals draw. Drawn rounds count toward the three-round cap.
- One turn is exactly one placement or one power activation. Every released power consumes the entire turn. No chaining or extra action is possible.
- Each player starts each elemental round with three energy. Ordinary placement earns one, capped at six. Power actions do not earn placement energy. Classic has no energy or powers.
- Equip exactly three different released powers before the match. Both loadouts remain visible. Each equipped power can be used once per round; its round cooldown and energy reset when a new round starts. Total per-player usage is retained for match statistics.
- A standard line of three real owned marks wins. Frozen and shielded marks still count. A full board without a line draws immediately, even when a destructive power remains available.
- Check both owners after the complete atomic action. If both have winning lines, the round draws. Ownership is represented by participant IDs; X and O are visual assignments.
- Thirty completed main actions without another result draw the round. No power loop can continue indefinitely.

## Clocks

The server sets a deadline of the smaller of the configured turn limit (default 20 seconds; permitted range 15–30) and the player's remaining match bank. Each player has a total 120-second thinking bank across all rounds. Accepted actions charge their elapsed thinking time. A turn timeout loses the current round; exhausting the match bank loses the whole match. A delayed timer callback charges only up to the deadline. New-round clocks start when the authoritative transition is processed. The client clock is only a display.

Surrender ends the entire match and is allowed by either participant regardless of whose turn it is. Spectators cannot act. A valid, current integer revision is mandatory for every action including surrender. A duplicate or stale revision, wrong turn, invalid target, unavailable power or insufficient energy rejects the request without changing the state, clock deadline, energy, effects or history. At or after the deadline main actions reject with `TURN_EXPIRED`; the authoritative server's `tick` transition resolves the timeout.

## Released powers

| Power | Energy | Activation and targets | Duration and counterplay |
|---|---:|---|---|
| Fire Blast | 2 | Target an enemy occupied cell that is not frozen. Remove the mark, or consume its shield without removing it. | Instant. A shield absorbs the single attack. Frozen targets are invalid and do not spend the power. |
| Shield Guard | 1 | Target an existing friendly occupied cell without a shield. | One destructive hit, or the end of the round. A hit consumes the shield. It is not a new symbol placement. |
| Portal Shift | 2 | Choose an owned source mark with no shield or freeze and an empty, unlocked destination. Source empties and destination takes ownership atomically. | Instant. Frozen and protected sources cannot move. All winning lines are reevaluated immediately. |
| Ice Freeze | 1 | Target an enemy occupied cell not already frozen. | Expires after that mark owner's next two completed turns. Freeze anchors the mark against Portal Shift and prevents Fire Blast. The frozen mark still counts toward a line. |
| Crystal Lock | 1 | Target an empty cell that is not already locked. Neither participant can occupy it while locked. | Expires at the end of the opponent's next completed action. If a temporary restriction leaves the incoming player with no legal main action, locks expire early so the board cannot deadlock. |
| Energy Surge | 0 | Activate while below six energy. No cell target. | Gain up to three energy, capped at six. The opponent gets the next action. Cannot be activated at full energy. |

These are deliberately conservative implementations of the original concepts. Shield guards an existing mark rather than placing a protected mark. Portal cannot move a protected mark and does not carry a shield. Ice protects and anchors an enemy mark rather than creating extra friendly placements or disabling line detection. This makes it useful against enemy Portal Shift but requires judgment because it also prevents your own Fire Blast. Crystal is always temporary. No released power grants an extra turn or silently changes rules.

## Effect timing and atomic resolution

The global `turnNumber` increments after each action. Ice activated at turn N stores `frozenUntil = N + 4`: it persists through the enemy turns N + 1 and N + 3 and expires as turn N + 4 begins. Crystal stores `lockedUntil = N + 2`: it persists through enemy turn N + 1 and expires before the activating player's next turn. This represents owner-turn boundaries deterministically because turns strictly alternate. Effects reset at round boundaries, including timeout boundaries.

Resolution order is authentication/membership in the server adapter; engine phase and revision validation; turn/time, power, energy and target validation; clone the state; charge elapsed time; apply one action and any one-hit shield reaction; check simultaneous lines/full-board/action cap; then advance the turn, expire effects and set the next deadline. The released timed effects do not change ownership on expiry, so win evaluation before their cleanup has the same ownership result as evaluation afterward. History records accepted actions with revision and server timestamp. Invalid actions never append history.

## Classic and AI

Classic uses the same authoritative alternating-turn and deadline rules with ordinary placement only. The server configures Classic as a single round for online, private and AI matches. It evaluates all eight lines and a full-board draw. Elemental matches use the three-round shell described above.

AI has seven levels: Beginner uses mostly random legal choices; Easy mixes random choices with one-action tactics; Medium targets two-action search with occasional mistakes; Hard targets three elemental actions; Expert, Extreme and Nightmare target progressively deeper adversarial search, move ordering, alpha-beta pruning, memoization and bounded node/thinking-time budgets. Iterative deepening returns the strongest fully completed depth, preventing an incomplete early branch from biasing the final choice. Elemental simulations use the same legal power transitions and durations as multiplayer. This is practical bounded search, not a claim of a solved elemental ruleset. Hard and higher classic AI use complete-board minimax and cannot lose under ordinary classic rules. AI actions carry the current revision and never receive ranked cups or impersonate human opponents.

## Engine API

The browser/Socket.IO adapter imports ESM from `src/lib/game-engine/index.js`. The module has no database, browser, network or timer side effects.

- `createGame({ mode: 'elemental' | 'classic', players: [{ id, name, loadout }], turnSeconds: 20, now, rounds: 3 })` creates a JSON-serializable state.
- `applyAction(state, playerId, action, now)` returns a new state or throws `Error` with a stable `.code`. Actions are `{ type: 'place', cell, revision }`, `{ type: 'power', powerId, cell?, from?, to?, revision }` or `{ type: 'surrender', revision }`. Cell indices are 0–8 in row-major order. Cell-targeted powers also accept `target` as an alias of `cell`.
- `tick(state, now)` returns the original reference until a timeout, then a new resolved state. Finished states remain unchanged.
- `legalActions(state, playerId)` returns legal main actions, each with the current revision. It excludes surrender so AI never randomly forfeits.
- `chooseAIAction(state, difficulty, { rng?, depth?, maxNodes?, maxTimeMs? })` returns one legal action or null when no action is possible. Tests may set `maxTimeMs: Infinity` for a deterministic node budget.
- `detectOutcome(board)` returns deterministic line/full-board results and is used by the engine and tests.
- `POWER_CATALOG`, `RANKED_POWER_IDS`, `DEFAULT_LOADOUT`, `WIN_LINES` and `RULESET` provide the shared presentation and validation data.

Run `node --test tests/engine.test.js` for engine validation, including an exhaustive tree of every human continuation against Nightmare classic AI as either side.
