import { test } from 'node:test';
import assert from 'node:assert/strict';
import worker from '../worker/index.js';

function jpeg1200() {
  const sof = [0xff, 0xc0, 0x00, 0x11, 0x08, 0x02, 0x76, 0x04, 0xb0, 0x03, ...Array(9).fill(0)];
  return new Uint8Array([0xff, 0xd8, ...sof, 0xff, 0xd9]);
}

function env({ allow = true, failPut = false, failGet = false } = {}) {
  const store = new Map();
  return {
    store,
    CARDS: {
      async put(key, value, opts) {
        if (failPut) throw new Error('KV put() limit exceeded for the day.');
        store.set(key, { value: new Uint8Array(value), opts });
      },
      async get(key) {
        if (failGet) throw new Error('KV get() limit exceeded for the day.');
        return store.has(key) ? store.get(key).value.buffer : null;
      },
    },
    UPLOADS: { async limit() { return { success: allow }; } },
    ASSETS: { async fetch() { return new Response('static'); } },
  };
}

const upload = (e, body = jpeg1200(), type = 'image/jpeg', extra = {}) =>
  worker.fetch(new Request('https://x.test/api/card', { method: 'POST', body, headers: { 'content-type': type, 'cf-connecting-ip': '1.2.3.4', 'sec-fetch-site': 'same-origin', ...extra } }), e);

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

test('card pictures are cached for a week but not as immutable, and are never sniffed', async () => {
  const e = env();
  const { id } = await (await upload(e)).json();
  const res = await worker.fetch(new Request(`https://x.test/c/${id}.jpg`), e);
  assert.equal(res.headers.get('cache-control'), 'public, max-age=604800');
  assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
});

test('uploads must be JPEG and must come from our own page', async () => {
  const e = env();
  assert.equal((await upload(e, jpeg1200(), 'text/plain')).status, 415);
  assert.equal((await upload(e, jpeg1200(), 'image/jpeg', { 'sec-fetch-site': 'cross-site' })).status, 403);
  assert.equal((await upload(e, jpeg1200(), 'image/jpeg', { 'sec-fetch-site': 'same-site' })).status, 403);
  assert.equal(e.store.size, 0);
});

test('an oversized upload is refused before it is read', async () => {
  const e = env();
  const res = await upload(e, jpeg1200(), 'image/jpeg', { 'content-length': String(400 * 1024) });
  assert.equal(res.status, 413);
});

test('when storage reads fail, card links fall back instead of erroring', async () => {
  const e = env({ failGet: true });
  assert.equal((await worker.fetch(new Request('https://x.test/c/AAAAAAAAAA.jpg'), e)).status, 404);
  const page = await worker.fetch(new Request('https://x.test/s/AAAAAAAAAA'), e);
  assert.equal(page.status, 200);
  assert.equal(await page.text(), 'static');
});

test('the homepage is not handled by the Worker, personal links live under /s/', async () => {
  const e = env();
  const { id } = await (await upload(e)).json();
  const seen = [];
  e.ASSETS.fetch = async (req) => { seen.push(new URL(req.url).pathname); return new Response('static'); };
  await worker.fetch(new Request(`https://x.test/?s=${id}`), e);
  await worker.fetch(new Request('https://x.test/s/AAAAAAAAAA'), e);
  assert.deepEqual(seen, ['/', '/']);
});
