import test from 'node:test';
import assert from 'node:assert/strict';
import {pingLabel,pingQuality} from '../src/lib/ping.js';

test('ping readouts share one quality scale',()=>{
  assert.deepEqual([0,79,80,149,150,249,250,900].map(ms=>pingQuality(ms)),['good','good','fair','fair','slow','slow','poor','poor']);
  assert.equal(pingQuality(null),'measuring');
  assert.equal(pingQuality(40,false),'offline');
  assert.equal(pingLabel(42),'42 ms');assert.equal(pingLabel(null),'-- ms');assert.equal(pingLabel(42,false),'Offline');
});
