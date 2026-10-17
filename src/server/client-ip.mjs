import {isIP} from 'node:net';

function address(value){
  if(typeof value!=='string'||value.length>45)return null;
  const ip=value.trim();
  if(ip.includes('%')||!isIP(ip))return null;
  return ip.toLowerCase().startsWith('::ffff:')&&isIP(ip.slice(7))===4?ip.slice(7):ip.toLowerCase();
}

export function loopbackPeer(value){
  const ip=address(value);
  return ip==='::1'||Boolean(ip&&isIP(ip)===4&&ip.split('.')[0]==='127');
}

// Forwarded identity is accepted only from the local proxy process. The browser's
// own x-arena-ip header is never an input, and Cloudflare mode ignores XFF chains.
// Railway's ingress reaches the container from its private network. Without this
// every player would share the proxy's address, and so one rate-limit bucket.
export function privatePeer(value){
  const ip=address(value);
  if(!ip)return false;
  if(isIP(ip)===6)return /^f[cd][0-9a-f]{2}:/.test(ip);
  const [a,b]=ip.split('.').map(Number);
  return a===10||(a===172&&b>=16&&b<=31)||(a===192&&b===168)||(a===100&&b>=64&&b<=127);
}

export const defaultProxyMode=()=>process.env.TRUST_PROXY||(process.env.RAILWAY_ENVIRONMENT_ID?'railway':undefined);

export function requestClientIp(request,proxyMode=defaultProxyMode()){
  const peer=address(request.socket?.remoteAddress)||'unknown';
  if(proxyMode==='railway'&&(loopbackPeer(peer)||privatePeer(peer))){
    // The edge appends the client it saw, so only the last hop is trusted;
    // anything a browser supplied comes before it.
    const chain=request.headers?.['x-forwarded-for'];
    if(typeof chain==='string'&&chain.length<=512)return address(chain.split(',').at(-1))||peer;
    return peer;
  }
  if(!loopbackPeer(peer))return peer;
  if(proxyMode==='cloudflare')return address(request.headers?.['cf-connecting-ip'])||peer;
  if(proxyMode==='true'){
    const chain=request.headers?.['x-forwarded-for'];
    if(typeof chain==='string'&&chain.length<=512)return address(chain.split(',')[0])||peer;
  }
  return peer;
}
