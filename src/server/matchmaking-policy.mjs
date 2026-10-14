import {fail} from './security.mjs';

export const BOARD_SIZES=Object.freeze([3,4,5,6]);
export const RANKED_BOT_FALLBACK_MS=25000;
export const RANKED_BOT_MESSAGE="If no real world players are found you'll play against a competitive bot";
export const RANKED_BOT_TIERS=Object.freeze([
  Object.freeze({minCups:0,difficulty:'hard'}),
  Object.freeze({minCups:450,difficulty:'expert'}),
  Object.freeze({minCups:1400,difficulty:'extreme'}),
  Object.freeze({minCups:2500,difficulty:'nightmare'}),
]);

export function requestedBoardSize(value){
  const size=value==null?3:value;
  fail(Number.isInteger(size)&&BOARD_SIZES.includes(size),'VALIDATION','Choose a 3 × 3, 4 × 4, 5 × 5 or 6 × 6 board.');
  return size;
}

export function rankedBotDifficulty(cups){
  return RANKED_BOT_TIERS.filter(tier=>Number(cups)>=tier.minCups).at(-1)?.difficulty||'hard';
}

export function rankedBotPolicy(cups){
  return {type:'competitive-bot',difficulty:rankedBotDifficulty(cups),fallbackSeconds:RANKED_BOT_FALLBACK_MS/1000,
    initialCups:Math.max(0,Number(cups)||0),rating:'existing-cup-formula',message:RANKED_BOT_MESSAGE};
}
