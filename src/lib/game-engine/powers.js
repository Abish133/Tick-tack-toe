/** Shared public catalog. Planned powers cannot be equipped or activated. */
const active = (id, name, cost, category, description, target, counterplay, animation) => ({
  id, name, cost, energyCost: cost, category, description, target, counterplay, animation,
  implemented: true, enabled: true, status: 'available', consumesTurn: true,
  cooldown: 'round', maxUsesPerRound: 1, ranked: true,
});
const planned = (id, name, category, description) => ({
  id, name, category, description, implemented: false, enabled: false,
  status: 'planned', ranked: false, locked: true, cost: null,
});

export const POWER_CATALOG = Object.freeze([
  active('fire', 'Fire Blast', 2, 'offense', 'Destroy one enemy mark. A shield absorbs the blast and breaks instead.', 'enemy', 'Frozen marks cannot be targeted; a shield absorbs one blast.', 'fire-impact'),
  active('shield', 'Shield Guard', 1, 'defense', 'Protect one existing friendly mark from one destructive attack.', 'own', 'Fire Blast breaks the shield without removing the mark.', 'shield-ring'),
  active('portal', 'Portal Shift', 2, 'positioning', 'Move an unprotected, unfrozen friendly mark to any empty unlocked cell.', 'own-and-empty', 'Freeze anchors a mark; a shield must be removed before shifting.', 'portal-transfer'),
  active('ice', 'Ice Freeze', 1, 'control', 'Freeze an enemy mark through its next two owner-turn boundaries. It still counts toward lines.', 'enemy', 'An anchored mark cannot move or be destroyed. Play around its known position.', 'frost-wave'),
  active('crystal', 'Crystal Lock', 1, 'control', 'Lock an empty cell until the end of the opponent\'s next action.', 'empty', 'The lock expires automatically and never creates a permanent blockade.', 'crystal-rise'),
  active('surge', 'Energy Surge', 0, 'energy', 'Spend the action to gain three energy, up to the six-energy maximum.', 'self', 'The opponent receives a full action while you recharge.', 'energy-pulse'),
  planned('lightning', 'Lightning Strike', 'offense', 'Remove an eligible enemy mark and briefly electrify its cell.'),
  planned('time', 'Time Warp', 'tempo', 'Limited extra thinking time without an additional move.'),
  planned('shadow', 'Shadow Swap', 'positioning', 'Exchange two eligible occupied cells.'),
  planned('meteor', 'Meteor Crash', 'offense', 'Destroy an eligible mark and leave temporary scorched terrain.'),
  planned('bloom', 'Healing Bloom', 'restoration', 'Restore a lost mark using a valid restoration charge.'),
  planned('mirror', 'Mirror Reflect', 'defense', 'Reflect one eligible destructive effect without recursive reflections.'),
  planned('phantom', 'Phantom Mark', 'deception', 'Create a clearly identified temporary illusion that cannot win a line.'),
  planned('gravity', 'Gravity Pulse', 'positioning', 'Shift eligible marks in a deterministic direction.'),
  planned('poison', 'Poison Curse', 'offense', 'Warn of delayed destruction that can be cleansed or protected.'),
  planned('purify', 'Purify', 'counterplay', 'Remove one removable negative status effect.'),
  planned('dragon', 'Dragon Breath', 'offense', 'Destroy at most one eligible mark in a chosen row or column.'),
  planned('eclipse', 'Ultimate Eclipse', 'ultimate', 'A high-cost, once-per-match strike with a short darkness effect.'),
  planned('tide', 'Tide Reversal', 'counterplay', 'Return a temporary terrain restriction to an eligible opposing cell.'),
  planned('wind', 'Wind Step', 'positioning', 'A constrained diagonal reposition with visible counterplay.'),
  planned('root', 'Root Anchor', 'defense', 'Temporarily anchor a friendly mark against displacement.'),
  planned('echo', 'Chrono Echo', 'tempo', 'A limited tactical echo of a previous eligible basic action.'),
].map(power => Object.freeze(power)));
export const RANKED_POWER_IDS = Object.freeze(POWER_CATALOG.filter(power => power.implemented).map(power => power.id));
export const DEFAULT_LOADOUT = Object.freeze(['fire', 'shield', 'portal']);
export const POWER_BY_ID = Object.freeze(Object.fromEntries(POWER_CATALOG.map(power => [power.id, power])));
