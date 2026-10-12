'use client';
import {X,Circle,Crown,Sparkles,Snowflake} from 'lucide-react';
export default function CosmeticArt({item}){
 const id=item?.id||'',type=item?.type||'',asset={'avatar-ember':'avatar-fire','avatar-frost':'avatar-ice'}[id]||id;
 if(type==='avatar')return <img className="cosmetic-portrait" src={`/assets/${asset}.png`} alt="" loading="lazy"/>;
 if(type==='arena')return <img className="cosmetic-arena-art" src={item.asset||'/assets/arena.png'} alt="" loading="lazy"/>;
 if(type==='frame')return <span className="cosmetic-frame-art"><img src="/assets/avatar-void.png" alt=""/><i/><Crown/></span>;
 if(type==='banner')return <span className="cosmetic-banner-art"><Sparkles/><i/><span>ELEMENTAL ARENA</span></span>;
 if(type==='emote')return <span className="cosmetic-emote-art"><Sparkles/><Snowflake/><small>Star play! · Cool move!</small></span>;
 if(type==='title')return <span className="cosmetic-title-art"><Crown/><span>{item.name}</span></span>;
 if(type==='effect')return <span className="cosmetic-arrival"><Sparkles/><i/><i/><i/></span>;
 return <span className={`cosmetic-sigils cosmetic-${id}`}><X/><Circle/></span>;
}
