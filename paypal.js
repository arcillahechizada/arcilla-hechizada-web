// Utilidades compartidas por las funciones de PayPal (Arcilla Hechizada).
// Las credenciales se leen SOLO de las variables de entorno de Netlify.
const PAYPAL_BASE = process.env.PAYPAL_API_BASE || 'https://api-m.paypal.com';
const REPO = 'arcillahechizada/arcilla-hechizada-web';
const RAW = 'https://raw.githubusercontent.com/' + REPO + '/main/';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
};

function respuesta(statusCode, obj) {
  return {
    statusCode,
    headers: Object.assign({ 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }, CORS),
    body: JSON.stringify(obj)
  };
}
function preflight() { return { statusCode: 204, headers: CORS, body: '' }; }

function credenciales() {
  const id = process.env.PAYPAL_CLIENT_ID;
  const secret = process.env.PAYPAL_CLIENT_SECRET;
  if (!id || !secret) throw new Error('missing-credentials');
  return Buffer.from(id + ':' + secret).toString('base64');
}

// Token OAuth normal (solo servidor). No debe salir nunca al navegador.
async function tokenServidor() {
  const r = await fetch(PAYPAL_BASE + '/v1/oauth2/token', {
    method: 'POST',
    headers: { Authorization: 'Basic ' + credenciales(), 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=client_credentials&response_type=token'
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok || !d.access_token) throw new Error('oauth-' + r.status);
  return d.access_token;
}

// Token seguro para el navegador (SDK v6). Es distinto del anterior.
async function tokenNavegador() {
  const r = await fetch(PAYPAL_BASE + '/v1/oauth2/token', {
    method: 'POST',
    headers: { Authorization: 'Basic ' + credenciales(), 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=client_credentials&response_type=client_token&intent=sdk_init'
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok || !d.access_token) throw new Error('client-token-' + r.status);
  return d.access_token;
}

function envio(cp) {
  const s = String(cp || '').replace(/\D/g, '');
  if (!/^\d{5}$/.test(s)) return null;
  return [35, 38, 51, 52].includes(Number(s.slice(0, 2))) ? 7.5 : 6.5;
}

async function getJSON(url, headers) {
  const r = await fetch(url, { headers: headers || {} });
  if (!r.ok) throw new Error('http-' + r.status);
  return r.json();
}

// Lista los .json de una carpeta del repositorio. Primero la API de GitHub;
// si está limitada (muchas peticiones desde la misma IP), usa jsDelivr.
async function listarCarpeta(folder) {
  try {
    const files = await getJSON('https://api.github.com/repos/' + REPO + '/contents/' + folder + '?ref=main', { Accept: 'application/vnd.github+json' });
    return files.filter(f => f.type === 'file' && /\.json$/i.test(f.name)).map(f => RAW + folder + '/' + encodeURIComponent(f.name));
  } catch (e) {
    const d = await getJSON('https://data.jsdelivr.com/v1/packages/gh/' + REPO + '@main?structure=flat');
    return (d.files || []).filter(f => f.name.startsWith('/' + folder + '/') && /\.json$/i.test(f.name)).map(f => RAW + f.name.replace(/^\//, ''));
  }
}

async function cargarCatalogo() {
  const todos = [];
  for (const folder of ['data/productos', 'data/infusiones', 'data/inciensos']) {
    try {
      const urls = await listarCarpeta(folder);
      const datos = await Promise.all(urls.map(u => getJSON(u + '?t=' + Date.now()).catch(() => null)));
      datos.filter(Boolean).forEach(p => todos.push(p));
    } catch (e) { /* carpeta no disponible: se sigue con las demás */ }
  }
  try { const d = await getJSON(RAW + 'data/productos.json?t=' + Date.now()); (d.productos || []).forEach(x => { if (!todos.some(p => p.id === x.id)) todos.push(x); }); } catch (e) {}
  try { const d = await getJSON(RAW + 'data/piezas-unicas.json?t=' + Date.now()); (d.piezas || []).forEach(x => { if (!todos.some(p => p.id === x.id)) todos.push(x); }); } catch (e) {}
  return todos;
}

module.exports = { PAYPAL_BASE, respuesta, preflight, tokenServidor, tokenNavegador, envio, cargarCatalogo };
