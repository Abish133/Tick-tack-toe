import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, applyAction, tick, legalActions, chooseAIAction, detectOutcome, WIN_LINES, POWER_CATALOG, RANKED_POWER_IDS, DEFAULT_LOADOUT } from '../src/lib/game-engine/index.js';

const players = (a = DEFAULT_LOADOUT, b = DEFAULT_LOADOUT) => [{ id: 'a', name: 'A', loadout: [...a] }, { id: 'b', name: 'B', loadout: [...b] }];
const game = (options = {}) => createGame({ players: players(), now: 1000, ...options });
const act = (state, action, time = state.turnStartedAt + 1) => applyAction(state, state.currentPlayerId, { ...action, revision: state.revision }, time);
const place = (state, cell) => act(state, { type: 'place', cell });
const power = (state, powerId, fields = {}) => act(state, { type: 'power', powerId, ...fields });
const fixture = (options = {}) => {
  const state = game(options);
  state.board = ['a', 'b', null, null, null, null, null, null, null];
  return state;
};
const expectCode = (fn, code) => assert.throws(fn, error => error.code === code);

test('catalog has 22 distinct concepts with only the six released powers equipable', () => {
  assert.equal(POWER_CATALOG.length, 22);
  assert.equal(new Set(POWER_CATALOG.map(item => item.id)).size, 22);
  assert.deepEqual(RANKED_POWER_IDS, ['fire', 'shield', 'portal', 'ice', 'crystal', 'surge']);
  expectCode(() => game({ players: players(['fire', 'fire', 'portal']) }), 'INVALID_LOADOUT');
  expectCode(() => game({ players: players(['fire', 'portal']) }), 'INVALID_LOADOUT');
  expectCode(() => game({ players: players(['fire', 'portal', 'eclipse']) }), 'INVALID_LOADOUT');
});

test('all eight classic lines and an ordinary full-board draw resolve', () => {
  for (const line of WIN_LINES) {
    const board = Array(9).fill(null); for (const cell of line) board[cell] = 'a';
    assert.equal(detectOutcome(board).winnerId, 'a');
    assert.deepEqual(detectOutcome(board).winningLines, [line]);
  }
  assert.equal(detectOutcome(['a', 'b', 'a', 'a', 'b', 'b', 'b', 'a', 'a']).reason, 'board-full');
});

test('simultaneous winning owners draw deterministically regardless of line ordering', () => {
  const outcome = detectOutcome(['a', 'a', 'a', 'b', 'b', 'b', null, null, null]);
  assert.equal(outcome.winnerId, null); assert.equal(outcome.reason, 'simultaneous-lines'); assert.equal(outcome.winningLines.length, 2);
});

test('invalid actions never mutate state, references, revisions, history, or deadlines', () => {
  const state = place(game(), 4); const before = structuredClone(state); const boardRef = state.board;
  expectCode(() => applyAction(state, 'a', { type: 'place', cell: 0, revision: state.revision }, 1500), 'NOT_YOUR_TURN');
  expectCode(() => applyAction(state, 'b', { type: 'place', cell: 4, revision: state.revision }, 1500), 'CELL_OCCUPIED');
  expectCode(() => applyAction(state, 'b', { type: 'place', cell: 2 }, 1500), 'STALE_REVISION');
  expectCode(() => applyAction(state, 'b', { type: 'place', cell: 2, revision: 0 }, 1500), 'STALE_REVISION');
  expectCode(() => applyAction(state, 'spectator', { type: 'place', cell: 2, revision: state.revision }, 1500), 'NOT_PARTICIPANT');
  expectCode(() => applyAction(state, 'b', { type: 'place', cell: 2, revision: state.revision }, state.turnDeadline), 'TURN_EXPIRED');
  assert.deepEqual(state, before); assert.equal(state.board, boardRef);
});

test('legal actions include current revision and exclude out-of-turn actions and locked cells', () => {
  let state = game({ players: players(['crystal', 'shield', 'portal']) });
  state = power(state, 'crystal', { cell: 4 });
  assert.deepEqual(legalActions(state, 'a'), []);
  assert(legalActions(state).every(action => action.revision === state.revision));
  assert(!legalActions(state).some(action => action.type === 'place' && action.cell === 4));
});

test('placements grant one energy capped at six; powers cannot chain and have one use per round', () => {
  let state = fixture(); state.energy.a = 6;
  state = place(state, 4); assert.equal(state.energy.a, 6);
  state = power(state, 'fire', { cell: 0 }); assert.equal(state.energy.b, 1); assert.equal(state.board[0], null);
  state = place(state, 0);
  expectCode(() => power(state, 'fire', { cell: 0 }), 'POWER_USED');
  assert.equal(state.uses.b.fire, 1); assert.equal(state.powerUses.b, 1);
  assert.equal(state.history.length, 3);
});

test('fire destroys enemy marks and clears their effects', () => {
  const state = fixture(); const next = power(state, 'fire', { cell: 1 });
  assert.equal(next.board[1], null); assert.equal(next.energy.a, 1); assert.equal(state.board[1], 'b');
  assert.equal(next.currentPlayerId, 'b');
});

test('shield protects an existing friendly mark and absorbs exactly one fire blast', () => {
  let state = fixture(); state = power(state, 'shield', { cell: 0 });
  assert.equal(state.board[0], 'a'); assert.equal(state.effects[0].shield, true); assert.equal(state.energy.a, 2);
  state = power(state, 'fire', { cell: 0 });
  assert.equal(state.board[0], 'a'); assert.equal(state.effects[0].shield, false); assert.equal(state.lastEvent.shieldBroken, true);
  const empty = game(); expectCode(() => power(empty, 'shield', { cell: 0 }), 'INVALID_TARGET');
});

test('portal can win by moving an eligible mark and rejects protected/frozen sources', () => {
  let state = fixture({ rounds: 1 }); state.board = ['a', 'a', null, null, null, null, null, null, 'a'];
  state = power(state, 'portal', { from: 8, to: 2 });
  assert.equal(state.status, 'finished'); assert.equal(state.matchWinnerId, 'a'); assert.equal(state.board[8], null); assert.equal(state.board[2], 'a');
  const shielded = fixture(); shielded.effects[0].shield = true;
  expectCode(() => power(shielded, 'portal', { from: 0, to: 4 }), 'CELL_PROTECTED');
  const iced = fixture(); iced.effects[0].frozenUntil = 5;
  expectCode(() => power(iced, 'portal', { from: 0, to: 4 }), 'CELL_FROZEN');
});

test('ice anchors an enemy through exactly two completed owner turns, preserving ownership', () => {
  let state = fixture({ players: players(['ice', 'fire', 'shield'], ['portal', 'fire', 'shield']) });
  state = power(state, 'ice', { cell: 1 });
  assert.equal(state.effects[1].frozenUntil, 5); assert.equal(state.board[1], 'b');
  expectCode(() => power(state, 'portal', { from: 1, to: 8 }), 'CELL_FROZEN');
  state = place(state, 4); assert.equal(state.effects[1].frozenUntil, 5);
  expectCode(() => power(state, 'fire', { cell: 1 }), 'CELL_FROZEN');
  state = place(state, 8); assert.equal(state.effects[1].frozenUntil, 5);
  state = place(state, 6); assert.equal(state.effects[1].frozenUntil, 0);
  assert.equal(state.board[1], 'b');
});

test('frozen marks still form winning lines', () => {
  const board = ['b', 'b', 'b', null, null, null, null, null, null];
  assert.equal(detectOutcome(board).winnerId, 'b');
});

test('crystal is temporary, blocks both players, expires after one opponent action', () => {
  let state = game({ players: players(['crystal', 'fire', 'shield']) });
  state = power(state, 'crystal', { cell: 4 });
  assert.equal(state.effects[4].locked, true);
  expectCode(() => place(state, 4), 'CELL_LOCKED');
  state = place(state, 0); assert.equal(state.effects[4].locked, false);
  state = place(state, 4); assert.equal(state.board[4], 'a');
});

test('crystal cannot deadlock the incoming player when no other main action is available', () => {
  const state = game({ players: players(['crystal', 'shield', 'portal']) });
  state.board = ['a', 'b', 'a', 'a', 'b', 'b', 'b', 'a', null];
  for (const id of ['fire', 'shield', 'portal']) state.uses.b[id] = 1;
  const next = power(state, 'crystal', { cell: 8 });
  assert.equal(next.effects[8].locked, false); assert.equal(next.lastEvent.restrictionsExpiredEarly, true);
  assert(legalActions(next).some(action => action.type === 'place' && action.cell === 8));
});

test('surge consumes a full action, grants at most three energy, and cannot be wasted at maximum', () => {
  let state = game({ players: players(['surge', 'fire', 'portal']) });
  state.energy.a = 5; state = power(state, 'surge');
  assert.equal(state.energy.a, 6); assert.equal(state.currentPlayerId, 'b'); assert.equal(state.uses.a.surge, 1);
  const full = game({ players: players(['surge', 'fire', 'portal']) }); full.energy.a = 6;
  expectCode(() => power(full, 'surge'), 'ENERGY_FULL');
});

test('classic mode has no powers and does not gain energy', () => {
  let state = game({ mode: 'classic' }); assert.deepEqual(state.players[0].loadout, []);
  state = place(state, 4); assert.equal(state.energy.a, 0);
  expectCode(() => power(state, 'fire', { cell: 4 }), 'POWERS_DISABLED');
});

test('rounds alternate starters and reset powers, energy and effects; two wins finish best of three', () => {
  let state = fixture(); state.board = ['a', 'a', null, 'b', null, null, null, null, null];
  state.uses.a.fire = 1; state.energy.a = 0; state.effects[0].shield = true;
  state = place(state, 2);
  assert.equal(state.round, 2); assert.equal(state.currentPlayerId, 'b'); assert.equal(state.roundWins.a, 1);
  assert.equal(state.energy.a, 3); assert.equal(state.uses.a.fire, 0); assert(state.effects.every(effect => !effect.shield));
  state.board = ['b', 'b', null, 'a', 'a', null, null, null, null]; state.currentPlayerId = 'a';
  state = place(state, 5);
  assert.equal(state.status, 'finished'); assert.equal(state.matchWinnerId, 'a'); assert.equal(state.roundHistory.length, 2);
});

test('round draws count toward three-round maximum and tied scores draw the match', () => {
  let state = game({ mode: 'classic' });
  for (let round = 0; round < 3; round += 1) {
    state.board = ['a', 'b', 'a', 'a', 'b', 'b', 'b', 'a', null]; state.currentPlayerId = 'a';
    state = place(state, 8);
  }
  assert.equal(state.status, 'finished'); assert.equal(state.matchWinnerId, null); assert.equal(state.roundHistory.length, 3);
});

test('turn timeout loses one round, is immutable, and late ticks charge only deadline time', () => {
  const state = game(); const early = tick(state, state.turnDeadline - 1); assert.equal(early, state);
  const next = tick(state, state.turnDeadline + 10000);
  assert.equal(next.round, 2); assert.equal(next.roundWins.b, 1); assert.equal(next.remainingMs.a, 100000);
  assert.equal(state.round, 1); assert.equal(next.revision, 1); assert.equal(next.currentPlayerId, 'b');
  assert.equal(tick(next, next.turnDeadline - 1), next);
});

test('match bank exhaustion loses the entire match and surrender can occur out of turn', () => {
  const state = game(); state.remainingMs.a = 5000; state.turnDeadline = state.turnStartedAt + 5000;
  const timed = tick(state, state.turnDeadline);
  assert.equal(timed.status, 'finished'); assert.equal(timed.matchWinnerId, 'b'); assert.equal(timed.finishReason, 'match-clock-expired');
  const surrendered = applyAction(game(), 'b', { type: 'surrender', revision: 0 }, 1001);
  assert.equal(surrendered.matchWinnerId, 'a'); assert.equal(surrendered.finishReason, 'surrender');
  expectCode(() => applyAction(surrendered, 'a', { type: 'place', cell: 0, revision: 1 }, 1002), 'MATCH_FINISHED');
});

test('maximum action cap ends a round instead of permitting power loops', () => {
  const state = fixture({ maxRoundActions: 9 }); state.roundTurns = 8;
  const next = power(state, 'shield', { cell: 0 });
  assert.equal(next.round, 2); assert.equal(next.roundHistory[0].reason, 'action-limit');
});

test('every AI level returns a legal action and advanced search uses fire against a double threat', () => {
  const levels = ['beginner', 'easy', 'medium', 'hard', 'expert', 'extreme', 'nightmare'];
  const state = fixture({ players: players(['ice', 'crystal', 'surge']), rounds: 1 });
  for (const level of levels) {
    const action = chooseAIAction(state, level, { rng: () => 0.99, maxNodes: 200 });
    assert(legalActions(state).some(candidate => JSON.stringify(candidate) === JSON.stringify(action)));
    assert.doesNotThrow(() => applyAction(state, state.currentPlayerId, action, state.turnStartedAt));
  }
  const tactical = fixture({ rounds: 1, players: players(DEFAULT_LOADOUT, ['shield', 'portal', 'surge']) });
  // The opponent threatens both 0-1-2 and 0-3-6. One placement cannot defend
  // both lines. Destroying their shared mark at 0 is the unique safe defense.
  tactical.board = ['b', 'b', null, 'b', 'a', null, null, null, null];
  const action = chooseAIAction(tactical, 'nightmare', { maxNodes: 500, maxTimeMs: Infinity });
  assert.equal(action.type, 'power'); assert.equal(action.powerId, 'fire'); assert.equal(action.cell, 0);
  const next = applyAction(tactical, 'a', action, tactical.turnStartedAt);
  for (const reply of legalActions(next)) {
    const result = applyAction(next, 'b', reply, next.turnStartedAt);
    assert.notEqual(result.matchWinnerId, 'b');
  }
});

test('nightmare classic AI cannot lose against any legal human continuation as X or O', () => {
  for (const aiId of ['a', 'b']) {
    const start = game({ mode: 'classic', rounds: 1 }); let leaves = 0;
    function explore(state) {
      if (state.status === 'finished') { assert.notEqual(state.matchWinnerId, aiId === 'a' ? 'b' : 'a'); leaves += 1; return; }
      if (state.currentPlayerId === aiId) explore(applyAction(state, aiId, chooseAIAction(state, 'nightmare', { rng: () => 0.99 }), state.turnStartedAt));
      else for (const action of legalActions(state)) explore(applyAction(state, state.currentPlayerId, action, state.turnStartedAt));
    }
    explore(start); assert(leaves > 0);
  }
});
