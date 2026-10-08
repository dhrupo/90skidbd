import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isValidCard, newId, ID_RE } from '../worker/card.js';

function jpeg(width, height, marker = 0xc0, pad = 0) {
  const sof = [0xff, marker, 0x00, 0x11, 0x08, height >> 8, height & 255, width >> 8, width & 255, 0x03, ...Array(9).fill(0)];
  const app0 = [0xff, 0xe0, 0x00, 0x10, ...Array(14).fill(0)];
  return new Uint8Array([0xff, 0xd8, ...app0, ...sof, ...Array(pad).fill(0), 0xff, 0xd9]);
}

test('a 1200x630 JPEG under 300KB is a valid card', () => {
  assert.equal(isValidCard(jpeg(1200, 630)), true);
  assert.equal(isValidCard(jpeg(1200, 630, 0xc2)), true);
});

test('wrong sizes, other formats, garbage and huge files are rejected', () => {
  assert.equal(isValidCard(jpeg(1080, 1350)), false);
  assert.equal(isValidCard(jpeg(1200, 631)), false);
  assert.equal(isValidCard(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])), false);
  assert.equal(isValidCard(new Uint8Array([1, 2, 3])), false);
  assert.equal(isValidCard(new Uint8Array(0)), false);
  assert.equal(isValidCard(jpeg(1200, 630, 0xc0, 300 * 1024)), false);
});

test('ids are 10 URL-safe characters and different each time', () => {
  const a = newId();
  const b = newId();
  assert.match(a, ID_RE);
  assert.match(b, ID_RE);
  assert.notEqual(a, b);
  assert.equal(ID_RE.test('../../etc'), false);
  assert.equal(ID_RE.test('abc'), false);
});
