import { ID_RE, MAX_BYTES, isValidCard, newId } from './card.js';

const WEEK = 7 * 24 * 60 * 60;

async function readCard(id, env) {
  if (!ID_RE.test(id)) return null;
  try {
    return await env.CARDS.get(id, 'arrayBuffer');
  } catch {
    return null;
  }
}

async function upload(request, env) {
  if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 });
  if (request.headers.get('content-type') !== 'image/jpeg') return new Response('JPEG only', { status: 415 });
  const site = request.headers.get('sec-fetch-site');
  if (site && site !== 'same-origin') return new Response('Forbidden', { status: 403 });
  if (Number(request.headers.get('content-length')) > MAX_BYTES) return new Response('Too large', { status: 413 });
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
  const data = await readCard(id, env);
  if (!data) return new Response('Not found', { status: 404 });
  return new Response(data, {
    headers: { 'content-type': 'image/jpeg', 'cache-control': `public, max-age=${WEEK}`, 'x-content-type-options': 'nosniff' },
  });
}

async function page(request, env, id) {
  const { origin } = new URL(request.url);
  const res = await env.ASSETS.fetch(new Request(`${origin}/`, request));
  if (!(await readCard(id, env))) return res;
  const image = `${origin}/c/${id}.jpg`;
  return new HTMLRewriter()
    .on('meta[property="og:image"]', { element: (el) => el.setAttribute('content', image) })
    .on('meta[property="og:url"]', { element: (el) => el.setAttribute('content', `${origin}/s/${id}`) })
    .on('head', { element: (el) => el.append(`<meta name="twitter:image" content="${image}">`, { html: true }) })
    .transform(res);
}

export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url);
    if (pathname === '/api/card') return upload(request, env);
    const cardMatch = pathname.match(/^\/c\/([^/]+)\.jpg$/);
    if (cardMatch) return card(cardMatch[1], env);
    const pageMatch = pathname.match(/^\/s\/([^/]+)$/);
    if (pageMatch) return page(request, env, pageMatch[1]);
    return env.ASSETS.fetch(request);
  },
};
