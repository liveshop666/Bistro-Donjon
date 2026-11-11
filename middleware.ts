/**
 * Porte d'entrée de la version en ligne (Vercel) : sans le code d'accès, rien du jeu n'est servi.
 *
 * Le code n'est PAS dans le dépôt : il se règle dans Vercel (variable d'environnement ACCESS_CODE).
 * Tant que cette variable est vide, le site reste fermé à tout le monde.
 * Une fois le bon code entré, un cookie d'un an évite de le redemander sur cet appareil.
 * Ce fichier n'est utilisé que par Vercel : il ne fait pas partie du jeu ni de l'APK du Play Store.
 */
declare const process: { env: Record<string, string | undefined> };

export const config = { matcher: '/:path*' };

const COOKIE = 'bd_acces';

async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

function page(message: string, withForm: boolean): string {
  const form = withForm
    ? `<form method="post" action="/__acces">
        <input name="code" type="password" inputmode="text" autocomplete="off" autofocus placeholder="Code d'accès" required>
        <button type="submit">ENTRER</button>
      </form>`
    : '';
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow"><title>Bistro Donjon</title>
<style>
  body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#0c0c18;color:#fff;font-family:monospace;text-align:center}
  main{padding:24px;max-width:320px}
  h1{color:#ffc533;font-size:28px;letter-spacing:2px;margin:0 0 16px}
  p{color:#bfc8e0;font-size:14px;line-height:1.5}
  input,button{box-sizing:border-box;width:100%;padding:14px;margin-top:12px;font:inherit;font-size:16px;border:2px solid #3b2414;border-radius:0}
  input{background:#24243a;color:#fff;text-align:center}
  button{background:#e8642a;color:#fff;font-weight:bold}
</style></head><body><main>
<h1>BISTRO DONJON</h1><p>${message}</p>${form}
</main></body></html>`;
}

export default async function middleware(request: Request): Promise<Response> {
  const headers = { 'content-type': 'text/html; charset=utf-8', 'x-robots-tag': 'noindex, nofollow', 'cache-control': 'no-store' };
  const code = (process.env.ACCESS_CODE ?? '').trim();
  if (!code) return new Response(page('Le jeu est fermé pour le moment.', false), { status: 503, headers });

  const token = await sha256('bistro-donjon:' + code);
  const cookies = (request.headers.get('cookie') ?? '').split(/;\s*/);
  if (cookies.includes(`${COOKIE}=${token}`)) return new Response(null, { headers: { 'x-middleware-next': '1' } });

  const url = new URL(request.url);
  if (request.method === 'POST' && url.pathname === '/__acces') {
    const given = String((await request.formData()).get('code') ?? '').trim();
    if (given === code) {
      return new Response(null, {
        status: 303,
        headers: { location: '/', 'set-cookie': `${COOKIE}=${token}; Path=/; Max-Age=31536000; HttpOnly; Secure; SameSite=Lax` },
      });
    }
    await new Promise((resolve) => setTimeout(resolve, 1500)); // ralentit ceux qui essaient des codes au hasard
    return new Response(page('Code incorrect. Réessaie.', true), { status: 401, headers });
  }
  return new Response(page('Version de test privée. Entre le code d’accès.', true), { status: 401, headers });
}
