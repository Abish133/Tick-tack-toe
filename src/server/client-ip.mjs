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
export function requestClientIp(request,proxyMode=process.env.TRUST_PROXY){
  const peer=address(request.socket?.remoteAddress)||'unknown';
  if(!loopbackPeer(peer))return peer;
  if(proxyMode==='cloudflare')return address(request.headers?.['cf-connecting-ip'])||peer;
  if(proxyMode==='true'){
    const chain=request.headers?.['x-forwarded-for'];
    if(typeof chain==='string'&&chain.length<=512)return address(chain.split(',')[0])||peer;
  }
  return peer;
}
