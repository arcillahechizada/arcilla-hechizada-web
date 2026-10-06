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

// Token seguro para el navegador (SDK v6 / Card Fields). Es distinto del anterior.
export function tokenNavegador(env) {
  return pedirToken(env, 'grant_type=client_credentials&response_type=client_token&intent=sdk_init', 'client-token');
}

// Mismos gastos de envío que js/render.js (calcularEnvio): 7,50 € Baleares, Canarias, Ceuta y Melilla; 6,50 € resto.
export function envio(cp) {
  const s = String(cp || '').replace(/\D/g, '');
  if (!/^\d{5}$/.test(s)) return null;
  return [35, 38, 51, 52].includes(Number(s.slice(0, 2))) ? 7.5 : 6.5;
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
