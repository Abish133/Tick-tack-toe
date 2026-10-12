import test from 'node:test';
import assert from 'node:assert/strict';
import {POWER_CATALOG,applyAction} from '../src/lib/game-engine/index.js';
import {createPowerTraining,trainingChoices,TRAINING_PLAYER} from '../src/lib/power-training.js';

assert.equal(POWER_CATALOG.length,22);
for(const power of POWER_CATALOG){
 test(`${power.name} training offers legal targets and resolves through the real engine`,()=>{
  const game=createPowerTraining(power.id),choices=trainingChoices(game,power.id);
  assert.ok(choices.length,`${power.name} needs an actionable training target`);
  for(const action of choices){
   const snapshot=structuredClone(game),after=applyAction(game,TRAINING_PLAYER,action,game.turnStartedAt+100);
   assert.deepEqual(game,snapshot,`${power.name} mutated its input scenario`);
   assert.equal(after.revision,game.revision+1);assert.equal(after.uses[TRAINING_PLAYER][power.id],1);
   assert.equal(after.currentPlayerId,power.consumesTurn===false?TRAINING_PLAYER:'training-o');
  }
 });
}

test('training restoration, terrain and cleanse prerequisites are genuine recorded actions',()=>{
 for(const id of ['bloom','echo']){
  const game=createPowerTraining(id);
  assert.equal(game.restorationCharges[TRAINING_PLAYER].length,1);
  assert.equal(game.restorationCharges[TRAINING_PLAYER][0].cell,1);
  assert.equal(game.history.at(-1).action.powerId,'fire');
 }
 const tide=createPowerTraining('tide');assert.equal(tide.effects[8].terrainOwner,'training-o');assert.equal(tide.history.at(-1).action.powerId,'crystal');
 const purify=createPowerTraining('purify');assert.ok(purify.effects[0].poisonUntil>purify.turnNumber);assert.equal(purify.history.at(-1).action.powerId,'poison');
});
