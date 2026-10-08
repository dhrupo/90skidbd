import { test } from 'node:test';
import assert from 'node:assert/strict';
import { percent, tier, TIERS } from '../src/score.js';

test('32 of 48 remembered rounds to 67%', () => {
  assert.equal(percent(32, 48), 67);
  assert.equal(percent(0, 48), 0);
  assert.equal(percent(48, 48), 100);
});

test('scores follow the SSC grade scale, edges included', () => {
  const cases = [[0, 'F'], [32, 'F'], [33, 'D'], [39, 'D'], [40, 'C'], [49, 'C'], [50, 'B'], [59, 'B'],
    [60, 'A-'], [69, 'A-'], [70, 'A'], [79, 'A'], [80, 'A+'], [100, 'A+']];
  for (const [pct, grade] of cases) assert.equal(tier(pct).grade, grade, `${pct}%`);
  assert.equal(new Set(TIERS.map((t) => t.title)).size, 7);
});

import { packChallenge, unpackChallenge } from '../src/score.js';

const sample = Array.from({ length: 60 }, (_, i) => i % 3 === 0);

test('a challenge link carries the same 60 ticks and name back in 11 characters', () => {
  const hash = packChallenge(sample, 'রাফি');
  assert.equal(new URLSearchParams(hash.slice(1)).get('c').length, 11);
  assert.deepEqual(unpackChallenge(hash, 60), { ticks: sample, name: 'রাফি' });
});

test('a challenge without a name unpacks with an empty name', () => {
  assert.deepEqual(unpackChallenge(packChallenge(sample, ''), 60), { ticks: sample, name: '' });
});

test('garbage or missing challenge data means no challenge', () => {
  for (const bad of ['', '#', '#c=', '#c=!!!!', '#c=AAAA', '#foo=bar', '#c=%E0%A4']) {
    assert.equal(unpackChallenge(bad, 60), null, bad);
  }
});

test('the sender name is cut to 20 characters', () => {
  const long = 'অ'.repeat(30);
  assert.equal(unpackChallenge(packChallenge(sample, long), 60).name, 'অ'.repeat(20));
  const forged = packChallenge(sample, '').replace(/$/, '&n=' + encodeURIComponent('ক'.repeat(50)));
  assert.equal(unpackChallenge(forged, 60).name, 'ক'.repeat(20));
});

import { compare } from '../src/score.js';

test('compare splits memories into both-remember and only-them', () => {
  const me = [true, true, false, false];
  const them = [true, false, true, false];
  assert.deepEqual(compare(me, them), { both: [0], onlyThem: [2] });
});

import { bn } from '../src/score.js';

test('numbers are written in Bangla digits', () => {
  assert.equal(bn(0), '০');
  assert.equal(bn(48), '৪৮');
  assert.equal(bn('৩২/48'), '৩২/৪৮');
});

test('a link made with 60 items still works after items are added', () => {
  const old = packChallenge(sample, 'রাফি');
  const now = unpackChallenge(old, 68);
  assert.deepEqual(now.ticks, [...sample, ...Array(8).fill(false)]);
  assert.equal(now.name, 'রাফি');
});

test('a link longer than today\'s list is rejected', () => {
  assert.equal(unpackChallenge(packChallenge(Array(68).fill(true), ''), 60), null);
});

test('a link shorter than the launch list is rejected', () => {
  assert.equal(unpackChallenge(packChallenge(Array(48).fill(true), ''), 60), null);
});

test('hidden direction-flipping characters are stripped from names', () => {
  assert.equal(unpackChallenge(packChallenge(sample, 'রা‮ফি⁦'), 60).name, 'রাফি');
});
