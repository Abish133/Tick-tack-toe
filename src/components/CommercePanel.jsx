'use client';
import {useEffect,useRef,useState} from 'react';
import {Coins,ShieldCheck,Sparkles,Play,LoaderCircle,CreditCard,ArrowRight,Check,Layers3} from 'lucide-react';
import {cosmeticTheme,cosmeticById,COLLECTION_BUNDLES,COSMETIC_THEMES} from '../lib/cosmetic-collection';
import styles from './CommercePanel.module.css';

let checkoutScript;
function loadCheckout(){
 if(window.Razorpay)return Promise.resolve();
 if(!checkoutScript)checkoutScript=new Promise((resolve,reject)=>{
  const script=document.createElement('script');script.src='https://checkout.razorpay.com/v1/checkout.js';script.async=true;
  script.onload=()=>{if(window.Razorpay)resolve();else{checkoutScript=null;reject(new Error('Checkout could not load.'));}};
  script.onerror=()=>{checkoutScript=null;reject(new Error('Payment checkout is unavailable. Please retry.'));};
  document.head.appendChild(script);
 });
 return checkoutScript;
}
const price=p=>new Intl.NumberFormat('en-IN',{style:'currency',currency:p.currency,minimumFractionDigits:p.amount%100?2:0,maximumFractionDigits:2}).format(p.amount/100);
export default function CommercePanel({api,user,features,refresh,onError,onNotice,onRegister,ownedIds=[],onCollection}){
 const [data,setData]=useState(null),[busy,setBusy]=useState(''),[native,setNative]=useState(false),[adState,setAdState]=useState('');
 const alive=useRef(true),adSession=useRef(null),timer=useRef(null),checkout=useRef(null);
 useEffect(()=>{alive.current=true;setNative(Boolean(window.ElementalNative?.postMessage));api('/commerce/products').then(d=>{if(alive.current)setData(d);}).catch(e=>onError(e.message));return()=>{alive.current=false;clearTimeout(timer.current);adSession.current=null;checkout.current?.close();};},[api,onError]);
 useEffect(()=>{
  const event=e=>{if(e.detail?.sessionId!==adSession.current?.sessionId)return;const state=e.detail.state;
   if(state==='error'){setAdState(e.detail.message||'The ad could not load. No coins were charged.');setBusy('');adSession.current=null;clearTimeout(timer.current);}
   else if(state==='rewarded')setAdState('Ad completed. Waiting for verified reward…');
   else if(state==='closed')setAdState('Checking whether the reward was verified…');
  };
  window.addEventListener('elemental:admob',event);return()=>window.removeEventListener('elemental:admob',event);
 },[]);
 async function payment(product){
  if(!user||user.guest){onRegister();return;}
  if(!data?.checkoutEnabled){onNotice('Payments not enabled yet. This collection can be earned with cosmetic coins.');return;}
  setBusy(product.id);
  try{
   await loadCheckout();
   const order=await api('/commerce/orders','POST',{sku:product.id,requestId:crypto.randomUUID()});
   await new Promise((resolve,reject)=>{
    let settled=false;const finish=fn=>value=>{if(!settled){settled=true;fn(value);}};
    const popup=new window.Razorpay({key:order.keyId,order_id:order.providerOrderId,amount:order.amount,currency:order.currency,name:order.name,description:order.description,prefill:{name:user.name,email:user.email},theme:{color:'#8966ff'},
     handler:async result=>{
      try{await api('/commerce/verify','POST',{orderId:order.orderId,...result});await refresh();onNotice(product.kind==='bundle'?`${product.name} purchased. Your nine styles are ready in Inventory.`:'Payment captured. Your cosmetic purchase is ready.');finish(resolve)();}
      catch(error){
       // A webhook can settle even if the browser verification request is interrupted.
       try{const status=await api('/commerce/orders/'+order.orderId);if(status.status==='paid'){await refresh();onNotice('Payment verified. Your cosmetic purchase is ready.');finish(resolve)();return;}}catch{}
       finish(reject)(error);
      }
     },modal:{ondismiss:()=>finish(resolve)(),confirm_close:true}});
    checkout.current=popup;popup.on('payment.failed',()=>finish(reject)(new Error('Payment did not complete. You can retry the purchase.')));popup.open();
   });
  }catch(error){onError(error.message);}finally{if(alive.current)setBusy('');checkout.current=null;}
 }
 async function watchAd(){
  if(!user){onRegister();return;}setBusy('ad');setAdState('Preparing optional rewarded ad…');
  try{
   const session=await api('/ads/session','POST',{});adSession.current=session;
   window.ElementalNative.postMessage(JSON.stringify({type:'rewarded',...session}));
   const deadline=Date.now()+90000;
   const poll=async()=>{
    if(!alive.current||adSession.current?.sessionId!==session.sessionId)return;
    try{const status=await api('/ads/sessions/'+session.sessionId);
     if(status.status==='granted'){adSession.current=null;setBusy('');setAdState('Verified: '+status.coins+' cosmetic coins added.');await refresh();onNotice('Rewarded ad verified: '+status.coins+' cosmetic coins.');return;}
     if(status.status==='expired'||Date.now()>deadline){adSession.current=null;setBusy('');setAdState('Verification is still pending. Reopen your wallet later; completed rewards settle on the server.');return;}
    }catch(error){if(Date.now()>deadline){adSession.current=null;setBusy('');setAdState(error.message);return;}}
    timer.current=setTimeout(poll,4000);
   };timer.current=setTimeout(poll,4000);
  }catch(error){adSession.current=null;setBusy('');setAdState('');onError(error.message);}
 }
 const products=data?.products||[],bundles=products.filter(product=>product.kind==='bundle'),extras=products.filter(product=>product.kind!=='bundle');
 const bundleIds=product=>product.cosmeticIds||COLLECTION_BUNDLES.find(bundle=>bundle.id===product.id)?.cosmeticIds||[];
 return <section className={styles.panel} aria-label="Cosmetic purchases and optional rewards">
  <div className={styles.heading}><div><span className={styles.eyebrow}>MATCHING STYLES · REAL MONEY COLLECTIONS</span><h2>A whole world, together.</h2><p>Nine matching styles in each collection. Explore every piece before you buy.</p></div><ShieldCheck size={30}/></div>
  {!data?<p className={styles.info}>Loading cosmetic products…</p>:<>
   {!data.checkoutEnabled&&<p className={styles.info}><CreditCard size={16}/><span><strong>Payments not enabled yet.</strong> Prices are listed below; cash checkout opens after Razorpay setup. You can earn every collection style with coins now.</span></p>}
   {bundles.length>0&&<div className={styles.collections} aria-label="Cash cosmetic collections">{bundles.map(product=>{
    const ids=bundleIds(product),count=ids.filter(id=>ownedIds.includes(id)).length,complete=ids.length>0&&count===ids.length;
    const theme=COSMETIC_THEMES.find(item=>item.id===(product.themeId||product.id.replace('bundle-','')))||cosmeticTheme(ids[0]),avatar=ids.map(cosmeticById).find(item=>item?.type==='avatar');
    return <article className={styles.bundle} key={product.id} style={{'--bundle-color':theme?.primary||'#c3a1ff'}}>
     <div className={styles.bundleArt}><img className={styles.bundleBackground} src={product.asset||COLLECTION_BUNDLES.find(item=>item.id===product.id)?.asset} alt="" loading="lazy"/><div className={styles.bundleShade}/>{avatar&&<img className={styles.bundleAvatar} src={avatar.asset} alt="" loading="lazy"/>}<span className={styles.bundleLabel}><Layers3 size={12}/>9 MATCHING STYLES</span></div>
     <div className={styles.bundleInfo}><h3>{product.name}</h3><p>Avatar · Board · Marks · Arena · Frame · Banner · Effect · Emotes · Title</p><div className={styles.bundlePrice}><strong>{price(product)}</strong><span>{complete?'Collection owned':`${count} of ${ids.length||9} owned`}</span></div><button className="button primary" disabled={complete||!data.checkoutEnabled||Boolean(busy)} onClick={()=>payment(product)}>{busy===product.id?<LoaderCircle className="spin" size={15}/>:complete?<Check size={15}/>:<CreditCard size={15}/>} {complete?'Owned':data.checkoutEnabled?'Buy collection':'Checkout opens after setup'}</button><button className={styles.explore} onClick={()=>onCollection?.(theme?.id||product.themeId)}>Explore nine styles <ArrowRight size={13}/></button></div>
    </article>;
   })}</div>}
   {bundles.length>0&&<p className={styles.small}>Swipe to explore all ten worlds. The listed price covers the full collection, including styles you already own.</p>}
   <details className={styles.extras}><summary><Coins size={16}/>Coin packs & season pass<span>More ways to collect</span></summary><div className={styles.products}>{extras.map(product=><article key={product.id}><span className={styles.icon}>{product.coins?<Coins/>:<Sparkles/>}</span><h3>{product.name}</h3><p>{product.coins?product.coins.toLocaleString()+' cosmetic coins':'Five exclusive visual rewards through season XP'}</p><strong>{price(product)}</strong><button className="button secondary" disabled={!data.checkoutEnabled||Boolean(busy)} onClick={()=>payment(product)}>{busy===product.id?<LoaderCircle className="spin" size={16}/>:<CreditCard size={16}/>} {data.checkoutEnabled?'Checkout':'Available after setup'}</button></article>)}</div><p className={styles.small}>The pass can also be unlocked with {data.passCoinPrice} earned coins in Season Journey.</p></details>
  </>}
  {native&&features.rewardedAds&&<div className={styles.ad}><div><h3>Optional cosmetic reward</h3><p>Watch an ad for 25 coins, up to five times a day. Available outside Ranked.</p></div><button className="button secondary" disabled={Boolean(busy)} onClick={watchAd}>{busy==='ad'?<LoaderCircle className="spin" size={16}/>:<Play size={16}/>}Watch rewarded ad</button><button className="text-button" onClick={()=>window.ElementalNative.postMessage(JSON.stringify({type:'privacy'}))}>Ad privacy choices</button></div>}
  {adState&&<p role="status" className={styles.info}>{adState}</p>}
 </section>;
}
