'use client';
import {X,Circle,Crown,Sparkles,Snowflake,CloudMoon,FlameKindling,Sun} from 'lucide-react';
import {cosmeticAsset,cosmeticTheme,cosmeticStyle} from '../lib/cosmetic-collection';
import {CosmeticMark,CosmeticMotif,CosmeticFrame,CosmeticArrival} from './CosmeticAppearance';
import AnimatedCosmeticImage from './AnimatedCosmeticImage';
import AscendantFx from './AscendantFx';
export default function CosmeticArt({item,format='webp'}){
 const id=item?.id||'',type=item?.type||'',theme=cosmeticTheme(id),themeStyle=cosmeticStyle(id);
 if(theme){
  const themeClass=`collection-art collection-theme-${theme.id}`;
  // Every collection's art carries live light in its colours; Ascendant gets the full show.
  const fx=<AscendantFx theme={theme.id} stars={type==='board'||type==='marks'?6:8} sweep={['avatar','arena','banner','title'].includes(type)} glow={type==='avatar'||type==='effect'}/>;
  if(type==='avatar')return <span className={`${themeClass} collection-portrait-art`} style={themeStyle}><span className="collection-avatar-aura"/><AnimatedCosmeticImage cosmeticId={id} format={format} className="cosmetic-portrait collection-portrait" src={cosmeticAsset(id)} alt="" loading="lazy"/>{fx}</span>;
  if(type==='arena')return <span className={`${themeClass} collection-landscape-art`} style={themeStyle}><AnimatedCosmeticImage cosmeticId={id} format={format} className="cosmetic-arena-art collection-landscape" src={cosmeticAsset(id)} alt="" loading="lazy"/><span className="collection-landscape-label"><CosmeticMotif name={theme.motif}/>{theme.arena}</span>{fx}</span>;
  if(type==='board')return <span className={`${themeClass} collection-board-art`} style={themeStyle}><span className="collection-board" data-cosmetic-theme={theme.id}>{['X',null,'O',null,'X',null,'O',null,null].map((mark,i)=><span key={i} className="collection-board-cell">{mark&&<span className={`mark collection-marks ${mark.toLowerCase()}`}><CosmeticMark mark={mark} cosmeticId={`marks-collection-${theme.id}`}/></span>}</span>)}</span>{fx}</span>;
  if(type==='marks')return <span className={`${themeClass} cosmetic-sigils collection-sigils`} style={themeStyle}>{theme.id==='ascendant'&&<AnimatedCosmeticImage cosmeticId={id} format={format} className="collection-ascendant-ambient"/>}<span className="mark collection-marks x"><CosmeticMark mark="X" cosmeticId={id}/></span><span className="mark collection-marks o"><CosmeticMark mark="O" cosmeticId={id}/></span>{fx}</span>;
  if(type==='frame')return <span className={`${themeClass} collection-frame-art`} style={themeStyle}><AnimatedCosmeticImage cosmeticId={`avatar-collection-${theme.id}`} src={cosmeticAsset(`avatar-collection-${theme.id}`)} alt="" loading="lazy"/><CosmeticFrame cosmeticId={id} format={format}/>{fx}</span>;
  if(type==='banner')return <span className={`${themeClass} collection-banner-art`} style={themeStyle}><AnimatedCosmeticImage cosmeticId={id} format={format} src={cosmeticAsset(id)} alt="" loading="lazy"/><span className="collection-banner-crest"><CosmeticMotif name={theme.motif}/></span><span className="collection-banner-copy"><small>ELEMENTAL ARENA</small><strong>{theme.name}</strong><i/></span>{fx}</span>;
  if(type==='effect')return <span className={`${themeClass} collection-effect-art`} style={themeStyle}><CosmeticArrival cosmeticId={id} compact={false} format={format}/>{fx}</span>;
  if(type==='emote')return <span className={`${themeClass} collection-emote-art`} style={themeStyle}>{theme.id==='ascendant'&&<AnimatedCosmeticImage cosmeticId={id} format={format} className="collection-ascendant-ambient"/>}<span><CosmeticMotif name={theme.emotes[0]}/></span><span><CosmeticMotif name={theme.emotes[1]}/></span><small>{theme.name} signals</small>{fx}</span>;
  if(type==='title')return <span className={`${themeClass} collection-title-art`} style={themeStyle}>{theme.id==='ascendant'&&<AnimatedCosmeticImage cosmeticId={id} format={format} className="collection-ascendant-ambient"/>}<CosmeticMotif name={theme.motif}/><small>{theme.name}</small><strong>{item.name}</strong><span className="collection-title-flourish">◆ ━ ◆ ━ ◆</span>{fx}</span>;
 }
 const asset=cosmeticAsset(id)||`/assets/${{'avatar-ember':'avatar-fire','avatar-frost':'avatar-ice'}[id]||id}.webp`;
 if(type==='avatar')return <img className="cosmetic-portrait" src={asset} alt="" loading="lazy"/>;
 if(type==='arena')return <img className={`cosmetic-arena-art cosmetic-${id}`} src={item.asset||'/assets/arena.webp'} alt="" loading="lazy"/>;
 if(type==='board')return <span className={`collection-board-art cosmetic-${id}`}><span className="collection-board legacy-board">{['X',null,'O',null,'X',null,'O',null,null].map((mark,i)=><span key={i} className="collection-board-cell">{mark&&<span className={`mark ${mark.toLowerCase()}`}>{mark==='X'?<X/>:<Circle/>}</span>}</span>)}</span></span>;
 if(type==='frame')return <span className={`cosmetic-frame-art cosmetic-${id}`}><img src="/assets/avatar-void.webp" alt=""/><i/>{id==='frame-eclipse'?<CloudMoon/>:<Crown/>}</span>;
 if(type==='banner')return <span className={`cosmetic-banner-art cosmetic-${id}`}>{id==='banner-solar'?<Sun/>:<Sparkles/>}<i/><span>ELEMENTAL ARENA</span></span>;
 if(type==='emote')return <span className="cosmetic-emote-art"><Sparkles/><Snowflake/><small>Star play! · Cool move!</small></span>;
 if(type==='title')return <span className="cosmetic-title-art"><Crown/><span>{item.name}</span></span>;
 if(type==='effect')return <span className={`cosmetic-arrival cosmetic-${id}`}>{id==='effect-dragon'?<FlameKindling/>:<Sparkles/>}<i/><i/><i/></span>;
 return <span className={`cosmetic-sigils cosmetic-${id}`}><X/><Circle/></span>;
}
