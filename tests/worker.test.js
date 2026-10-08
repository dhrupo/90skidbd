import { test } from 'node:test';
import assert from 'node:assert/strict';
import worker from '../worker/index.js';

function jpeg1200() {
  const sof = [0xff, 0xc0, 0x00, 0x11, 0x08, 0x02, 0x76, 0x04, 0xb0, 0x03, ...Array(9).fill(0)];
  return new Uint8Array([0xff, 0xd8, ...sof, 0xff, 0xd9]);
}

function env({ allow = true, failPut = false } = {}) {
  const store = new Map();
  return {
    store,
    CARDS: {
      async put(key, value, opts) {
        if (failPut) throw new Error('KV put() limit exceeded for the day.');
        store.set(key, { value: new Uint8Array(value), opts });
      },
      async get(key) { return store.has(key) ? store.get(key).value.buffer : null; },
    },
    UPLOADS: { async limit() { return { success: allow }; } },
    ASSETS: { async fetch() { return new Response('static'); } },
  };
}

const upload = (e, body = jpeg1200(), type = 'image/jpeg') =>
  worker.fetch(new Request('https://x.test/api/card', { method: 'POST', body, headers: { 'content-type': type, 'cf-connecting-ip': '1.2.3.4' } }), e);

test('a valid card is stored for 7 days and its id comes back', async () => {
  const e = env();
  const res = await upload(e);
  assert.equal(res.status, 201);
  const { id } = await res.json();
  assert.match(id, /^[A-Za-z0-9]{10}$/);
  assert.equal(e.store.get(id).opts.expirationTtl, 604800);
});

test('a stored card is served back as a JPEG, unknown ids are 404', async () => {
  const e = env();
  const { id } = await (await upload(e)).json();
  const res = await worker.fetch(new Request(`https://x.test/c/${id}.jpg`), e);
  assert.equal(res.status, 200);
  assert.equal(res.headers.get('content-type'), 'image/jpeg');
  assert.deepEqual(new Uint8Array(await res.arrayBuffer()), jpeg1200());
  assert.equal((await worker.fetch(new Request('https://x.test/c/AAAAAAAAAA.jpg'), e)).status, 404);
  assert.equal((await worker.fetch(new Request('https://x.test/c/..%2Fetc.jpg'), e)).status, 404);
  assert.equal((await worker.fetch(new Request('https://x.test/c/%E0%A4.jpg'), e)).status, 404);
});

test('bad uploads are refused and nothing is stored', async () => {
  const e = env();
  assert.equal((await upload(e, new Uint8Array([1, 2, 3]))).status, 400);
  assert.equal((await worker.fetch(new Request('https://x.test/api/card'), e)).status, 405);
  assert.equal(e.store.size, 0);
});

test('too many uploads get 429, a full store gets 503', async () => {
  assert.equal((await upload(env({ allow: false }))).status, 429);
  assert.equal((await upload(env({ failPut: true }))).status, 503);
});

test('everything else is served as static files', async () => {
  const res = await worker.fetch(new Request('https://x.test/src/main.js'), env());
  assert.equal(await res.text(), 'static');
});
