import { ID_RE, isValidCard, newId } from './card.js';

const WEEK = 7 * 24 * 60 * 60;

async function upload(request, env) {
  if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 });
  const { success } = await env.UPLOADS.limit({ key: request.headers.get('cf-connecting-ip') || 'unknown' });
  if (!success) return new Response('Too many uploads', { status: 429 });
  const bytes = new Uint8Array(await request.arrayBuffer());
  if (!isValidCard(bytes)) return new Response('Not a score card', { status: 400 });
  const id = newId();
  try {
    await env.CARDS.put(id, bytes, { expirationTtl: WEEK });
  } catch {
    return new Response('Storage unavailable', { status: 503 });
  }
  return Response.json({ id }, { status: 201 });
}

async function card(id, env) {
  const data = ID_RE.test(id) ? await env.CARDS.get(id, 'arrayBuffer') : null;
  if (!data) return new Response('Not found', { status: 404 });
  return new Response(data, { headers: { 'content-type': 'image/jpeg', 'cache-control': `public, max-age=${WEEK}, immutable` } });
}

async function page(request, env, id) {
  const res = await env.ASSETS.fetch(request);
  if (!ID_RE.test(id) || !(await env.CARDS.get(id, 'arrayBuffer'))) return res;
  const { origin } = new URL(request.url);
  const image = `${origin}/c/${id}.jpg`;
  return new HTMLRewriter()
    .on('meta[property="og:image"]', { element: (el) => el.setAttribute('content', image) })
    .on('meta[property="og:url"]', { element: (el) => el.setAttribute('content', `${origin}/?s=${id}`) })
    .on('head', { element: (el) => el.append(`<meta name="twitter:image" content="${image}">`, { html: true }) })
    .transform(res);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/api/card') return upload(request, env);
    const match = url.pathname.match(/^\/c\/([^/]+)\.jpg$/);
    if (match) return card(match[1], env);
    if ((url.pathname === '/' || url.pathname === '/index.html') && url.searchParams.has('s')) return page(request, env, url.searchParams.get('s'));
    return env.ASSETS.fetch(request);
  },
};
