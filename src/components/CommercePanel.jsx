'use client';
import {useEffect,useRef,useState} from 'react';
import {Coins,ShieldCheck,Sparkles,Play,LoaderCircle,CreditCard} from 'lucide-react';
import styles from './CommercePanel.module.css';

let checkoutScript;
function loadCheckout(){
 if(window.Razorpay)return Promise.resolve();
 if(!checkoutScript)checkoutScript=new Promise((resolve,reject)=>{
  const script=document.createElement('script');script.src='https://checkout.razorpay.com/v1/checkout.js';script.async=true;
  script.onload=()=>window.Razorpay?resolve():reject(new Error('Checkout could not load.'));
  script.onerror=()=>{checkoutScript=null;reject(new Error('Payment checkout is unavailable. Please retry.'));};
  document.head.appendChild(script);
 });
 return checkoutScript;
}
const price=p=>new Intl.NumberFormat('en-IN',{style:'currency',currency:p.currency}).format(p.amount/100);
export default function CommercePanel({api,user,features,refresh,onError,onNotice,onRegister}){
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
  setBusy(product.id);
  try{
   await loadCheckout();
   const order=await api('/commerce/orders','POST',{sku:product.id,requestId:crypto.randomUUID()});
   await new Promise((resolve,reject)=>{
    let settled=false;const finish=fn=>value=>{if(!settled){settled=true;fn(value);}};
    const popup=new window.Razorpay({key:order.keyId,order_id:order.providerOrderId,amount:order.amount,currency:order.currency,name:order.name,description:order.description,prefill:{name:user.name,email:user.email},theme:{color:'#8966ff'},
     handler:async result=>{
      try{await api('/commerce/verify','POST',{orderId:order.orderId,...result});await refresh();onNotice('Payment captured. Your cosmetic purchase is ready.');finish(resolve)();}
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
 return <section className={styles.panel} aria-label="Cosmetic purchases and optional rewards">
  <div className={styles.heading}><div><span className="badge gold">YOUR STYLE, YOUR CHOICE</span><h2>Cosmetic extras</h2><p>Coins unlock visual styles. Every player has the same 22 powers.</p></div><ShieldCheck size={34}/></div>
  {!data?<p>Loading cosmetic products…</p>:<>
   {!data.checkoutEnabled&&<p className={styles.info}>Cash checkout opens when the owner configures Razorpay. Earned coins and the season pass work now.</p>}
   <div className={styles.products}>{data.products.map(product=><article key={product.id}><span className={styles.icon}>{product.coins?<Coins/>:<Sparkles/>}</span><h3>{product.name}</h3><p>{product.coins?product.coins.toLocaleString()+' cosmetic coins':'Five exclusive visual rewards through season XP'}</p><strong>{price(product)}</strong><button className="button secondary" disabled={!data.checkoutEnabled||Boolean(busy)} onClick={()=>payment(product)}>{busy===product.id?<LoaderCircle className="spin" size={16}/>:<CreditCard size={16}/>} {data.checkoutEnabled?'Checkout':'Available after setup'}</button></article>)}</div>
   <p className={styles.small}>The pass can also be unlocked with {data.passCoinPrice} earned coins in Season Journey.</p>
  </>}
  {native&&features.rewardedAds&&<div className={styles.ad}><div><h3>Optional cosmetic reward</h3><p>Watch an ad for 25 coins, up to five times a day. Available outside Ranked.</p></div><button className="button secondary" disabled={Boolean(busy)} onClick={watchAd}>{busy==='ad'?<LoaderCircle className="spin" size={16}/>:<Play size={16}/>}Watch rewarded ad</button><button className="text-button" onClick={()=>window.ElementalNative.postMessage(JSON.stringify({type:'privacy'}))}>Ad privacy choices</button></div>}
  {adState&&<p role="status" className={styles.info}>{adState}</p>}
 </section>;
}
