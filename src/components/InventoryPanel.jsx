'use client';
import CosmeticArt from './CosmeticArt';
import {useEffect,useState} from 'react';
import {Check,Coins,Shield,Sparkles,X,Circle,Crown,ArrowRight,LoaderCircle,ShoppingBag} from 'lucide-react';
export default function InventoryPanel({api,user,refresh,onError,onNotice,navigate}){
 const [inventory,setInventory]=useState([]),[loading,setLoading]=useState(true),[busy,setBusy]=useState(null);
 useEffect(()=>{if(!user){setLoading(false);return;}api('/inventory').then(d=>setInventory(d.inventory||[])).catch(e=>onError(e.message)).finally(()=>setLoading(false));},[user?.id]);
 const fieldFor={board:'equippedBoard',marks:'equippedMark',avatar:'avatar',effect:'equippedEffect',title:'title',frame:'equippedFrame',banner:'equippedBanner',arena:'equippedArena',emote:'equippedEmote'};
 function equipped(item){return item.type==='title'?user?.profile?.title===item.name:user?.profile?.[fieldFor[item.type]]===item.id;}
 async function equip(item){setBusy(item.id);try{await api('/inventory/equip','POST',{cosmeticId:item.id});await refresh();onNotice(`${item.name} equipped. Your gameplay rules stay the same.`);}catch(e){onError(e.message);}finally{setBusy(null);}}
 if(loading)return <div className="loading-state"><LoaderCircle className="spin"/>Opening your collection…</div>;
 if(!user)return <div className="empty"><ShoppingBag size={36}/><h3>A collection that is yours</h3><p>Create a player to view your owned cosmetics.</p></div>;
 return <><div className="section-heading"><div><h2>{inventory.length} expressions of you</h2><p>Equip a board, mark skin, avatar, title, or arrival effect.</p></div><button className="button secondary" onClick={()=>navigate('/shop')}>Visit shop <ArrowRight size={15}/></button></div><div className="shop-grid">{inventory.map((entry,i)=>{const item=entry.cosmetic;const Icon=item.type==='board'?Shield:item.type==='marks'?X:item.type==='title'?Crown:Sparkles;return <article key={entry.id||item.id} className={`shop-card panel theme-${i%4}`}><div className={`shop-art cosmetic-${item.id}`}><span className="shop-orbit"/><CosmeticArt item={item}/></div><div className="shop-info"><span className="badge">{item.type} · {item.rarity}</span><h3>{item.name}</h3><p>{item.description}</p><button className={`button ${equipped(item)?'primary':'secondary'}`} disabled={busy===item.id||equipped(item)} onClick={()=>equip(item)}>{equipped(item)?<><Check size={15}/>Equipped</>:<><Sparkles size={15}/>Equip cosmetic</>}</button></div></article>;})}</div></>;
}
