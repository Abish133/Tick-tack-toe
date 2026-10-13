'use client';
import {X,Circle,Crown,Sparkles,Snowflake,CloudMoon,FlameKindling,Sun} from 'lucide-react';
import {cosmeticAsset,cosmeticTheme,cosmeticStyle} from '../lib/cosmetic-collection';
import {CosmeticMark,CosmeticMotif,CosmeticFrame,CosmeticArrival} from './CosmeticAppearance';
export default function CosmeticArt({item}){
 const id=item?.id||'',type=item?.type||'',theme=cosmeticTheme(id),themeStyle=cosmeticStyle(id);
 if(theme){
  const themeClass=`collection-art collection-theme-${theme.id}`;
  if(type==='avatar')return <span className={`${themeClass} collection-portrait-art`} style={themeStyle}><span className="collection-avatar-aura"/><img className="cosmetic-portrait collection-portrait" src={cosmeticAsset(id)} alt="" loading="lazy"/></span>;
  if(type==='arena')return <span className={`${themeClass} collection-landscape-art`} style={themeStyle}><img className="cosmetic-arena-art collection-landscape" src={cosmeticAsset(id)} alt="" loading="lazy"/><span className="collection-landscape-label"><CosmeticMotif name={theme.motif}/>{theme.arena}</span></span>;
  if(type==='board')return <span className={`${themeClass} collection-board-art`} style={themeStyle}><span className="collection-board" data-cosmetic-theme={theme.id}>{['X',null,'O',null,'X',null,'O',null,null].map((mark,i)=><span key={i} className="collection-board-cell">{mark&&<span className={`mark collection-marks ${mark.toLowerCase()}`}><CosmeticMark mark={mark} cosmeticId={`marks-collection-${theme.id}`}/></span>}</span>)}</span></span>;
  if(type==='marks')return <span className={`${themeClass} cosmetic-sigils collection-sigils`} style={themeStyle}><span className="mark collection-marks x"><CosmeticMark mark="X" cosmeticId={id}/></span><span className="mark collection-marks o"><CosmeticMark mark="O" cosmeticId={id}/></span></span>;
  if(type==='frame')return <span className={`${themeClass} collection-frame-art`} style={themeStyle}><img src={`/assets/collection/avatar-${theme.id}.webp`} alt="" loading="lazy"/><CosmeticFrame cosmeticId={id}/></span>;
  if(type==='banner')return <span className={`${themeClass} collection-banner-art`} style={themeStyle}><img src={cosmeticAsset(id)} alt="" loading="lazy"/><span className="collection-banner-crest"><CosmeticMotif name={theme.motif}/></span><span className="collection-banner-copy"><small>ELEMENTAL ARENA</small><strong>{theme.name}</strong><i/></span></span>;
  if(type==='effect')return <span className={`${themeClass} collection-effect-art`} style={themeStyle}><CosmeticArrival cosmeticId={id} compact={false}/></span>;
  if(type==='emote')return <span className={`${themeClass} collection-emote-art`} style={themeStyle}><span><CosmeticMotif name={theme.emotes[0]}/></span><span><CosmeticMotif name={theme.emotes[1]}/></span><small>{theme.name} signals</small></span>;
  if(type==='title')return <span className={`${themeClass} collection-title-art`} style={themeStyle}><CosmeticMotif name={theme.motif}/><small>{theme.name}</small><strong>{item.name}</strong><span className="collection-title-flourish">◆ ━ ◆ ━ ◆</span></span>;
 }
 const asset=cosmeticAsset(id)||`/assets/${{'avatar-ember':'avatar-fire','avatar-frost':'avatar-ice'}[id]||id}.png`;
 if(type==='avatar')return <img className="cosmetic-portrait" src={asset} alt="" loading="lazy"/>;
 if(type==='arena')return <img className={`cosmetic-arena-art cosmetic-${id}`} src={item.asset||'/assets/arena.png'} alt="" loading="lazy"/>;
 if(type==='board')return <span className={`collection-board-art cosmetic-${id}`}><span className="collection-board legacy-board">{['X',null,'O',null,'X',null,'O',null,null].map((mark,i)=><span key={i} className="collection-board-cell">{mark&&<span className={`mark ${mark.toLowerCase()}`}>{mark==='X'?<X/>:<Circle/>}</span>}</span>)}</span></span>;
 if(type==='frame')return <span className={`cosmetic-frame-art cosmetic-${id}`}><img src="/assets/avatar-void.png" alt=""/><i/>{id==='frame-eclipse'?<CloudMoon/>:<Crown/>}</span>;
 if(type==='banner')return <span className={`cosmetic-banner-art cosmetic-${id}`}>{id==='banner-solar'?<Sun/>:<Sparkles/>}<i/><span>ELEMENTAL ARENA</span></span>;
 if(type==='emote')return <span className="cosmetic-emote-art"><Sparkles/><Snowflake/><small>Star play! · Cool move!</small></span>;
 if(type==='title')return <span className="cosmetic-title-art"><Crown/><span>{item.name}</span></span>;
 if(type==='effect')return <span className={`cosmetic-arrival cosmetic-${id}`}>{id==='effect-dragon'?<FlameKindling/>:<Sparkles/>}<i/><i/><i/></span>;
 return <span className={`cosmetic-sigils cosmetic-${id}`}><X/><Circle/></span>;
}
