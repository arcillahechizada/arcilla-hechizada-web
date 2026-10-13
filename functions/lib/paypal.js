// Utilidades compartidas por las funciones de PayPal (Arcilla Hechizada).
// Versión Cloudflare Pages Functions. Lógica idéntica a la de Netlify;
// solo cambia el "envoltorio" (context.env en vez de process.env, Response en vez de statusCode).
//
// SECRETOS: PAYPAL_CLIENT_ID y PAYPAL_CLIENT_SECRET se leen SOLO de las variables
// de entorno de Cloudflare. Nunca se escriben en este archivo ni en GitHub.

// Orígenes que pueden llamar a estas funciones desde otro dominio (el propio sitio siempre puede).
const ORIGENES_PERMITIDOS = [
  'https://arcillahechizada.com',
  'https://www.arcillahechizada.com',
  'https://arcillahechizada.github.io'
];

export function paypalBase(env) {
  return (env.PAYPAL_API_BASE || 'https://api-m.paypal.com').replace(/\/$/, '');
}

function cabecerasCors(request) {
  const origin = request.headers.get('Origin');
  const propio = new URL(request.url).origin;
  const h = { 'Vary': 'Origin' };
  if (origin && (origin === propio || ORIGENES_PERMITIDOS.includes(origin))) {
    h['Access-Control-Allow-Origin'] = origin;
    h['Access-Control-Allow-Headers'] = 'Content-Type';
    h['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS';
  }
  return h;
}

export function respuesta(request, status, obj) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: Object.assign({ 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }, cabecerasCors(request))
  });
}

export function preflight(request) {
  return new Response(null, { status: 204, headers: cabecerasCors(request) });
}

function credenciales(env) {
  const id = env.PAYPAL_CLIENT_ID;
  const secret = env.PAYPAL_CLIENT_SECRET;
  if (!id || !secret) throw new Error('missing-credentials');
  return btoa(id + ':' + secret);
}

async function pedirToken(env, cuerpo, errorPrefijo) {
  const r = await fetch(paypalBase(env) + '/v1/oauth2/token', {
    method: 'POST',
    headers: { Authorization: 'Basic ' + credenciales(env), 'Content-Type': 'application/x-www-form-urlencoded' },
    body: cuerpo
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok || !d.access_token) throw new Error(errorPrefijo + '-' + r.status);
  return d.access_token;
}

// Token OAuth normal (solo servidor). No debe salir nunca al navegador.
export function tokenServidor(env) {
  return pedirToken(env, 'grant_type=client_credentials&response_type=token', 'oauth');
}

// Dominios para los que se emite el token del navegador (PayPal lo "ata" a ellos, parámetro domains[]).
// Solo se acepta el dominio propio, su www y los *.pages.dev (web de pruebas y previews de Cloudflare).
// Se ata el token SOLO al dominio desde el que se pide (la página lo pide en cada visita), sin listas.
export function dominioParaToken(request, env) {
  let host = '';
  try { host = new URL(request.url).hostname.toLowerCase(); } catch (e) { return ''; }
  const extra = String(env.PAYPAL_DOMAINS || '').split(',').map(x => x.trim().toLowerCase()).filter(Boolean);
  const ok = host === 'arcillahechizada.com' || host === 'www.arcillahechizada.com' ||
    host.endsWith('.pages.dev') || extra.includes(host);
  return ok ? host : '';
}

// Token seguro para el navegador (SDK v6 / Card Fields). Es distinto del anterior.
// Según la documentación de PayPal v6 la petición lleva grant_type, response_type=client_token y domains[].
// Si PayPal rechazase un formato, se prueban los siguientes y, como último recurso, la petición anterior
// (sin domains). Devuelve { token, variante } (variante = qué petición funcionó; no es secreto).
export async function tokenNavegador(env, request) {
  const host = request ? dominioParaToken(request, env) : '';
  const base = () => new URLSearchParams({ grant_type: 'client_credentials', response_type: 'client_token' });
  const intentos = [];
  if (host) {
    intentos.push(['domains-host', () => { const b = base(); b.append('domains[]', host); return b; }]);
    intentos.push(['domains-https', () => { const b = base(); b.append('domains[]', 'https://' + host); return b; }]);
    intentos.push(['domains-host-intent', () => { const b = base(); b.append('intent', 'sdk_init'); b.append('domains[]', host); return b; }]);
  }
  intentos.push(['sin-domains', () => { const b = base(); b.append('intent', 'sdk_init'); return b; }]);
  let ultimo = null;
  for (const [variante, fn] of intentos) {
    try {
      const token = await pedirToken(env, fn().toString(), 'client-token');
      return { token, variante, host };
    } catch (e) {
      ultimo = e;
      if (e.message === 'missing-credentials') throw e;   // reintentar no arregla credenciales ausentes
    }
  }
  throw ultimo || new Error('client-token');
}

// Diagnóstico SIN secretos: nombres de los campos del token y dominios a los que está atado (si el token es un JWT).
export function infoToken(token) {
  const out = { longitud: String(token || '').length, esJwt: false };
  try {
    const partes = String(token).split('.');
    if (partes.length === 3) {
      const b64 = partes[1].replace(/-/g, '+').replace(/_/g, '/');
      const c = JSON.parse(atob(b64 + '='.repeat((4 - b64.length % 4) % 4)));
      out.esJwt = true;
      out.campos = Object.keys(c);
      ['domains', 'aud', 'exp', 'iat'].forEach(k => { if (k in c) out[k] = c[k]; });
    }
  } catch (e) { /* no es un JWT legible: no pasa nada */ }
  return out;
}

// TABLA DE ENVÍO (autoridad final). Debe coincidir con ENVIO_TARIFAS / ENVIO_ZONAS_ES de js/render.js.
// España: la zona sale del prefijo (2 primeras cifras) del código postal. Fuera de España no se calcula envío.
export const ENVIO_TARIFAS = { peninsula: 5.95, baleares: 7.55, canarias: 10.90, ceuta: 7.55, melilla: 7.55 };
const ENVIO_ZONAS_ES = [
  { zona: 'baleares', prefijos: [7] },
  { zona: 'canarias', prefijos: [35, 38] },
  { zona: 'ceuta', prefijos: [51] },
  { zona: 'melilla', prefijos: [52] },
  { zona: 'peninsula', prefijos: [1, 2, 3, 4, 5, 6, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 36, 37, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50] }
];

// Devuelve { tipo: 'es', zona, precio } | { tipo: 'internacional' } | { tipo: 'invalido' }.
// Un código postal inválido (00xxx, 53xxx-99xxx, formato incorrecto) NUNCA cae por defecto en Península.
export function resolverEnvio(pais, cp) {
  const p = String(pais === undefined || pais === null || pais === '' ? 'ES' : pais).trim().toUpperCase();
  if (p !== 'ES') return { tipo: 'internacional' };
  const raw = String(cp === undefined || cp === null ? '' : cp).trim();
  if (!/^\d{5}$/.test(raw)) return { tipo: 'invalido' };
  const z = ENVIO_ZONAS_ES.find(x => x.prefijos.includes(Number(raw.slice(0, 2))));
  return z ? { tipo: 'es', zona: z.zona, precio: ENVIO_TARIFAS[z.zona] } : { tipo: 'invalido' };
}

const esVerdadero = v => v === true || v === 'true';

// Misma regla que sePuedeComprar() del frontend.
export function sePuedeComprar(p) {
  return esVerdadero(p.activarCompra) &&
    !['agotado', 'vendido', 'vendida', 'reservada', 'oculto'].includes(p.estado) &&
    Number.isFinite(Number(p.precio));
}

async function leerJSON(promesa) {
  const r = await promesa;
  if (!r.ok) throw new Error('http-' + r.status);
  return r.json();
}

// Catálogo fiable = data/productos.json (+ data/piezas-unicas.json) DESPLEGADOS con la propia web.
// No depende de GitHub ni de ningún servicio externo: si el fichero no se puede leer, el pedido se rechaza (503)
// en lugar de cobrar con datos dudosos.
export async function cargarCatalogo(context) {
  const { request, env } = context;
  const base = new URL(request.url);
  const propio = ruta => env.ASSETS.fetch(new Request(new URL(ruta, base).toString()));
  const todos = [];
  const anadir = lista => (Array.isArray(lista) ? lista : []).forEach(x => {
    if (x && x.id && !todos.some(p => p.id === x.id)) todos.push(x);
  });

  try { anadir((await leerJSON(propio('/data/productos.json'))).productos); } catch (e) { /* sin catálogo -> 503 en create-order */ }
  try { anadir((await leerJSON(propio('/data/piezas-unicas.json'))).piezas); } catch (e) { /* opcional */ }
  return todos;
}
