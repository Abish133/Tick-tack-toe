// Shared display metadata. Ownership and payment rewards are validated on the server.
export const COSMETIC_THEMES=Object.freeze([
  {id:'solar',name:'Solar Dynasty',primary:'#ffd479',secondary:'#ff8758',ink:'#26170f',motif:'sun',avatar:'Sunfire Phoenix',arena:'Palace of the Sun',title:'Dawn Sovereign',emotes:['sun','crown']},
  {id:'abyss',name:'Abyssal Crown',primary:'#6de9dd',secondary:'#489bdb',ink:'#071b26',motif:'waves',avatar:'Abyssal Sentinel',arena:'Leviathan Throne',title:'Depths Monarch',emotes:['wavecrest','pearl']},
  {id:'jade',name:'Jade Sanctuary',primary:'#a1edb3',secondary:'#e8d79c',ink:'#10221d',motif:'leaf',avatar:'Verdant Guardian',arena:'Temple of the Wild',title:'Grove Keeper',emotes:['leaf','bloom']},
  {id:'storm',name:'Storm Circuit',primary:'#a0caff',secondary:'#b2a0ff',ink:'#111a33',motif:'bolt',avatar:'Volt Ronin',arena:'Thunder District',title:'Storm Walker',emotes:['bolt','spark']},
  {id:'rose',name:'Rose Eclipse',primary:'#ffb6cb',secondary:'#da83b8',ink:'#291320',motif:'rose',avatar:'Thorn Empress',arena:'Crimson Moon Garden',title:'Velvet Sovereign',emotes:['rose','heart']},
  {id:'clockwork',name:'Clockwork Citadel',primary:'#e8bb7d',secondary:'#87d8d2',ink:'#251c17',motif:'gear',avatar:'Brass Lion',arena:'Celestial Observatory',title:'Time Architect',emotes:['gear','hourglass']},
  {id:'lunar',name:'Lunar Lotus',primary:'#ded7ff',secondary:'#9bd9ed',ink:'#18172e',motif:'moon',avatar:'Moonlit Kitsune',arena:'Lotus Moonlake',title:'Moon Dreamer',emotes:['moon','lotus']},
  {id:'emberglass',name:'Emberglass Forge',primary:'#ffac83',secondary:'#f47689',ink:'#271516',motif:'flame',avatar:'Obsidian Drake',arena:'Emberglass Foundry',title:'Forge Eternal',emotes:['flame','anvil']},
  {id:'arctic',name:'Arctic Prism',primary:'#c0f1ff',secondary:'#bcb4ff',ink:'#142234',motif:'crystal',avatar:'Prism Owl',arena:'Frozen Sky Cathedral',title:'Prism Seer',emotes:['crystal','aurora']},
  {id:'nebula',name:'Nebula Voyager',primary:'#c9a2ff',secondary:'#eeacdc',ink:'#20152c',motif:'orbit',avatar:'Starborn Voyager',arena:'Nebula Spaceport',title:'Star Navigator',emotes:['planet','comet']},
]);
export const COSMETIC_TYPES=Object.freeze(['avatar','board','marks','arena','frame','banner','effect','emote','title']);
const labels={board:'Board',marks:'Sigils',frame:'Halo',banner:'Horizon',effect:'Arrival',emote:'Signals'};
const prices={avatar:500,board:450,marks:350,arena:750,frame:400,banner:350,effect:500,emote:250,title:200};
export const COLLECTION_COSMETICS=Object.freeze(COSMETIC_THEMES.flatMap(theme=>COSMETIC_TYPES.map(type=>({
  id:`${type}-collection-${theme.id}`,name:type==='avatar'?theme.avatar:type==='arena'?theme.arena:type==='title'?theme.title:`${theme.name} ${labels[type]}`,
  type,rarity:['avatar','arena','effect'].includes(type)?'epic':'rare',price:prices[type],
  description:type==='emote'?`Two ${theme.name.toLowerCase()} match signals. Equip to express yourself. Cosmetic only.`:`The ${theme.name.toLowerCase()} ${type==='marks'?'X and O set':type} style. Cosmetic only; equal powers for every player.`,
  asset:type==='avatar'?`/assets/collection/avatar-${theme.id}.webp`:['arena','board','banner'].includes(type)?`/assets/collection/arena-${theme.id}.webp`:'',
}))));
const cosmetics=new Map(COLLECTION_COSMETICS.map(item=>[item.id,item]));
export function cosmeticTheme(id){return COSMETIC_THEMES.find(theme=>COSMETIC_TYPES.some(type=>id===`${type}-collection-${theme.id}`))||null;}
export function cosmeticById(id){return cosmetics.get(id)||null;}
export function cosmeticAsset(id){return cosmetics.get(id)?.asset||({'avatar-ember':'/assets/avatar-fire.png','avatar-frost':'/assets/avatar-ice.png','avatar-void':'/assets/avatar-void.png'}[id])||null;}
export function cosmeticStyle(id){const theme=cosmeticTheme(id);return theme?{'--cosmetic-primary':theme.primary,'--cosmetic-secondary':theme.secondary,'--cosmetic-ink':theme.ink,'--cosmetic-art':`url("/assets/collection/arena-${theme.id}.webp")`}:{};}
export function cosmeticEmotes(id){if(id==='emote-celestial')return ['star','snow'];return cosmeticTheme(id)?.emotes||[];}
export const COLLECTION_BUNDLES=Object.freeze(COSMETIC_THEMES.map(theme=>({id:`bundle-${theme.id}`,name:`${theme.name} Collection`,themeId:theme.id,kind:'bundle',coins:0,currency:'INR',amount:14900,cosmeticIds:COSMETIC_TYPES.map(type=>`${type}-collection-${theme.id}`),asset:`/assets/collection/arena-${theme.id}.webp`,description:'Nine matching cosmetic styles: avatar, board, marks, arena, frame, banner, arrival effect, two emotes and title.'})));
