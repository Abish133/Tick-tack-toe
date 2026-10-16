import test from 'node:test';
import assert from 'node:assert/strict';
import {friendlyError} from '../src/lib/friendly-errors.js';
import {formatCountdown} from '../src/lib/time-format.js';
import {displayName} from '../src/lib/display-name.js';

const raw='That entry already exists or this action was already processed.';
test('duplicate claims read as friendly game copy',()=>{
  assert.equal(friendlyError('/rewards/daily','CONFLICT',raw),'Already claimed — come back tomorrow!');
  assert.equal(friendlyError('/missions/claim','CONFLICT',raw),'Already claimed — nice work!');
  assert.equal(friendlyError('/season-pass/claim','CONFLICT',raw),'Already claimed — nice work!');
  assert.equal(friendlyError('/shop','RATE_LIMITED','Too many requests.'),'Easy, challenger — try again in a moment.');
  assert.equal(friendlyError('/profile','VALIDATION','Choose another name.'),'Choose another name.');
});
test('countdowns are short and human',()=>{
  assert.equal(formatCountdown((2*86400+14*3600)*1000),'2d 14h');
  assert.equal(formatCountdown((18*3600+44*60)*1000),'18h 44m');
  assert.equal(formatCountdown(12*60*1000),'12m');
  assert.equal(formatCountdown(-5),'0s');
});
test('guest names become short tags',()=>{
  assert.equal(displayName('Spark 252666a13ca0'),'Spark #2526');
  assert.equal(displayName('Real Player'),'Real Player');
});
