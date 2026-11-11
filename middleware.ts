/**
 * Porte d'entrée de la version en ligne (Vercel) : sans le code d'accès, rien du jeu n'est servi.
 *
 * Trois façons d'entrer, toutes réglées dans Vercel (variables d'environnement), jamais dans le dépôt :
 *  - ENTRY_HASH : empreinte SHA-256 du jeton d'un lien d'entrée secret (/entrer/<jeton>, donné en QR code).
 *    Ouvrir ce lien une fois autorise l'appareil pendant un an ; le jeu s'installe ensuite sur l'écran d'accueil ;
 *  - APP_KEY_HASH : empreinte SHA-256 de la clé secrète que l'APK de test envoie tout seul (rien à taper sur le
 *    téléphone). La clé elle-même n'existe que dans les secrets GitHub (BD_APP_KEY), Vercel n'en a que l'empreinte ;
 *  - ACCESS_CODE (facultatif) : code à taper pour entrer depuis un navigateur, mémorisé un an par un cookie.
 * Tant que ces variables sont vides, le site reste fermé à tout le monde. Changer ENTRY_HASH annule les accès donnés.
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

/** Fichiers sans secret, laissés ouverts pour que le téléphone puisse installer le jeu sur l'écran d'accueil. */
const PUBLIC = new Set(['/manifest.webmanifest', '/icon-192.png', '/icon-512.png']);

export default async function middleware(request: Request): Promise<Response> {
  const headers = { 'content-type': 'text/html; charset=utf-8', 'x-robots-tag': 'noindex, nofollow', 'cache-control': 'no-store' };
  const next = () => new Response(null, { headers: { 'x-middleware-next': '1' } });
  const url = new URL(request.url);
  if (PUBLIC.has(url.pathname)) return next();

  const code = (process.env.ACCESS_CODE ?? '').trim();
  const keyHash = (process.env.APP_KEY_HASH ?? '').trim().toLowerCase();
  const entryHash = (process.env.ENTRY_HASH ?? '').trim().toLowerCase();
  if (!code && !keyHash && !entryHash) return new Response(page('Le jeu est fermé pour le moment.', false), { status: 503, headers });

  // 1) L'appli de test se présente toute seule avec sa clé secrète (ajoutée à son « user-agent ») : rien à taper.
  //    Vercel ne connaît que l'empreinte de la clé : on compare l'empreinte de ce que l'appli présente.
  const shown = /BistroDonjonApp\/([A-Za-z0-9_-]{16,})/.exec(request.headers.get('user-agent') ?? '')?.[1];
  if (keyHash && shown && (await sha256(shown)) === keyHash) return next();

  // 2) Appareil déjà autorisé (lien d'entrée ouvert, ou code tapé) : un cookie d'un an le reconnaît.
  const codeCookie = code ? await sha256('bistro-donjon:' + code) : '';
  const entryCookie = entryHash ? await sha256('bistro-donjon:lien:' + entryHash) : '';
  const cookies = (request.headers.get('cookie') ?? '').split(/;\s*/);
  if ((codeCookie && cookies.includes(`${COOKIE}=${codeCookie}`)) || (entryCookie && cookies.includes(`${COOKIE}=${entryCookie}`))) return next();
  const allow = (value: string) =>
    new Response(null, {
      status: 303,
      headers: { location: '/', 'referrer-policy': 'no-referrer', 'set-cookie': `${COOKIE}=${value}; Path=/; Max-Age=31536000; HttpOnly; Secure; SameSite=Lax` },
    });

  // 3) Lien d'entrée secret (QR code) : /entrer/<jeton>. Vercel ne connaît que l'empreinte du jeton.
  //    Tolérant : le jeton est en minuscules et chiffres ; on accepte des majuscules (certaines applis en mettent)
  //    et on ignore ce qui traîne après (point, espace ajouté par une messagerie).
  const entry = /^\/entrer\/([A-Za-z0-9]{16,})/.exec(url.pathname)?.[1]?.toLowerCase();
  if (entry) {
    if (entryHash && (await sha256(entry)) === entryHash) return allow(entryCookie);
    await new Promise((resolve) => setTimeout(resolve, 1500)); // ralentit ceux qui essaient des liens au hasard
    return new Response(page('Ce lien n’est plus valable.', false), { status: 403, headers });
  }
  if (!code) return new Response(page('Version de test privée.', false), { status: 403, headers });

  // 4) Code à taper (facultatif)
  if (request.method === 'POST' && url.pathname === '/__acces') {
    const given = String((await request.formData()).get('code') ?? '').trim();
    if (given === code) return allow(codeCookie);
    await new Promise((resolve) => setTimeout(resolve, 1500)); // ralentit ceux qui essaient des codes au hasard
    return new Response(page('Code incorrect. Réessaie.', true), { status: 401, headers });
  }
  return new Response(page('Version de test privée. Entre le code d’accès.', true), { status: 401, headers });
}
