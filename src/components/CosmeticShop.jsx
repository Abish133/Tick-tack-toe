'use client';
import {useEffect,useMemo,useRef,useState} from 'react';
import {Check,Coins,Eye,Search,ShieldCheck,ShoppingBag,Sparkles,X,ArrowRight,Layers3} from 'lucide-react';
import CosmeticArt from './CosmeticArt';
import {CosmeticMark} from './CosmeticAppearance';
import CommercePanel from './CommercePanel';
import {COSMETIC_THEMES,cosmeticTheme,cosmeticStyle} from '../lib/cosmetic-collection';
import styles from './CosmeticShop.module.css';

const categories=[['all','All styles'],['avatar','Avatars'],['board','Boards'],['marks','Marks'],['arena','Arenas'],['frame','Frames'],['banner','Banners'],['effect','Effects'],['emote','Emotes'],['title','Titles']];
const pretty=n=>Number(n||0).toLocaleString();

function Preview({item,owned,busy,onPurchase,onClose}){
 const dialog=useRef(null);
 useEffect(()=>{const node=dialog.current,previous=document.activeElement;node.showModal();const overflow=document.body.style.overflow;document.body.style.overflow='hidden';return()=>{node.close();document.body.style.overflow=overflow;previous?.focus?.();};},[]);
 const theme=cosmeticTheme(item.id),isBoard=['board','marks'].includes(item.type);
 return <dialog ref={dialog} className={styles.dialog} aria-label={item.name} onCancel={event=>{event.preventDefault();onClose();}} onClick={event=>{if(event.target===event.currentTarget)onClose();}}>
  <button className={`icon-button ${styles.close}`} aria-label="Close preview" onClick={onClose}><X size={20}/></button>
  <span className={styles.eyebrow}>COSMETIC PREVIEW · {item.rarity||'rare'}</span><h2>{item.name}</h2>
  <div className={styles.previewStage} style={cosmeticStyle(item.id)}>
   {isBoard?<div className={`preview-board ${item.type==='board'&&theme?'collection-board':''} ${styles.previewBoard}`} style={item.type==='board'?cosmeticStyle(item.id):{}} data-cosmetic-theme={item.type==='board'?theme?.id:undefined}>{['X',null,'O',null,'X',null,'O',null,'X'].map((mark,index)=><div className="preview-cell" key={index}>{mark&&<span className={`mark ${mark.toLowerCase()} ${theme&&item.type==='marks'?'collection-marks':''}`} style={item.type==='marks'?cosmeticStyle(item.id):{}}><CosmeticMark mark={mark} cosmeticId={item.type==='marks'?item.id:''}/></span>}</div>)}</div>:<CosmeticArt item={item}/>}
  </div>
  {theme&&<p className={styles.themeName}>{theme.name} collection</p>}<p className={styles.previewDescription}>{item.description}</p>
  <div className={styles.previewActions}><span><ShieldCheck size={15}/> Visual style only</span><button className="button primary" disabled={owned||busy} onClick={()=>onPurchase(item)}>{owned?<><Check size={16}/>Owned</>:<><Coins size={16}/>{pretty(item.price??item.cost)} coins</>}</button></div>
 </dialog>;
}

export default function CosmeticShop({items=[],ownedIds=[],user,api,features,refresh,onError,onNotice,onRegister,busy,onPurchase}){
 const [category,setCategory]=useState('all'),[theme,setTheme]=useState('all'),[query,setQuery]=useState(''),[sort,setSort]=useState('featured'),[limit,setLimit]=useState(24),[preview,setPreview]=useState(null);
 const catalogRef=useRef(null),owned=useMemo(()=>new Set(ownedIds),[ownedIds]);
 const counts=useMemo(()=>Object.fromEntries(categories.map(([id])=>[id,id==='all'?items.length:items.filter(item=>item.type===id).length])),[items]);
 const filtered=useMemo(()=>{
  const text=query.trim().toLowerCase();const list=items.filter(item=>{
   const collection=cosmeticTheme(item.id);return (category==='all'||item.type===category)&&(theme==='all'||collection?.id===theme)&&(!text||`${item.name} ${item.description||''} ${item.type} ${collection?.name||''}`.toLowerCase().includes(text));
  });
  if(sort==='featured')list.sort((a,b)=>{const first=cosmeticTheme(a.id),second=cosmeticTheme(b.id);if(!first||!second)return Number(Boolean(first))-Number(Boolean(second));const worlds=COSMETIC_THEMES.findIndex(theme=>theme.id===first.id)-COSMETIC_THEMES.findIndex(theme=>theme.id===second.id);return worlds||categories.findIndex(([id])=>id===a.type)-categories.findIndex(([id])=>id===b.type);});
  if(sort==='price-low')list.sort((a,b)=>(a.price??a.cost??0)-(b.price??b.cost??0));
  if(sort==='price-high')list.sort((a,b)=>(b.price??b.cost??0)-(a.price??a.cost??0));
  if(sort==='name')list.sort((a,b)=>a.name.localeCompare(b.name));
  return list;
 },[items,category,theme,query,sort]);
 useEffect(()=>setLimit(24),[category,theme,query,sort]);
 function viewCollection(id){setCategory('all');setQuery('');setTheme(id);catalogRef.current?.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'});}
 function clear(){setCategory('all');setTheme('all');setQuery('');}
 return <>
  <section className={styles.hero} aria-label="The elemental style collection"><img className={styles.heroBackground} src="/assets/collection/arena-nebula.webp" alt=""/><div className={styles.heroShade}/><div className={styles.heroCopy}><span className={styles.eyebrow}><Sparkles size={14}/> THE ELEMENTAL COLLECTION</span><h2>Ten worlds.<br/><span>One identity.</span></h2><p>Meet mythical guardians. Claim extraordinary arenas. Build a style that feels like you.</p><div className={styles.heroStats}><span><strong>90</strong> new styles</span><span><strong>10</strong> complete collections</span><span><ShieldCheck size={18}/><strong>Equal powers</strong></span></div></div><div className={styles.heroArt} aria-hidden="true"><img src="/assets/collection/avatar-lunar.webp" alt=""/><img src="/assets/collection/avatar-solar.webp" alt=""/></div></section>
  <CommercePanel api={api} user={user} features={features} refresh={refresh} onError={onError} onNotice={onNotice} onRegister={onRegister} ownedIds={ownedIds} onCollection={viewCollection}/>
  <section ref={catalogRef} className={styles.collection} aria-label="Cosmetic collection">
   <div className={`section-heading ${styles.heading}`}><div><span className={styles.eyebrow}>FIND YOUR SIGNATURE</span><h2>The collection</h2><p>Earn coins through daily rewards and genuine completed battles.</p></div><span className={`badge ${styles.fairBadge}`}><ShieldCheck size={14}/>No power upgrades for sale</span></div>
   <div className={styles.categories} aria-label="Cosmetic categories">{categories.map(([id,label])=><button key={id} aria-pressed={category===id} className={category===id?styles.selected:''} onClick={()=>setCategory(id)}>{label}<span>{counts[id]}</span></button>)}</div>
   <div className={styles.tools}><label className={styles.search}><Search size={17}/><input aria-label="Search cosmetics" placeholder="Search your next signature…" value={query} onChange={event=>setQuery(event.target.value)} maxLength={100}/>{query&&<button className="icon-button" aria-label="Clear search" onClick={()=>setQuery('')}><X size={15}/></button>}</label><label className={styles.select}><span>Collection</span><select aria-label="Collection theme" value={theme} onChange={event=>setTheme(event.target.value)}><option value="all">Every world</option>{COSMETIC_THEMES.map(collection=><option key={collection.id} value={collection.id}>{collection.name}</option>)}</select></label><label className={styles.select}><span>Sort by</span><select aria-label="Sort cosmetics" value={sort} onChange={event=>setSort(event.target.value)}><option value="featured">Featured</option><option value="price-low">Coins: low to high</option><option value="price-high">Coins: high to low</option><option value="name">Name</option></select></label></div>
   <div className={styles.results}><span aria-live="polite">{filtered.length} {filtered.length===1?'style':'styles'}{theme!=='all'?` in ${COSMETIC_THEMES.find(item=>item.id===theme)?.name}`:''}</span><span><Layers3 size={14}/>{ownedIds.length} owned</span></div>
   {filtered.length?<div className={`shop-grid ${styles.grid}`}>{filtered.slice(0,limit).map((item,index)=>{const collection=cosmeticTheme(item.id),isOwned=owned.has(item.id);return <article className={`shop-card panel theme-${index%4} ${styles.card}`} key={item.id} data-cosmetic-type={item.type} data-cosmetic-id={item.id} style={collection?{'--collection-color':collection.primary}:undefined}><button className={`shop-art ${styles.art}`} onClick={()=>setPreview(item)} aria-label={`Preview ${item.name}`}><span className={styles.artHalo}/><CosmeticArt item={item}/><span className={`${styles.rarity} ${item.rarity==='epic'?styles.epic:''}`}>{item.rarity||'rare'}</span>{isOwned&&<span className={styles.owned}><Check size={13}/>Owned</span>}<span className="preview-label"><Eye size={13}/> Preview</span></button><div className={`shop-info ${styles.info}`}><span className={styles.itemType}>{categories.find(([id])=>id===item.type)?.[1]||item.type}<i/>{collection?.name||'Arena originals'}</span><h3>{item.name}</h3><p>{item.description||'A new expression of your arena identity.'}</p><button className={`button ${isOwned?'secondary':'primary'}`} disabled={busy||isOwned} onClick={()=>onPurchase(item)}>{isOwned?<><Check size={15}/>Owned</>:<><Coins size={15}/>{pretty(item.price??item.cost)} coins <ShoppingBag size={14}/></>}</button></div></article>;})}</div>:<div className={styles.empty}><Search size={32}/><h3>{items.length?'No styles match this search':'Opening the collection'}</h3><p>{items.length?'Try another name, category or world. Your next signature is here.':'The cosmetic catalog is loading. Please wait a moment.'}</p>{items.length>0&&<button className="button secondary" onClick={clear}>Show all styles <ArrowRight size={15}/></button>}</div>}
   {filtered.length>limit&&<div className={styles.more}><p>Showing {limit} of {filtered.length} styles</p><button className="button secondary" onClick={()=>setLimit(value=>value+24)}>Show {Math.min(24,filtered.length-limit)} more styles <ArrowRight size={16}/></button></div>}
  </section>
  <div className="fairplay"><ShieldCheck size={16}/> Cosmetic purchases never increase power strength. Every collection is also available through earned cosmetic coins.</div>
  {preview&&<Preview item={preview} owned={owned.has(preview.id)} busy={busy} onPurchase={onPurchase} onClose={()=>setPreview(null)}/>}
 </>;
}
