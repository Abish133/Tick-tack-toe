import { POWER_CATALOG, RANKED_POWER_IDS, DEFAULT_LOADOUT, POWER_BY_ID } from './powers.js';
export { POWER_CATALOG, RANKED_POWER_IDS, DEFAULT_LOADOUT };

export const WIN_LINES = Object.freeze([[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]]);
export const RULESET = Object.freeze({ id: 'ranked-elemental-v2', turnSeconds: 20, maxTurnSeconds: 30, matchBankMs: 120000, maxEnergy: 6, initialEnergy: 3, maxRoundActions: 30, equippedPowers: 3, rounds: 3 });

function fail(code, message) { const error = new Error(message); error.code = code; throw error; }
const copy = value => structuredClone(value);
const emptyEffect = () => ({ shield: false, frozenUntil: 0, locked: false, lockedUntil: 0, terrain: null, terrainOwner: null, mirrorUntil: 0, rootUntil: 0, poisonUntil: 0, poisonOwner: null, phantomOwner: null, phantomUntil: 0 });
const emptyEffects = () => Array.from({ length: 9 }, emptyEffect);
const validCell = cell => Number.isInteger(cell) && cell >= 0 && cell < 9;
const opponentOf = (state, id) => state.players.find(player => player.id !== id).id;
const frozen = (state, cell) => (state.effects[cell]?.frozenUntil || 0) > state.turnNumber;
const locked = (state, cell) => Boolean(state.effects[cell]?.locked);
const mirrored = (state, cell) => (state.effects[cell]?.mirrorUntil || 0) > state.turnNumber;
const rooted = (state, cell) => (state.effects[cell]?.rootUntil || 0) > state.turnNumber;
const anchored = (state, cell) => frozen(state, cell) || rooted(state, cell) || state.effects[cell]?.shield || mirrored(state, cell);
const deadlineFor = (state, id, now) => now + Math.min(state.turnSeconds * 1000, state.remainingMs[id]);
const valuesFor = (players, value) => Object.fromEntries(players.map(player => [player.id, typeof value === 'function' ? value() : value]));
function assertCell(cell) { if (!validCell(cell)) fail('INVALID_TARGET', 'Choose a cell from 0 to 8.'); }
function assertEmpty(state, cell) {
  assertCell(cell);
  if (state.board[cell] != null) fail('CELL_OCCUPIED', 'The destination must be empty.');
  if (locked(state, cell)) fail('CELL_LOCKED', 'The destination is temporarily locked.');
}
function assertMovable(state, cell) {
  if (frozen(state, cell)) fail('CELL_FROZEN', 'A frozen mark cannot move.');
  if (rooted(state, cell)) fail('CELL_ROOTED', 'A rooted mark cannot move.');
  if (state.effects[cell]?.shield || mirrored(state, cell)) fail('CELL_PROTECTED', 'A protected mark cannot move.');
}
function normalizeExtraState(state) {
  state.effects = state.effects.map(effect => ({ ...emptyEffect(), ...effect }));
  state.markOrigins ??= Array(9).fill(null);
  state.restorationCharges ??= valuesFor(state.players, () => []);
  state.matchUses ??= valuesFor(state.players, () => ({}));
  for (const player of state.players) {
    state.restorationCharges[player.id] ??= [];
    state.matchUses[player.id] ??= {};
    for (const id of RANKED_POWER_IDS) state.uses[player.id][id] ??= 0;
  }
  state.turnClockStartedAt ??= state.turnStartedAt;
}

export function createGame({ mode = 'elemental', players, turnSeconds = 20, now = Date.now(), rounds = 3, maxRoundActions = 30 } = {}) {
  if (!['classic', 'elemental'].includes(mode)) fail('INVALID_MODE', 'Choose classic or elemental rules.');
  if (!Array.isArray(players) || players.length !== 2 || players.some(player => !player || typeof player.id !== 'string' || !player.id.trim()) || players[0].id === players[1].id) fail('INVALID_PLAYERS', 'Exactly two different players are required.');
  if (!Number.isFinite(now) || !Number.isFinite(turnSeconds) || turnSeconds < 15 || turnSeconds > 30) fail('INVALID_CLOCK', 'Turn clocks must be between 15 and 30 seconds.');
  if (!Number.isInteger(rounds) || rounds < 1 || rounds > 5 || rounds % 2 !== 1) fail('INVALID_ROUNDS', 'Use an odd round count of one, three, or five.');
  if (!Number.isInteger(maxRoundActions) || maxRoundActions < 9 || maxRoundActions > 60) fail('INVALID_ACTION_CAP', 'The round action cap must be between 9 and 60.');
  const assignedPlayers = players.map((player, index) => {
    if (mode !== 'classic' && player.loadout != null && !Array.isArray(player.loadout)) fail('INVALID_LOADOUT', 'Equip exactly three different powers.');
    const loadout = mode === 'classic' ? [] : [...(player.loadout ?? DEFAULT_LOADOUT)];
    if (mode !== 'classic' && (loadout.length !== 3 || new Set(loadout).size !== 3 || loadout.some(id => !RANKED_POWER_IDS.includes(id)))) fail('INVALID_LOADOUT', 'Equip exactly three different powers.');
    return { id: player.id, name: String(player.name ?? `Player ${index + 1}`).slice(0, 40), mark: index === 0 ? 'X' : 'O', loadout };
  });
  return {
    version: 1, ruleset: mode === 'classic' ? 'classic-v1' : RULESET.id, revision: 0, mode, status: 'active',
    players: assignedPlayers, board: Array(9).fill(null), effects: emptyEffects(), markOrigins: Array(9).fill(null), currentPlayerId: assignedPlayers[0].id,
    round: 1, maxRounds: rounds, roundWins: valuesFor(assignedPlayers, 0), roundHistory: [], turnNumber: 1, roundTurns: 0,
    energy: valuesFor(assignedPlayers, mode === 'classic' ? 0 : RULESET.initialEnergy),
    uses: valuesFor(assignedPlayers, () => Object.fromEntries(RANKED_POWER_IDS.map(id => [id, 0]))), matchUses: valuesFor(assignedPlayers, () => ({})),
    restorationCharges: valuesFor(assignedPlayers, () => []), powerUses: valuesFor(assignedPlayers, 0),
    remainingMs: valuesFor(assignedPlayers, RULESET.matchBankMs), turnSeconds, maxRoundActions, turnStartedAt: now, turnClockStartedAt: now, turnDeadline: now + turnSeconds * 1000,
    matchWinnerId: null, finishReason: null, winningLines: [], history: [], lastEvent: { type: 'match-started', at: now },
  };
}

/** Phantom marks live in effects, so they can never enter this real-mark check. */
export function detectOutcome(board) {
  const winningLines = WIN_LINES.filter(line => board[line[0]] != null && line.every(cell => board[cell] === board[line[0]]));
  const winners = [...new Set(winningLines.map(line => board[line[0]]))];
  if (winners.length > 1) return { ended: true, winnerId: null, reason: 'simultaneous-lines', winningLines };
  if (winners.length === 1) return { ended: true, winnerId: winners[0], reason: 'line', winningLines };
  if (board.every(cell => cell != null)) return { ended: true, winnerId: null, reason: 'board-full', winningLines: [] };
  return { ended: false, winnerId: null, reason: null, winningLines: [] };
}

function finishMatch(state, winnerId, reason, now) {
  state.status = 'finished'; state.matchWinnerId = winnerId; state.finishReason = reason; state.turnDeadline = null;
  state.lastEvent = { ...state.lastEvent, type: 'match-finished', winnerId, reason, at: now };
  return state;
}
function endRound(state, winnerId, reason, winningLines, now) {
  if (winnerId) state.roundWins[winnerId] += 1;
  const result = { round: state.round, winnerId, reason, winningLines: copy(winningLines), board: [...state.board], effects: copy(state.effects), actions: state.roundTurns, endedAt: now };
  state.roundHistory.push(result); state.winningLines = copy(winningLines);
  state.lastEvent = { ...state.lastEvent, type: 'round-ended', result, at: now };
  const needed = Math.floor(state.maxRounds / 2) + 1;
  if (Object.values(state.roundWins).some(wins => wins >= needed) || state.round >= state.maxRounds) {
    const [one, two] = state.players.map(player => player.id);
    const matchWinner = state.roundWins[one] === state.roundWins[two] ? null : state.roundWins[one] > state.roundWins[two] ? one : two;
    return finishMatch(state, matchWinner, 'rounds-complete', now);
  }
  state.round += 1; state.board = Array(9).fill(null); state.effects = emptyEffects(); state.markOrigins = Array(9).fill(null); state.roundTurns = 0; state.turnNumber += 1;
  state.currentPlayerId = state.players[(state.round - 1) % 2].id;
  for (const player of state.players) {
    state.energy[player.id] = state.mode === 'classic' ? 0 : RULESET.initialEnergy;
    state.uses[player.id] = Object.fromEntries(RANKED_POWER_IDS.map(id => [id, 0]));
    state.restorationCharges[player.id] = [];
  }
  state.turnStartedAt = now; state.turnClockStartedAt = now; state.turnDeadline = deadlineFor(state, state.currentPlayerId, now);
  return state;
}
function chargeClock(state, actor, now) {
  state.remainingMs[actor] = Math.max(0, state.remainingMs[actor] - Math.max(0, now - state.turnStartedAt));
}
function clearTerrain(effect) {
  effect.locked = false; effect.lockedUntil = 0; effect.terrain = null; effect.terrainOwner = null;
}
function setTerrain(state, cell, kind, actor, duration) {
  state.effects[cell] = { ...emptyEffect(), locked: true, lockedUntil: state.turnNumber + duration, terrain: kind, terrainOwner: actor };
}
function destroyMark(state, cell, destroyed) {
  const owner = state.board[cell]; if (owner == null) return;
  const loss = { id: `${state.round}:${state.revision}:${cell}`, cell, playerId: owner, origin: copy(state.markOrigins[cell] ?? null) };
  state.restorationCharges[owner].push(loss); destroyed.push(loss);
  state.board[cell] = null; state.markOrigins[cell] = null; state.effects[cell] = emptyEffect();
}
function destructiveHit(state, cell, actor, event, reflectable = true, terrain = null) {
  if (state.effects[cell].shield) { state.effects[cell].shield = false; event.shieldBroken = true; event.shieldCells.push(cell); return; }
  if (reflectable && mirrored(state, cell)) {
    state.effects[cell].mirrorUntil = 0;
    const reflectedCell = state.board.findIndex((owner, index) => owner === actor && !frozen(state, index) && !state.effects[index].shield && !mirrored(state, index));
    event.reflected = true; event.reflectionCell = reflectedCell >= 0 ? reflectedCell : null;
    // Select a genuinely eligible target once; never invoke this function recursively.
    if (reflectedCell >= 0) { destroyMark(state, reflectedCell, event.destroyed); if (terrain) setTerrain(state, reflectedCell, terrain.kind, opponentOf(state, actor), terrain.duration); }
    return;
  }
  destroyMark(state, cell, event.destroyed);
  if (terrain) setTerrain(state, cell, terrain.kind, actor, terrain.duration);
}
function canPurify(state, cell, actor) {
  const effect = state.effects[cell];
  return effect.poisonUntil > state.turnNumber || frozen(state, cell) || locked(state, cell) || effect.phantomUntil > state.turnNumber || (rooted(state, cell) && state.board[cell] !== actor);
}
function echoSource(state, actor) {
  const placement = state.history.findLast(event => event.playerId === actor && event.round === state.round && event.action?.type === 'place');
  if (!placement) return null;
  const charges = state.restorationCharges?.[actor] ?? [];
  const chargeIndex = charges.findIndex(charge => charge.origin?.placementRevision === placement.revision);
  return chargeIndex >= 0 ? { cell: placement.action.cell, chargeIndex, placement } : null;
}
function lineCells(axis, index) {
  return axis === 'row' ? [index * 3, index * 3 + 1, index * 3 + 2] : [index, index + 3, index + 6];
}
function dragonTarget(state, actor, axis, index) {
  return lineCells(axis, index).find(cell => state.board[cell] === opponentOf(state, actor) && !frozen(state, cell));
}
const DIRECTION_OFFSETS = Object.freeze({ up: [-1, 0], down: [1, 0], left: [0, -1], right: [0, 1] });
function gravityPlan(state, direction) {
  const [dr, dc] = DIRECTION_OFFSETS[direction]; const board = [...state.board]; const moves = [];
  const order = Array.from({ length: 9 }, (_, cell) => cell).sort((a, b) => ((Math.floor(b / 3) * dr + (b % 3) * dc) - (Math.floor(a / 3) * dr + (a % 3) * dc)) || a - b);
  for (const from of order) {
    if (board[from] == null || anchored(state, from)) continue;
    const row = Math.floor(from / 3) + dr; const col = from % 3 + dc; if (row < 0 || row > 2 || col < 0 || col > 2) continue;
    const to = row * 3 + col;
    if (board[to] != null || locked(state, to)) continue;
    board[to] = board[from]; board[from] = null; moves.push({ from, to });
  }
  return moves;
}
function expireEffects(state, event) {
  for (let cell = 0; cell < 9; cell += 1) {
    const effect = state.effects[cell];
    for (const key of ['frozenUntil', 'rootUntil', 'mirrorUntil']) if (effect[key] && effect[key] <= state.turnNumber) { effect[key] = 0; event.expired.push({ cell, effect: key }); }
    if (effect.locked && effect.lockedUntil <= state.turnNumber) { event.expired.push({ cell, effect: effect.terrain || 'crystal' }); clearTerrain(effect); }
    if (effect.phantomUntil && effect.phantomUntil <= state.turnNumber) { effect.phantomUntil = 0; effect.phantomOwner = null; event.expired.push({ cell, effect: 'phantom' }); }
    if (effect.poisonUntil && effect.poisonUntil <= state.turnNumber) {
      effect.poisonUntil = 0; effect.poisonOwner = null; event.expired.push({ cell, effect: 'poison' });
      if (state.board[cell] != null && !frozen(state, cell)) {
        if (effect.shield) { effect.shield = false; event.shieldBroken = true; event.shieldCells.push(cell); }
        else destroyMark(state, cell, event.destroyed);
      }
    }
  }
  // Temporary terrain must not force an incoming player to time out with no main action.
  if (state.board.some(cell => cell == null) && !hasAnyMainAction(state, state.currentPlayerId)) {
    for (const effect of state.effects) clearTerrain(effect);
    event.restrictionsExpiredEarly = true;
  }
}

function validateAction(state, playerId, action, now, checkClock = true) {
  if (!state || state.version !== 1) fail('INVALID_STATE', 'Unsupported game state.');
  if (!state.players.some(player => player.id === playerId)) fail('NOT_PARTICIPANT', 'You are not a participant.');
  if (state.status !== 'active') fail('MATCH_FINISHED', 'This match has finished.');
  if (!action || !Number.isInteger(action.revision) || action.revision !== state.revision) fail('STALE_REVISION', 'Request a current state before acting.');
  if (!Number.isFinite(now) || now < state.turnStartedAt) fail('INVALID_TIME', 'The action time is invalid.');
  if (action.type === 'surrender') return;
  if (state.currentPlayerId !== playerId) fail('NOT_YOUR_TURN', 'Wait for your turn.');
  if (checkClock && now >= state.turnDeadline) fail('TURN_EXPIRED', 'The turn has expired.');
  if (action.type === 'place') { assertEmpty(state, action.cell); return; }
  if (action.type !== 'power') fail('INVALID_ACTION', 'Use a placement, power, or surrender action.');
  if (state.mode === 'classic') fail('POWERS_DISABLED', 'Classic matches do not use powers.');
  const power = POWER_BY_ID[action.powerId];
  if (!power?.implemented || !power.enabled) fail('POWER_UNAVAILABLE', 'Choose an available power.');
  if (!state.players.find(player => player.id === playerId).loadout.includes(power.id)) fail('POWER_NOT_EQUIPPED', 'That power is not in your loadout.');
  if ((state.uses[playerId][power.id] || 0) >= power.maxUsesPerRound) fail('POWER_USED', 'That power is available once per round.');
  if (power.maxUsesPerMatch && (state.matchUses?.[playerId]?.[power.id] || 0) >= power.maxUsesPerMatch) fail('POWER_MATCH_LIMIT', 'That ultimate has already been used this match.');
  if (state.energy[playerId] < power.cost) fail('INSUFFICIENT_ENERGY', 'You need more energy.');
  if (power.minimumRoundActions && state.roundTurns < power.minimumRoundActions) fail('POWER_OPENING_RESTRICTED', 'Eclipse is available after four main actions in this round.');
  if (power.id === 'surge') { if (state.energy[playerId] >= RULESET.maxEnergy) fail('ENERGY_FULL', 'Energy is already full.'); return; }
  if (power.id === 'time') {
    const start = state.turnClockStartedAt ?? state.turnStartedAt;
    if (state.turnDeadline >= start + RULESET.maxTurnSeconds * 1000) fail('CLOCK_FULL', 'This turn is already at the 30-second maximum.');
    return;
  }
  if (power.id === 'echo') {
    const source = echoSource(state, playerId); if (!source) fail('NO_ECHO', 'Your most recent placement needs its own destroyed-mark charge.');
    assertEmpty(state, source.cell); return;
  }
  if (power.id === 'gravity') {
    if (!Object.hasOwn(DIRECTION_OFFSETS, action.direction)) fail('INVALID_DIRECTION', 'Choose up, down, left or right.');
    if (!gravityPlan(state, action.direction).length) fail('NO_MOVEMENT', 'No mark can slide in that direction.');
    return;
  }
  if (power.id === 'dragon') {
    if (!['row', 'column'].includes(action.axis) || !Number.isInteger(action.index) || action.index < 0 || action.index > 2) fail('INVALID_LINE', 'Choose a row or column from 0 to 2.');
    if (dragonTarget(state, playerId, action.axis, action.index) == null) fail('INVALID_TARGET', 'That line has no unfrozen enemy mark.');
    return;
  }
  if (['portal', 'wind', 'shadow', 'tide'].includes(power.id)) {
    assertCell(action.from); assertCell(action.to);
    if (action.from === action.to) fail('INVALID_TARGET', 'Choose two different cells.');
    if (power.id === 'tide') {
      if (state.board[action.from] != null || !locked(state, action.from) || state.effects[action.from].terrainOwner !== opponentOf(state, playerId)) fail('INVALID_TARGET', 'Redirect an enemy-created empty terrain restriction.');
      assertEmpty(state, action.to); return;
    }
    if (state.board[action.from] !== playerId) fail('INVALID_TARGET', 'Choose one of your marks first.');
    assertMovable(state, action.from);
    if (power.id === 'shadow') {
      if (state.board[action.to] !== opponentOf(state, playerId)) fail('INVALID_TARGET', 'Swap with an enemy mark.');
      assertMovable(state, action.to);
    } else {
      assertEmpty(state, action.to);
      if (power.id === 'wind' && (Math.abs(Math.floor(action.from / 3) - Math.floor(action.to / 3)) !== 1 || Math.abs(action.from % 3 - action.to % 3) !== 1)) fail('INVALID_TARGET', 'Wind Step moves exactly one square diagonally.');
    }
    return;
  }
  const cell = action.cell ?? action.target; assertCell(cell);
  if (['crystal', 'phantom', 'bloom'].includes(power.id)) {
    assertEmpty(state, cell);
    if (power.id === 'phantom' && state.effects[cell].phantomUntil > state.turnNumber) fail('CELL_ILLUSION', 'That cell already has an illusion.');
    if (power.id === 'bloom' && !(state.restorationCharges?.[playerId]?.length)) fail('NO_RESTORATION_CHARGE', 'A real friendly mark must be destroyed before restoring one.');
  } else if (['shield', 'mirror', 'root'].includes(power.id)) {
    if (state.board[cell] !== playerId) fail('INVALID_TARGET', 'Protect one of your existing marks.');
    if (power.id === 'shield' && state.effects[cell].shield) fail('CELL_PROTECTED', 'That mark already has a shield.');
    if (power.id === 'mirror' && mirrored(state, cell)) fail('CELL_PROTECTED', 'That mark already reflects attacks.');
    if (power.id === 'root' && rooted(state, cell)) fail('CELL_ROOTED', 'That mark is already rooted.');
  } else if (power.id === 'purify') {
    if (!canPurify(state, cell, playerId)) fail('NO_DEBUFF', 'Choose a cell with a removable negative effect.');
  } else {
    if (state.board[cell] !== opponentOf(state, playerId)) fail('INVALID_TARGET', 'Choose an enemy mark.');
    if (frozen(state, cell)) fail('CELL_FROZEN', 'That enemy mark is already frozen.');
    if (power.id === 'poison' && state.effects[cell].poisonUntil > state.turnNumber) fail('CELL_CURSED', 'That mark is already cursed.');
  }
}

function candidateActions(state, playerId) {
  const revision = state.revision;
  const actions = state.board.flatMap((owner, cell) => owner == null ? [{ type: 'place', cell, revision }] : []);
  if (state.mode !== 'classic') for (const powerId of state.players.find(player => player.id === playerId)?.loadout ?? []) {
    const base = { type: 'power', powerId, revision };
    if (['surge', 'time', 'echo'].includes(powerId)) actions.push(base);
    else if (['portal', 'wind', 'shadow', 'tide'].includes(powerId)) {
      for (let from = 0; from < 9; from += 1) {
        if (powerId === 'tide' ? state.board[from] != null || !locked(state, from) : state.board[from] !== playerId) continue;
        for (let to = 0; to < 9; to += 1) {
          if (powerId === 'shadow' ? state.board[to] !== opponentOf(state, playerId) : state.board[to] != null) continue;
          actions.push({ ...base, from, to });
        }
      }
    } else if (powerId === 'gravity') for (const direction of Object.keys(DIRECTION_OFFSETS)) actions.push({ ...base, direction });
    else if (powerId === 'dragon') for (const axis of ['row', 'column']) for (let index = 0; index < 3; index += 1) actions.push({ ...base, axis, index });
    else for (let cell = 0; cell < 9; cell += 1) actions.push({ ...base, cell });
  }
  return actions;
}
function hasAnyMainAction(state, playerId) {
  return candidateActions(state, playerId).some(action => {
    if (action.type === 'power' && POWER_BY_ID[action.powerId]?.consumesTurn === false) return false;
    try { validateAction(state, playerId, action, state.turnStartedAt, false); return true; } catch { return false; }
  });
}
/** The same exhaustive validated action list drives AI, practice and client targeting. */
export function legalActions(state, playerId = state.currentPlayerId) {
  if (state.status !== 'active' || state.currentPlayerId !== playerId) return [];
  return candidateActions(state, playerId).filter(action => { try { validateAction(state, playerId, action, state.turnStartedAt, false); return true; } catch { return false; } });
}
function moveMark(state, from, to) {
  state.board[to] = state.board[from]; state.markOrigins[to] = state.markOrigins[from]; state.effects[to] = state.effects[from];
  state.board[from] = null; state.markOrigins[from] = null; state.effects[from] = emptyEffect();
}
function restoreMark(state, actor, cell, index = 0) {
  const [charge] = state.restorationCharges[actor].splice(index, 1);
  state.board[cell] = actor; state.effects[cell] = emptyEffect(); state.markOrigins[cell] = copy(charge.origin);
  return charge.id;
}

/** Pure immutable transition. Invalid input never changes state, revision or clock. */
export function applyAction(state, playerId, action, now = Date.now()) {
  validateAction(state, playerId, action, now);
  const next = copy(state); normalizeExtraState(next); next.revision += 1;
  if (action.type === 'surrender') {
    if (state.currentPlayerId === playerId) chargeClock(next, playerId, now);
    next.history.push({ playerId, action: copy(action), at: now, round: state.round, revision: next.revision });
    next.lastEvent = { type: 'surrender', playerId, at: now };
    return finishMatch(next, opponentOf(state, playerId), 'surrender', now);
  }
  chargeClock(next, playerId, now);
  const event = { ...copy(action), type: action.type, playerId, action: copy(action), shieldBroken: false, shieldCells: [], destroyed: [], expired: [], movements: [], at: now };
  let consumesTurn = true;
  if (action.type === 'place') {
    next.board[action.cell] = playerId; next.effects[action.cell] = emptyEffect();
    next.markOrigins[action.cell] = { playerId, placementRevision: next.revision, cell: action.cell };
    if (next.mode !== 'classic') next.energy[playerId] = Math.min(RULESET.maxEnergy, next.energy[playerId] + 1);
  } else {
    const power = POWER_BY_ID[action.powerId]; const cell = action.cell ?? action.target;
    next.energy[playerId] -= power.cost; next.uses[playerId][power.id] += 1; next.powerUses[playerId] += 1;
    next.matchUses[playerId][power.id] = (next.matchUses[playerId][power.id] || 0) + 1;
    consumesTurn = power.consumesTurn;
    if (['fire', 'lightning', 'meteor', 'eclipse'].includes(power.id)) {
      const terrain = power.id === 'fire' ? null : { kind: { lightning: 'electricity', meteor: 'scorched', eclipse: 'darkness' }[power.id], duration: power.id === 'meteor' ? 4 : 2 };
      destructiveHit(next, cell, playerId, event, true, terrain);
    } else if (power.id === 'shield') next.effects[cell].shield = true;
    else if (['portal', 'wind'].includes(power.id)) { moveMark(next, action.from, action.to); event.movements.push({ from: action.from, to: action.to }); }
    else if (power.id === 'ice') next.effects[cell].frozenUntil = state.turnNumber + 4;
    else if (power.id === 'crystal') setTerrain(next, cell, 'crystal', playerId, 2);
    else if (power.id === 'surge') next.energy[playerId] = Math.min(RULESET.maxEnergy, next.energy[playerId] + 3);
    else if (power.id === 'time') {
      next.remainingMs[playerId] = Math.min(RULESET.matchBankMs, next.remainingMs[playerId] + 8000);
      next.turnStartedAt = now;
      next.turnDeadline = Math.min(state.turnDeadline + 8000, next.turnClockStartedAt + RULESET.maxTurnSeconds * 1000, now + next.remainingMs[playerId]);
      event.addedTimeMs = next.turnDeadline - state.turnDeadline;
    } else if (power.id === 'shadow') {
      [next.board[action.from], next.board[action.to]] = [next.board[action.to], next.board[action.from]];
      [next.effects[action.from], next.effects[action.to]] = [next.effects[action.to], next.effects[action.from]];
      [next.markOrigins[action.from], next.markOrigins[action.to]] = [next.markOrigins[action.to], next.markOrigins[action.from]];
      event.movements.push({ from: action.from, to: action.to }, { from: action.to, to: action.from });
    } else if (power.id === 'bloom') event.restoredCharge = restoreMark(next, playerId, cell);
    else if (power.id === 'mirror') next.effects[cell].mirrorUntil = state.turnNumber + 5;
    else if (power.id === 'phantom') { next.effects[cell].phantomOwner = playerId; next.effects[cell].phantomUntil = state.turnNumber + 2; }
    else if (power.id === 'gravity') {
      for (const move of gravityPlan(next, action.direction)) { moveMark(next, move.from, move.to); event.movements.push(move); }
    } else if (power.id === 'poison') {
      next.effects[cell].poisonUntil = state.turnNumber + 2; next.effects[cell].poisonOwner = playerId;
      event.warning = { cell, playerId: next.board[cell], message: 'This mark will be destroyed after your next action unless cleansed or protected.' };
    } else if (power.id === 'purify') {
      const effect = next.effects[cell]; clearTerrain(effect); effect.frozenUntil = 0; effect.poisonUntil = 0; effect.poisonOwner = null; effect.phantomOwner = null; effect.phantomUntil = 0;
      if (next.board[cell] !== playerId) effect.rootUntil = 0;
    } else if (power.id === 'dragon') {
      const target = dragonTarget(next, playerId, action.axis, action.index); event.resolvedCell = target;
      destructiveHit(next, target, playerId, event, false);
    } else if (power.id === 'tide') {
      const kind = next.effects[action.from].terrain || 'crystal'; clearTerrain(next.effects[action.from]);
      setTerrain(next, action.to, kind, playerId, 2); event.movements.push({ from: action.from, to: action.to, terrain: kind });
    } else if (power.id === 'root') next.effects[cell].rootUntil = state.turnNumber + 5;
    else if (power.id === 'echo') {
      const source = echoSource(next, playerId); event.resolvedCell = source.cell; event.restoredCharge = restoreMark(next, playerId, source.cell, source.chargeIndex);
    }
  }
  if (consumesTurn) {
    next.roundTurns += 1; next.turnNumber += 1; next.currentPlayerId = opponentOf(next, playerId); next.turnStartedAt = now; next.turnClockStartedAt = now;
    expireEffects(next, event);
  }
  next.lastEvent = event;
  next.history.push({ ...copy(event), round: state.round, turnNumber: state.turnNumber, revision: next.revision });
  const outcome = detectOutcome(next.board);
  if (outcome.ended) return endRound(next, outcome.winnerId, outcome.reason, outcome.winningLines, now);
  if (next.roundTurns >= next.maxRoundActions) return endRound(next, null, 'action-limit', [], now);
  if (consumesTurn) next.turnDeadline = deadlineFor(next, next.currentPlayerId, now);
  return next;
}

/** Timeout transition is idempotent; the server supplies its own timestamp. */
export function tick(state, now = Date.now()) {
  if (state.status !== 'active' || !Number.isFinite(now) || now < state.turnDeadline) return state;
  const next = copy(state); normalizeExtraState(next); next.revision += 1;
  const loserId = state.currentPlayerId;
  chargeClock(next, loserId, state.turnDeadline);
  const bankExpired = next.remainingMs[loserId] <= 0;
  next.lastEvent = { type: 'timeout', playerId: loserId, at: state.turnDeadline };
  next.history.push({ ...next.lastEvent, round: state.round, revision: next.revision });
  if (bankExpired) return finishMatch(next, opponentOf(state, loserId), 'match-clock-expired', now);
  return endRound(next, opponentOf(state, loserId), 'turn-timeout', [], now);
}

const AI_LEVELS = ['beginner', 'easy', 'medium', 'hard', 'expert', 'extreme', 'nightmare'];
function evaluatePosition(state, rootId) {
  const other = opponentOf(state, rootId); let score = 0;
  for (const line of WIN_LINES) {
    const own = line.filter(cell => state.board[cell] === rootId).length;
    const enemy = line.filter(cell => state.board[cell] === other).length;
    if (!enemy) score += [0, 3, 28, 10000][own];
    if (!own) score -= [0, 3, 32, 10000][enemy];
  }
  state.board.forEach((owner, cell) => {
    if (owner == null) return;
    const effect = state.effects[cell];
    const protection = (effect.shield ? 4 : 0) + (mirrored(state, cell) ? 3 : 0) + (frozen(state, cell) ? 2 : 0);
    const curse = effect.poisonUntil > state.turnNumber && !effect.shield ? 8 : 0;
    score += (owner === rootId ? 1 : -1) * ((cell === 4 ? 4 : cell % 2 === 0 ? 2 : 1) + protection - curse);
  });
  if (state.mode !== 'classic') {
    score += (state.energy[rootId] - state.energy[other]) * 0.45;
    score += ((state.restorationCharges?.[rootId]?.length || 0) - (state.restorationCharges?.[other]?.length || 0)) * 0.2;
  }
  return score;
}

function classicBestAction(state, actions) {
  const rootId = state.currentPlayerId; const other = opponentOf(state, rootId); const cache = new Map();
  function solve(board, actor) {
    const outcome = detectOutcome(board);
    if (outcome.ended) return outcome.winnerId === rootId ? 100 + board.filter(cell => cell == null).length : outcome.winnerId === other ? -100 - board.filter(cell => cell == null).length : 0;
    const key = board.map(cell => cell === rootId ? 'X' : cell === other ? 'O' : '.').join('') + actor;
    if (cache.has(key)) return cache.get(key);
    let value = actor === rootId ? -Infinity : Infinity;
    for (let cell = 0; cell < 9; cell += 1) if (board[cell] == null) {
      const next = [...board]; next[cell] = actor;
      const result = solve(next, actor === rootId ? other : rootId);
      value = actor === rootId ? Math.max(value, result) : Math.min(value, result);
    }
    cache.set(key, value); return value;
  }
  return actions.reduce((best, action) => {
    const board = [...state.board]; board[action.cell] = rootId;
    const value = solve(board, other);
    return value > best.value ? { action, value } : best;
  }, { action: actions[0], value: -Infinity }).action;
}

/** Seven actual strategies. High levels search legal power transitions, not marks alone. */
export function chooseAIAction(state, difficulty = 'medium', config = {}) {
  const actions = legalActions(state); if (!actions.length) return null;
  const level = Number.isInteger(difficulty) ? Math.max(0, Math.min(6, difficulty - 1)) : Math.max(0, AI_LEVELS.indexOf(String(difficulty).toLowerCase()));
  const rng = config.rng ?? Math.random; const mistakeRate = [0.92, 0.55, 0.14, 0, 0, 0, 0][level];
  if (rng() < mistakeRate) return actions[Math.min(actions.length - 1, Math.floor(Math.max(0, rng()) * actions.length))];
  if (state.mode === 'classic' && level >= 3) return classicBestAction(state, actions);
  const rootId = state.currentPlayerId; const baseRounds = state.roundHistory.length;
  const depthLimit = config.depth ?? [1, 1, 2, 3, 4, 5, 6][level];
  const nodeLimit = config.maxNodes ?? [30, 90, 300, 700, 1400, 2600, 4500][level];
  const maxTimeMs = config.maxTimeMs ?? [15, 25, 50, 90, 140, 200, 300][level];
  const searchStartedAt = performance.now(); const budgetExceeded = Symbol('search-budget');
  let nodes = 0; const cache = new Map();
  function terminalValue(position, depth) {
    if (position.roundHistory.length > baseRounds) {
      const result = position.roundHistory[baseRounds];
      return result.winnerId == null ? 0 : result.winnerId === rootId ? 100000 + depth : -100000 - depth;
    }
    if (position.status === 'finished') return position.matchWinnerId == null ? 0 : position.matchWinnerId === rootId ? 100000 + depth : -100000 - depth;
    return null;
  }
  function simulation(position, action) { return applyAction(position, position.currentPlayerId, action, position.turnStartedAt); }
  function ordered(position, limit = Infinity) {
    const maximize = position.currentPlayerId === rootId;
    return legalActions(position).map(action => { const child = simulation(position, action); return { action, child, score: terminalValue(child, 0) ?? evaluatePosition(child, rootId) }; }).sort((a, b) => maximize ? b.score - a.score : a.score - b.score).slice(0, limit);
  }
  function search(position, depth, alpha, beta) {
    const terminal = terminalValue(position, depth); if (terminal != null) return terminal;
    if (depth <= 0) return evaluatePosition(position, rootId);
    if (nodes >= nodeLimit || performance.now() - searchStartedAt >= maxTimeMs) throw budgetExceeded;
    nodes += 1;
    const key = JSON.stringify([depth, position.board, position.currentPlayerId, position.energy, position.uses, position.matchUses, position.effects, position.markOrigins, position.restorationCharges, position.roundTurns, position.turnNumber, position.remainingMs, position.turnDeadline - position.turnStartedAt, echoSource(position, rootId)?.placement.revision, echoSource(position, opponentOf(position, rootId))?.placement.revision]);
    if (cache.has(key)) return cache.get(key);
    const maximize = position.currentPlayerId === rootId; let value = maximize ? -Infinity : Infinity; let cutoff = false;
    const candidates = ordered(position, level >= 4 ? 14 : 10);
    if (!candidates.length) return 0;
    for (const { child } of candidates) {
      const result = search(child, depth - 1, alpha, beta);
      value = maximize ? Math.max(value, result) : Math.min(value, result);
      if (maximize) alpha = Math.max(alpha, value); else beta = Math.min(beta, value);
      if (alpha >= beta) { cutoff = true; break; }
    }
    if (!cutoff && nodes < nodeLimit) cache.set(key, value);
    return value;
  }
  const rootCandidates = ordered(state);
  let best = rootCandidates[0].action;
  // Only publish a fully completed depth. A late expensive branch cannot make
  // later root actions appear better merely because they received less search.
  for (let depth = 1; depth <= depthLimit; depth += 1) {
    let iterationBest = best; let iterationScore = -Infinity;
    cache.clear();
    try {
      for (const { action, child } of rootCandidates) {
        const score = search(child, depth - 1, -Infinity, Infinity);
        if (score > iterationScore) { iterationBest = action; iterationScore = score; }
      }
      best = iterationBest;
      if (iterationScore >= 100000) break;
    } catch (error) {
      if (error !== budgetExceeded) throw error;
      break;
    }
  }
  return best;
}
