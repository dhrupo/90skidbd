import { test } from 'node:test';
import assert from 'node:assert/strict';
import { percent, tier } from '../src/score.js';

test('32 of 48 remembered rounds to 67%', () => {
  assert.equal(percent(32, 48), 67);
  assert.equal(percent(0, 48), 0);
  assert.equal(percent(48, 48), 100);
});

test('each score band gets its title, edges included', () => {
  assert.equal(tier(0), '২০০০-এর পরের বাচ্চা');
  assert.equal(tier(25), '২০০০-এর পরের বাচ্চা');
  assert.equal(tier(26), 'আধা নব্বই, আধা ইউটিউব');
  assert.equal(tier(50), 'আধা নব্বই, আধা ইউটিউব');
  assert.equal(tier(51), 'পাক্কা নব্বইয়ের পোলাপান');
  assert.equal(tier(80), 'পাক্কা নব্বইয়ের পোলাপান');
  assert.equal(tier(81), 'বিটিভির লোগো তুমি নিজেই');
  assert.equal(tier(100), 'বিটিভির লোগো তুমি নিজেই');
});

import { packChallenge, unpackChallenge } from '../src/score.js';

const sample = Array.from({ length: 48 }, (_, i) => i % 3 === 0);

test('a challenge link carries the same 48 ticks and name back', () => {
  const hash = packChallenge(sample, 'রাফি');
  assert.deepEqual(unpackChallenge(hash), { ticks: sample, name: 'রাফি' });
});

test('a challenge without a name unpacks with an empty name', () => {
  assert.deepEqual(unpackChallenge(packChallenge(sample, '')), { ticks: sample, name: '' });
});

test('garbage or missing challenge data means no challenge', () => {
  for (const bad of ['', '#', '#c=', '#c=!!!!', '#c=AAAA', '#foo=bar', '#c=%E0%A4']) {
    assert.equal(unpackChallenge(bad), null, bad);
  }
});

test('the sender name is cut to 20 characters', () => {
  const long = 'অ'.repeat(30);
  assert.equal(unpackChallenge(packChallenge(sample, long)).name, 'অ'.repeat(20));
  const forged = packChallenge(sample, '').replace(/$/, '&n=' + encodeURIComponent('ক'.repeat(50)));
  assert.equal(unpackChallenge(forged).name, 'ক'.repeat(20));
});

import { compare } from '../src/score.js';

test('compare splits memories into both, only me and only them', () => {
  const me = [true, true, false, false];
  const them = [true, false, true, false];
  assert.deepEqual(compare(me, them), { both: [0], onlyMe: [1], onlyThem: [2] });
});
