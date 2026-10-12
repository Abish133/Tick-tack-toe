import test from 'node:test';
import assert from 'node:assert/strict';
import {loopbackPeer,requestClientIp} from '../src/server/client-ip.mjs';

const request=(peer,headers={})=>({socket:{remoteAddress:peer},headers});

test('direct requests use the socket peer and ignore supplied rate identity headers',()=>{
  assert.equal(requestClientIp(request('192.0.2.10',{'x-arena-ip':'203.0.113.8','cf-connecting-ip':'203.0.113.8','x-forwarded-for':'203.0.113.8'}),'false'),'192.0.2.10');
  assert.equal(requestClientIp(request('127.0.0.1',{'x-arena-ip':'203.0.113.8','cf-connecting-ip':'203.0.113.8'}),'false'),'127.0.0.1');
});

test('Cloudflare mode trusts one valid connecting IP only from loopback',()=>{
  assert.equal(requestClientIp(request('127.0.0.1',{'cf-connecting-ip':'203.0.113.8','x-forwarded-for':'198.51.100.9'}),'cloudflare'),'203.0.113.8');
  assert.equal(requestClientIp(request('::1',{'cf-connecting-ip':'2001:DB8::9'}),'cloudflare'),'2001:db8::9');
  assert.equal(requestClientIp(request('::ffff:127.0.0.1',{'cf-connecting-ip':'203.0.113.8'}),'cloudflare'),'203.0.113.8');
  assert.equal(requestClientIp(request('192.0.2.10',{'cf-connecting-ip':'203.0.113.8'}),'cloudflare'),'192.0.2.10');
});

test('invalid, multiple and missing Cloudflare identities fall back to the peer',()=>{
  for(const value of [undefined,'','invalid','203.0.113.8, 198.51.100.9','999.1.1.1','fe80::1%eth0','a'.repeat(1000),['203.0.113.8']]){
    assert.equal(requestClientIp(request('127.0.0.1',{'cf-connecting-ip':value,'x-forwarded-for':'203.0.113.8'}),'cloudflare'),'127.0.0.1');
  }
});

test('local generic proxy mode validates a bounded first forwarded address',()=>{
  assert.equal(requestClientIp(request('127.0.0.1',{'x-forwarded-for':'203.0.113.8, 127.0.0.1'}),'true'),'203.0.113.8');
  assert.equal(requestClientIp(request('192.0.2.10',{'x-forwarded-for':'203.0.113.8'}),'true'),'192.0.2.10');
  for(const value of ['invalid, 203.0.113.8','a'.repeat(513),['203.0.113.8']])assert.equal(requestClientIp(request('::1',{'x-forwarded-for':value}),'true'),'::1');
});

test('loopback detection accepts mapped addresses and rejects external or malformed peers',()=>{
  for(const ip of ['127.0.0.1','127.255.1.1','::1','::ffff:127.0.0.1'])assert.equal(loopbackPeer(ip),true);
  for(const ip of ['128.0.0.1','192.168.1.1','::ffff:192.0.2.10','::2','localhost','127.0.0.1.evil',null])assert.equal(loopbackPeer(ip),false);
  assert.equal(requestClientIp({headers:{'cf-connecting-ip':'203.0.113.8'}},'cloudflare'),'unknown');
});
