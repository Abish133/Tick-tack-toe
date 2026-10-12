import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, applyAction, legalActions, chooseAIAction, RANKED_POWER_IDS, POWER_CATALOG } from '../src/lib/game-engine/index.js';

const loadout = (...ids) => [...new Set([...ids, ...RANKED_POWER_IDS])].slice(0, 3);
const game = (own, enemy = ['fire', 'shield', 'purify'], options = {}) => createGame({ now: 1000, rounds: 1, ...options, players: [{ id: 'a', loadout: loadout(...own) }, { id: 'b', loadout: loadout(...enemy) }] });
const act = (state, action, now = state.turnStartedAt + 1) => applyAction(state, state.currentPlayerId, { ...action, revision: state.revision }, now);
const place = (state, cell) => act(state, { type: 'place', cell });
const power = (state, powerId, fields = {}) => act(state, { type: 'power', powerId, ...fields });
const fixture = (own, enemy, options) => { const state = game(own, enemy, options); state.board[0] = 'a'; state.board[4] = 'b'; state.energy.a = 6; return state; };
const expectCode = (fn, code) => assert.throws(fn, error => error.code === code);

test('Lightning destroys a real mark, grants a loss charge, and restricts one opponent action', () => {
  let state = fixture(['lightning']); state = power(state, 'lightning', { cell: 4 });
  assert.equal(state.board[4], null); assert.equal(state.effects[4].terrain, 'electricity'); assert.equal(state.restorationCharges.b.length, 1);
  expectCode(() => place(state, 4), 'CELL_LOCKED');
  state = place(state, 1); assert.equal(state.effects[4].locked, false);
  state = place(state, 4); assert.equal(state.board[4], 'a');
});

test('A shield absorbs Lightning or Meteor without creating terrain or a restoration charge', () => {
  for (const id of ['lightning', 'meteor']) {
    const state = fixture([id]); state.effects[4].shield = true;
    const next = power(state, id, { cell: 4 });
    assert.equal(next.board[4], 'b'); assert.equal(next.effects[4].locked, false);
    assert.equal(next.effects[4].shield, false); assert.deepEqual(next.restorationCharges.b, []);
    assert.deepEqual(next.lastEvent.shieldCells, [4]);
  }
});

test('Meteor scorch remains through two opponent actions and then expires', () => {
  let state = fixture(['meteor']); state = power(state, 'meteor', { cell: 4 });
  assert.equal(state.effects[4].lockedUntil, 5); assert.equal(state.effects[4].terrain, 'scorched');
  state = place(state, 1); assert.equal(state.effects[4].locked, true);
  state = place(state, 8); assert.equal(state.effects[4].locked, true);
  state = place(state, 3); assert.equal(state.effects[4].locked, false);
});

test('Time Warp is one auxiliary action with an absolute 30-second cap and bounded thinking bank', () => {
  const initial = game(['time'], undefined, { turnSeconds: 25 });
  const state = act(initial, { type: 'power', powerId: 'time' }, 6000);
  assert.equal(state.turnDeadline, 31000); assert.equal(state.lastEvent.addedTimeMs, 5000);
  assert.equal(state.remainingMs.a, 120000); assert.equal(state.currentPlayerId, 'a'); assert.equal(state.turnNumber, 1); assert.equal(state.roundTurns, 0);
  assert.equal(state.revision, 1); assert.equal(state.energy.a, 2); assert.equal(state.uses.a.time, 1);
  expectCode(() => power(state, 'time'), 'POWER_USED');
  const after = place(state, 4); assert.equal(after.currentPlayerId, 'b'); assert.equal(after.roundTurns, 1);
  const full = game(['time'], undefined, { turnSeconds: 30 }); expectCode(() => power(full, 'time'), 'CLOCK_FULL');
});

test('Time Warp cannot be submitted after expiry, manufacture bank beyond120s or reset its absolute cap', () => {
  const initial = game(['time']); initial.remainingMs.a = 5000; initial.turnDeadline = 6000;
  expectCode(() => act(initial, { type: 'power', powerId: 'time' }, 6000), 'TURN_EXPIRED');
  const next = act(initial, { type: 'power', powerId: 'time' }, 5000);
  assert.equal(next.remainingMs.a, 9000); assert.equal(next.turnDeadline, 14000); assert.equal(next.turnClockStartedAt, 1000);
  assert.equal(next.turnStartedAt, 5000); assert.equal(initial.remainingMs.a, 5000);
});

test('Shadow atomically swaps opposite owners and detects simultaneous lines as a draw', () => {
  const state = game(['shadow']); state.energy.a = 6;
  state.board = ['a', 'a', 'b', 'b', 'b', 'a', null, null, null];
  const next = power(state, 'shadow', { from: 5, to: 2 });
  assert.equal(next.status, 'finished'); assert.equal(next.matchWinnerId, null); assert.equal(next.roundHistory[0].reason, 'simultaneous-lines');
  assert.deepEqual(next.board.slice(0, 6), ['a', 'a', 'a', 'b', 'b', 'b']);
});

test('Shadow, Wind and Gravity respect frozen, shielded, mirrored and rooted anchors', () => {
  for (const effect of [{ frozenUntil: 10 }, { shield: true }, { mirrorUntil: 10 }, { rootUntil: 10 }]) {
    const state = fixture(['shadow', 'wind', 'gravity']); state.effects[0] = { ...state.effects[0], ...effect };
    assert(!legalActions(state).some(action => action.powerId === 'shadow' || action.powerId === 'wind' && action.from === 0));
    const next = power(state, 'gravity', { direction: 'right' }); assert.equal(next.board[0], 'a');
  }
});

test('Healing cannot fabricate a mark and consumes one actual destroyed-mark charge', () => {
  let state = game(['bloom']); state = place(state, 0); state = power(state, 'fire', { cell: 0 });
  assert.equal(state.restorationCharges.a.length, 1); assert.equal(state.restorationCharges.a[0].origin.placementRevision, 1);
  state = power(state, 'bloom', { cell: 8 }); assert.equal(state.board[8], 'a'); assert.equal(state.restorationCharges.a.length, 0);
  expectCode(() => power(game(['bloom']), 'bloom', { cell: 4 }), 'NO_RESTORATION_CHARGE');
});

test('Bloom and Echo share authentic restoration inventory rather than each cloning a lost symbol', () => {
  let state = game(['bloom', 'echo']); state = place(state, 0); state = power(state, 'fire', { cell: 0 });
  state = power(state, 'bloom', { cell: 8 }); state = place(state, 4);
  expectCode(() => power(state, 'echo'), 'NO_ECHO'); assert.equal(state.board.filter(owner => owner === 'a').length, 1);
});

test('Mirror reflects to the first eligible attacking mark and never recurses into another mirror', () => {
  const state = fixture(['fire']); state.board[1] = 'a'; state.board[2] = 'a';
  state.effects[0].shield = true; state.effects[1].mirrorUntil = 10; state.effects[4].mirrorUntil = 10;
  const next = power(state, 'fire', { cell: 4 });
  assert.equal(next.board[4], 'b'); assert.equal(next.effects[4].mirrorUntil, 0);
  assert.equal(next.board[2], null); assert.equal(next.board[1], 'a'); assert.equal(next.effects[1].mirrorUntil, 10);
  assert.equal(next.lastEvent.reflected, true); assert.equal(next.lastEvent.reflectionCell, 2);
  assert.equal(next.restorationCharges.a.length, 1); assert.equal(next.restorationCharges.b.length, 0);
});

test('Mirror with no eligible reflection target blocks without destroying an anchored attacker', () => {
  const state = fixture(['meteor']); state.effects[0].frozenUntil = 10; state.effects[4].mirrorUntil = 10;
  const next = power(state, 'meteor', { cell: 4 });
  assert.equal(next.lastEvent.reflectionCell, null); assert.equal(next.board[0], 'a'); assert.equal(next.board[4], 'b');
  assert(!next.effects.some(effect => effect.locked)); assert.equal(next.restorationCharges.a.length, 0);
});

test('Shield resolves before Mirror so absorbing a blast preserves the reflective defense', () => {
  const state = fixture(['fire']); state.effects[4].shield = true; state.effects[4].mirrorUntil = 10;
  const next = power(state, 'fire', { cell: 4 }); assert.equal(next.effects[4].shield, false);
  assert.equal(next.effects[4].mirrorUntil, 10); assert.equal(next.lastEvent.reflected, undefined);
});

test('Mirror is temporary through exactly two subsequent completed owner turns', () => {
  let state = fixture(['mirror']); state = power(state, 'mirror', { cell: 0 });
  state = place(state, 1); state = place(state, 8); assert.equal(state.effects[0].mirrorUntil, 6);
  state = place(state, 3); assert.equal(state.effects[0].mirrorUntil, 6);
  state = place(state, 2); assert.equal(state.effects[0].mirrorUntil, 0);
});

test('Phantom never forms a winning line, never blocks a real move and grants no loss charge', () => {
  const state = game(['phantom']); state.board = ['a', 'a', null, null, 'b', null, null, null, null];
  let next = power(state, 'phantom', { cell: 2 });
  assert.equal(next.status, 'active'); assert.equal(next.board[2], null); assert.equal(next.effects[2].phantomOwner, 'a');
  assert(legalActions(next).some(action => action.type === 'place' && action.cell === 2));
  next = place(next, 2); assert.equal(next.board[2], 'b'); assert.equal(next.effects[2].phantomOwner, null);
  assert.equal(next.restorationCharges.a.length, 0);
});

test('Phantom expires after one opponent action even when no one occupies its cell', () => {
  let state = game(['phantom']); state = power(state, 'phantom', { cell: 4 }); state = place(state, 0);
  assert.equal(state.effects[4].phantomOwner, null); assert.equal(state.effects[4].phantomUntil, 0);
});

test('Gravity slides a leading-edge chain exactly one cell in a stable order', () => {
  const state = game(['gravity']); state.board = ['a', 'b', null, null, null, null, null, null, null];
  const next = power(state, 'gravity', { direction: 'right' });
  assert.deepEqual(next.board.slice(0, 3), [null, 'a', 'b']);
  assert.deepEqual(next.lastEvent.movements, [{ from: 1, to: 2 }, { from: 0, to: 1 }]);
  assert.equal(state.board[0], 'a');
});

test('Gravity cannot wrap around edges or enter restricted terrain, and rejects a null slide', () => {
  const state = game(['gravity']); state.board[2] = 'a'; state.board[4] = 'b'; state.effects[5].locked = true; state.effects[5].lockedUntil = 10;
  expectCode(() => power(state, 'gravity', { direction: 'right' }), 'NO_MOVEMENT');
  expectCode(() => power(state, 'gravity', { direction: 'northwest' }), 'INVALID_DIRECTION');
  assert.equal(state.board[2], 'a'); assert.equal(state.board[3], null);
});

test('Poison announces an owner warning, destroys after one owner action and resolves before lines', () => {
  const state = game(['poison']); state.board = ['b', 'b', null, null, null, null, null, null, 'a'];
  let next = power(state, 'poison', { cell: 0 }); assert.equal(next.board[0], 'b');
  assert.equal(next.lastEvent.warning.playerId, 'b'); assert.equal(next.effects[0].poisonUntil, 3);
  next = place(next, 2); assert.equal(next.status, 'active'); assert.equal(next.board[0], null); assert.equal(next.restorationCharges.b.length, 1);
  assert(next.lastEvent.expired.some(expiry => expiry.effect === 'poison' && expiry.cell === 0));
});

test('A warned player can counter Poison with Shield or Purify during its action window', () => {
  for (const counter of ['shield', 'purify']) {
    let state = fixture(['poison'], [counter]); state = power(state, 'poison', { cell: 4 }); state = power(state, counter, { cell: 4 });
    assert.equal(state.board[4], 'b'); assert.equal(state.effects[4].poisonUntil, 0); assert.equal(state.restorationCharges.b.length, 0);
    if (counter === 'shield') assert.equal(state.effects[4].shield, false);
  }
});

test('Purify clears removable debuffs while preserving real ownership and beneficial defenses', () => {
  const state = fixture(['purify']); const effect = state.effects[0];
  Object.assign(effect, { frozenUntil: 8, poisonUntil: 8, poisonOwner: 'b', shield: true, mirrorUntil: 8, rootUntil: 8 });
  const next = power(state, 'purify', { cell: 0 });
  assert.equal(next.board[0], 'a'); assert.equal(next.effects[0].frozenUntil, 0); assert.equal(next.effects[0].poisonUntil, 0);
  assert.equal(next.effects[0].shield, true); assert.equal(next.effects[0].mirrorUntil, 8); assert.equal(next.effects[0].rootUntil, 8);
  expectCode(() => power(fixture(['purify']), 'purify', { cell: 0 }), 'NO_DEBUFF');
});

test('Purify clears restricted empty terrain with no ownership fabrication', () => {
  let state = game(['crystal'], ['purify']); state = power(state, 'crystal', { cell: 4 }); state = power(state, 'purify', { cell: 4 });
  assert.equal(state.board[4], null); assert.equal(state.effects[4].locked, false); assert.equal(state.effects[4].terrainOwner, null);
});

test('Dragon targets one ascending eligible mark in a selected row and does not punch through a shield', () => {
  const state = game(['dragon']); state.energy.a = 6; state.board = ['b', 'b', null, null, null, null, null, null, 'a']; state.effects[0].shield = true;
  const next = power(state, 'dragon', { axis: 'row', index: 0 });
  assert.equal(next.lastEvent.resolvedCell, 0); assert.equal(next.effects[0].shield, false); assert.equal(next.board[0], 'b'); assert.equal(next.board[1], 'b');
  assert.equal(next.lastEvent.destroyed.length, 0);
});

test('Dragon skips frozen marks, ignores reflective defense, and never destroys two targets', () => {
  const state = game(['dragon']); state.energy.a = 6; state.board = ['b', 'b', null, null, null, null, null, null, 'a'];
  state.effects[0].frozenUntil = 10; state.effects[1].mirrorUntil = 10;
  const next = power(state, 'dragon', { axis: 'row', index: 0 });
  assert.equal(next.lastEvent.resolvedCell, 1); assert.equal(next.board[0], 'b'); assert.equal(next.board[1], null); assert.equal(next.board[8], 'a');
  assert.equal(next.lastEvent.destroyed.length, 1); assert.equal(next.lastEvent.reflected, undefined);
  expectCode(() => power(state, 'dragon', { axis: 'row', index: 3 }), 'INVALID_LINE');
});

test('Eclipse enforces opening, full energy, visible darkness and its once-per-match limit across rounds', () => {
  let state = fixture(['eclipse'], undefined, { rounds: 3 });
  expectCode(() => power(state, 'eclipse', { cell: 4 }), 'POWER_OPENING_RESTRICTED');
  state.roundTurns = 4; state.energy.a = 5; expectCode(() => power(state, 'eclipse', { cell: 4 }), 'INSUFFICIENT_ENERGY');
  state.energy.a = 6; state = power(state, 'eclipse', { cell: 4 });
  assert.equal(state.effects[4].terrain, 'darkness'); assert.equal(state.matchUses.a.eclipse, 1); assert.equal(state.energy.a, 0);
  state.board = ['a', 'a', null, 'b', null, null, null, null, null]; state.currentPlayerId = 'a'; state = place(state, 2);
  assert.equal(state.round, 2); assert.equal(state.uses.a.eclipse, 0); assert.equal(state.matchUses.a.eclipse, 1);
  state = place(state, 4); state.roundTurns = 4; state.energy.a = 6;
  expectCode(() => power(state, 'eclipse', { cell: 4 }), 'POWER_MATCH_LIMIT');
});

test('Tide transfers enemy terrain without duplication, preserves its type and expires finitely', () => {
  let state = game(['crystal'], ['tide']); state = power(state, 'crystal', { cell: 4 }); state = power(state, 'tide', { from: 4, to: 8 });
  assert.equal(state.effects[4].locked, false); assert.equal(state.effects[8].locked, true); assert.equal(state.effects[8].terrain, 'crystal'); assert.equal(state.effects[8].terrainOwner, 'b');
  expectCode(() => place(state, 8), 'CELL_LOCKED'); state = place(state, 0); assert.equal(state.effects[8].locked, false);
  const own = game(['tide']); own.effects[4].locked = true; own.effects[4].lockedUntil = 10; own.effects[4].terrainOwner = 'a';
  expectCode(() => power(own, 'tide', { from: 4, to: 8 }), 'INVALID_TARGET');
});

test('Wind is a cheaper adjacent diagonal move with unchanged provenance and no orthogonal shortcut', () => {
  const state = game(['wind']); state.board[4] = 'a'; state.markOrigins[4] = { playerId: 'a', cell: 4, placementRevision: 1 };
  expectCode(() => power(state, 'wind', { from: 4, to: 1 }), 'INVALID_TARGET');
  const next = power(state, 'wind', { from: 4, to: 0 });
  assert.equal(next.board[0], 'a'); assert.equal(next.board[4], null); assert.equal(next.energy.a, 2); assert.equal(next.markOrigins[0].cell, 4);
});

test('Root prevents displacement through two subsequent owner turns while remaining destructible', () => {
  let state = fixture(['root'], ['fire']); state = power(state, 'root', { cell: 0 }); assert.equal(state.effects[0].rootUntil, 6);
  state = power(state, 'fire', { cell: 0 }); assert.equal(state.board[0], null); assert.equal(state.restorationCharges.a.length, 1);
  let anchored = fixture(['root']); anchored = power(anchored, 'root', { cell: 0 });
  anchored = place(anchored, 1); anchored = place(anchored, 8); anchored = place(anchored, 3); assert.equal(anchored.effects[0].rootUntil, 6);
  anchored = place(anchored, 2); assert.equal(anchored.effects[0].rootUntil, 0);
});

test('Echo restores exactly the last destroyed basic placement and cannot repeat an older arbitrary cell', () => {
  let state = game(['echo']); state = place(state, 0); state = place(state, 4); state = place(state, 1); state = power(state, 'fire', { cell: 1 });
  assert.equal(state.restorationCharges.a[0].origin.placementRevision, 3);
  state = power(state, 'echo'); assert.equal(state.board[1], 'a'); assert.equal(state.restorationCharges.a.length, 0); assert.equal(state.lastEvent.resolvedCell, 1);
  let old = game(['echo']); old = place(old, 0); old = place(old, 4); old = place(old, 1); old = power(old, 'fire', { cell: 0 });
  expectCode(() => power(old, 'echo'), 'NO_ECHO');
});

test('Echo refuses a moved-but-not-destroyed mark and a blocked original landing', () => {
  let state = game(['echo', 'portal']); state = place(state, 0); state = place(state, 4); state = power(state, 'portal', { from: 0, to: 8 }); state = place(state, 1);
  expectCode(() => power(state, 'echo'), 'NO_ECHO');
  let lost = game(['echo']); lost = place(lost, 0); lost = power(lost, 'fire', { cell: 0 });
  lost.effects[0].locked = true; lost.effects[0].lockedUntil = 10; expectCode(() => power(lost, 'echo'), 'CELL_LOCKED');
});

test('The action guide offers every power with exact target fields and transitions do not mutate fixtures', () => {
  for (const item of POWER_CATALOG) {
    let state;
    if (['bloom', 'echo'].includes(item.id)) { state = game([item.id]); state = place(state, 0); state = power(state, 'fire', { cell: 0 }); }
    else if (item.id === 'tide') { state = game(['crystal'], ['tide']); state = power(state, 'crystal', { cell: 4 }); }
    else if (item.id === 'purify') { state = fixture(['purify']); state.effects[0].frozenUntil = 10; }
    else { state = fixture([item.id]); if (item.id === 'wind') { state.board[4] = 'a'; state.board[0] = 'b'; } }
    state.energy[state.currentPlayerId] = 6; if (item.id === 'surge') state.energy[state.currentPlayerId] = 3;
    if (item.id === 'eclipse') state.roundTurns = 4;
    const action = legalActions(state).find(candidate => candidate.powerId === item.id); assert(action, item.id + ' must have a legal activation');
    const before = structuredClone(state); const next = applyAction(state, state.currentPlayerId, action, state.turnStartedAt + 1);
    assert.deepEqual(state, before, item.id + ' must be immutable'); assert.equal(next.revision, state.revision + 1); assert.equal(next.powerUses[state.currentPlayerId], state.powerUses[state.currentPlayerId] + 1);
    assert.equal(next.uses[state.currentPlayerId][item.id], 1);
  }
});

test('All seven AI difficulties select genuinely legal actions for new multi-target power loadouts', () => {
  for (const own of [['shadow', 'gravity', 'wind'], ['poison', 'time', 'dragon'], ['meteor', 'mirror', 'eclipse']]) {
    const state = fixture(own); state.roundTurns = 4;
    const allowed = legalActions(state);
    for (let difficulty = 1; difficulty <= 7; difficulty += 1) {
      const action = chooseAIAction(state, difficulty, { rng: () => 0.99, maxNodes: 80, maxTimeMs: 50 });
      assert(allowed.some(candidate => JSON.stringify(candidate) === JSON.stringify(action)));
      assert.doesNotThrow(() => applyAction(state, 'a', action, state.turnStartedAt));
    }
  }
});

test('A non-turn Time Warp never prevents emergency restriction expiration when the opponent has no main action', () => {
  const state = game(['crystal'], ['time', 'shield', 'portal']);
  state.board = ['a', 'b', 'a', 'a', 'b', 'b', 'b', 'a', null];
  state.uses.b.shield = 1; state.uses.b.portal = 1;
  const next = power(state, 'crystal', { cell: 8 });
  assert.equal(next.effects[8].locked, false); assert.equal(next.lastEvent.restrictionsExpiredEarly, true);
  assert(legalActions(next).some(action => action.type === 'place' && action.cell === 8));
});
