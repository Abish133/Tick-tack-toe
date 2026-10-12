import { POWER_CATALOG, RANKED_POWER_IDS, DEFAULT_LOADOUT, POWER_BY_ID } from './powers.js';
export { POWER_CATALOG, RANKED_POWER_IDS, DEFAULT_LOADOUT };

export const WIN_LINES = Object.freeze([[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]]);
export const RULESET = Object.freeze({ id: 'ranked-elemental-v1', turnSeconds: 20, matchBankMs: 120000, maxEnergy: 6, initialEnergy: 3, maxRoundActions: 30, equippedPowers: 3, rounds: 3 });

function fail(code, message) { const error = new Error(message); error.code = code; throw error; }
const copy = value => structuredClone(value);
const emptyEffects = () => Array.from({ length: 9 }, () => ({ shield: false, frozenUntil: 0, locked: false, lockedUntil: 0 }));
const validCell = cell => Number.isInteger(cell) && cell >= 0 && cell < 9;
const opponentOf = (state, id) => state.players.find(player => player.id !== id).id;
const frozen = (state, cell) => (state.effects[cell]?.frozenUntil || 0) > state.turnNumber;
const locked = (state, cell) => Boolean(state.effects[cell]?.locked);
const deadlineFor = (state, id, now) => now + Math.min(state.turnSeconds * 1000, state.remainingMs[id]);
function assertCell(cell) { if (!validCell(cell)) fail('INVALID_TARGET', 'Choose a cell from 0 to 8.'); }

export function createGame({ mode = 'elemental', players, turnSeconds = 20, now = Date.now(), rounds = 3, maxRoundActions = 30 } = {}) {
  if (!['classic', 'elemental'].includes(mode)) fail('INVALID_MODE', 'Choose classic or elemental rules.');
  if (!Array.isArray(players) || players.length !== 2 || players.some(player => !player || typeof player.id !== 'string' || !player.id.trim()) || players[0].id === players[1].id) fail('INVALID_PLAYERS', 'Exactly two different players are required.');
  if (!Number.isFinite(now) || !Number.isFinite(turnSeconds) || turnSeconds < 15 || turnSeconds > 30) fail('INVALID_CLOCK', 'Turn clocks must be between 15 and 30 seconds.');
  if (!Number.isInteger(rounds) || rounds < 1 || rounds > 5 || rounds % 2 !== 1) fail('INVALID_ROUNDS', 'Use an odd round count of one, three, or five.');
  if (!Number.isInteger(maxRoundActions) || maxRoundActions < 9 || maxRoundActions > 60) fail('INVALID_ACTION_CAP', 'The round action cap must be between 9 and 60.');
  const assignedPlayers = players.map((player, index) => {
    if (mode !== 'classic' && player.loadout != null && !Array.isArray(player.loadout)) fail('INVALID_LOADOUT', 'Equip exactly three different released powers.');
    const loadout = mode === 'classic' ? [] : [...(player.loadout ?? DEFAULT_LOADOUT)];
    if (mode !== 'classic' && (loadout.length !== 3 || new Set(loadout).size !== 3 || loadout.some(id => !RANKED_POWER_IDS.includes(id)))) fail('INVALID_LOADOUT', 'Equip exactly three different released powers.');
    return { id: player.id, name: String(player.name ?? `Player ${index + 1}`).slice(0, 40), mark: index === 0 ? 'X' : 'O', loadout };
  });
  const values = value => Object.fromEntries(assignedPlayers.map(player => [player.id, value]));
  const state = {
    version: 1, ruleset: mode === 'classic' ? 'classic-v1' : RULESET.id, revision: 0, mode, status: 'active',
    players: assignedPlayers, board: Array(9).fill(null), effects: emptyEffects(), currentPlayerId: assignedPlayers[0].id,
    round: 1, maxRounds: rounds, roundWins: values(0), roundHistory: [], turnNumber: 1, roundTurns: 0,
    energy: values(mode === 'classic' ? 0 : RULESET.initialEnergy), uses: Object.fromEntries(assignedPlayers.map(player => [player.id, Object.fromEntries(RANKED_POWER_IDS.map(id => [id, 0]))])), powerUses: values(0),
    remainingMs: values(RULESET.matchBankMs), turnSeconds, maxRoundActions, turnStartedAt: now, turnDeadline: now + turnSeconds * 1000,
    matchWinnerId: null, finishReason: null, winningLines: [], history: [], lastEvent: { type: 'match-started', at: now },
  };
  return state;
}

/** Both players are checked atomically. Multiple owners with lines means a draw. */
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
  state.round += 1; state.board = Array(9).fill(null); state.effects = emptyEffects(); state.roundTurns = 0; state.turnNumber += 1;
  state.currentPlayerId = state.players[(state.round - 1) % 2].id;
  for (const player of state.players) {
    state.energy[player.id] = state.mode === 'classic' ? 0 : RULESET.initialEnergy;
    state.uses[player.id] = Object.fromEntries(RANKED_POWER_IDS.map(id => [id, 0]));
  }
  state.turnStartedAt = now; state.turnDeadline = deadlineFor(state, state.currentPlayerId, now);
  return state;
}

function chargeClock(state, actor, now) {
  state.remainingMs[actor] = Math.max(0, state.remainingMs[actor] - Math.max(0, now - state.turnStartedAt));
}

function expireEffects(state) {
  for (let index = 0; index < 9; index += 1) {
    const effect = state.effects[index];
    if (effect.frozenUntil && effect.frozenUntil <= state.turnNumber) effect.frozenUntil = 0;
    if (effect.locked && effect.lockedUntil <= state.turnNumber) { effect.locked = false; effect.lockedUntil = 0; }
  }
  // A temporary lock may never leave the incoming player without a legal action.
  const incoming = state.currentPlayerId;
  if (state.board.some(cell => cell == null) && !hasAnyMainAction(state, incoming)) {
    for (const effect of state.effects) { effect.locked = false; effect.lockedUntil = 0; }
    state.lastEvent.restrictionsExpiredEarly = true;
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
  if (action.type === 'place') {
    assertCell(action.cell);
    if (state.board[action.cell] != null) fail('CELL_OCCUPIED', 'That cell already contains a mark.');
    if (locked(state, action.cell)) fail('CELL_LOCKED', 'That cell is temporarily locked.');
    return;
  }
  if (action.type !== 'power') fail('INVALID_ACTION', 'Use a placement, power, or surrender action.');
  if (state.mode === 'classic') fail('POWERS_DISABLED', 'Classic matches do not use powers.');
  const power = POWER_BY_ID[action.powerId];
  if (!power?.implemented) fail('POWER_UNAVAILABLE', 'That power has not been released.');
  if (!state.players.find(player => player.id === playerId).loadout.includes(power.id)) fail('POWER_NOT_EQUIPPED', 'That power is not in your loadout.');
  if ((state.uses[playerId][power.id] || 0) >= 1) fail('POWER_USED', 'That power is available once per round.');
  if (state.energy[playerId] < power.cost) fail('INSUFFICIENT_ENERGY', 'You need more energy.');
  if (power.id === 'surge') { if (state.energy[playerId] >= RULESET.maxEnergy) fail('ENERGY_FULL', 'Energy is already full.'); return; }
  if (power.id === 'portal') {
    assertCell(action.from); assertCell(action.to);
    if (state.board[action.from] !== playerId) fail('INVALID_TARGET', 'Move one of your marks.');
    if (frozen(state, action.from)) fail('CELL_FROZEN', 'A frozen mark cannot move.');
    if (state.effects[action.from].shield) fail('CELL_PROTECTED', 'A protected mark cannot move.');
    if (state.board[action.to] != null) fail('CELL_OCCUPIED', 'The destination must be empty.');
    if (locked(state, action.to)) fail('CELL_LOCKED', 'The destination is locked.');
    return;
  }
  const cell = action.cell ?? action.target; assertCell(cell);
  if (power.id === 'crystal') {
    if (state.board[cell] != null) fail('CELL_OCCUPIED', 'Only an empty cell can be locked.');
    if (locked(state, cell)) fail('CELL_LOCKED', 'That cell is already locked.');
  } else if (power.id === 'shield') {
    if (state.board[cell] !== playerId) fail('INVALID_TARGET', 'Protect one of your existing marks.');
    if (state.effects[cell].shield) fail('CELL_PROTECTED', 'That mark already has a shield.');
  } else {
    if (state.board[cell] !== opponentOf(state, playerId)) fail('INVALID_TARGET', 'Choose an enemy mark.');
    if (frozen(state, cell)) fail('CELL_FROZEN', 'That enemy mark is already frozen.');
  }
}

function candidateActions(state, playerId) {
  const revision = state.revision;
  const actions = state.board.flatMap((owner, cell) => owner == null ? [{ type: 'place', cell, revision }] : []);
  if (state.mode !== 'classic') {
    for (const powerId of state.players.find(player => player.id === playerId)?.loadout ?? []) {
      if (powerId === 'surge') actions.push({ type: 'power', powerId, revision });
      else if (powerId === 'portal') {
        state.board.forEach((owner, from) => { if (owner === playerId) state.board.forEach((destination, to) => { if (destination == null) actions.push({ type: 'power', powerId, from, to, revision }); }); });
      } else for (let cell = 0; cell < 9; cell += 1) actions.push({ type: 'power', powerId, cell, revision });
    }
  }
  return actions;
}

function hasAnyMainAction(state, playerId) {
  return candidateActions(state, playerId).some(action => { try { validateAction(state, playerId, action, state.turnStartedAt, false); return true; } catch { return false; } });
}

/** Legal main actions; surrender is intentionally excluded from AI choices. */
export function legalActions(state, playerId = state.currentPlayerId) {
  if (state.status !== 'active' || state.currentPlayerId !== playerId) return [];
  return candidateActions(state, playerId).filter(action => { try { validateAction(state, playerId, action, state.turnStartedAt, false); return true; } catch { return false; } });
}

/** Pure immutable transition. Invalid input throws Error.code without changing state. */
export function applyAction(state, playerId, action, now = Date.now()) {
  validateAction(state, playerId, action, now);
  const next = copy(state); next.revision += 1;
  if (action.type === 'surrender') {
    if (state.currentPlayerId === playerId) chargeClock(next, playerId, now);
    next.history.push({ playerId, action: copy(action), at: now, round: state.round, revision: next.revision });
    next.lastEvent = { type: 'surrender', playerId, at: now };
    return finishMatch(next, opponentOf(state, playerId), 'surrender', now);
  }
  chargeClock(next, playerId, now);
  let shieldBroken = false;
  if (action.type === 'place') {
    next.board[action.cell] = playerId;
    if (next.mode !== 'classic') next.energy[playerId] = Math.min(RULESET.maxEnergy, next.energy[playerId] + 1);
  } else {
    const power = POWER_BY_ID[action.powerId]; const cell = action.cell ?? action.target;
    next.energy[playerId] -= power.cost; next.uses[playerId][power.id] += 1; next.powerUses[playerId] += 1;
    if (power.id === 'fire') {
      if (next.effects[cell].shield) { next.effects[cell].shield = false; shieldBroken = true; }
      else { next.board[cell] = null; next.effects[cell] = emptyEffects()[0]; }
    } else if (power.id === 'shield') next.effects[cell].shield = true;
    else if (power.id === 'portal') { next.board[action.from] = null; next.effects[action.from] = emptyEffects()[0]; next.board[action.to] = playerId; }
    else if (power.id === 'ice') next.effects[cell].frozenUntil = state.turnNumber + 4;
    else if (power.id === 'crystal') { next.effects[cell].locked = true; next.effects[cell].lockedUntil = state.turnNumber + 2; }
    else if (power.id === 'surge') next.energy[playerId] = Math.min(RULESET.maxEnergy, next.energy[playerId] + 3);
  }
  next.roundTurns += 1;
  next.lastEvent = { ...copy(action), type: action.type, playerId, action: copy(action), shieldBroken, at: now };
  next.history.push({ ...next.lastEvent, round: state.round, turnNumber: state.turnNumber, revision: next.revision });
  const outcome = detectOutcome(next.board);
  if (outcome.ended) return endRound(next, outcome.winnerId, outcome.reason, outcome.winningLines, now);
  if (next.roundTurns >= next.maxRoundActions) return endRound(next, null, 'action-limit', [], now);
  next.turnNumber += 1; next.currentPlayerId = opponentOf(next, playerId); next.turnStartedAt = now;
  expireEffects(next);
  next.turnDeadline = deadlineFor(next, next.currentPlayerId, now);
  return next;
}

/** Timeout transition is idempotent; the server supplies its own timestamp. */
export function tick(state, now = Date.now()) {
  if (state.status !== 'active' || !Number.isFinite(now) || now < state.turnDeadline) return state;
  const next = copy(state); next.revision += 1;
  const loserId = state.currentPlayerId;
  // Charge only until the authoritative deadline, even if a timer runs late.
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
  state.board.forEach((owner, cell) => { if (owner != null) score += (owner === rootId ? 1 : -1) * ((cell === 4 ? 4 : cell % 2 === 0 ? 2 : 1) + (state.effects[cell].shield ? 4 : 0)); });
  if (state.mode !== 'classic') score += (state.energy[rootId] - state.energy[other]) * 0.45;
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
    const key = `${depth}:${position.board.map(owner => owner ?? '.').join(',')}:${position.currentPlayerId}:${JSON.stringify(position.energy)}:${JSON.stringify(position.uses)}:${JSON.stringify(position.effects)}:${position.roundTurns}`;
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
