// GET/POST /api/paypal-auth
// Devuelve el token seguro para el navegador (browser-safe client token, SDK v6), atado al dominio desde el que se pide.
// /api/paypal-auth?diag=1 devuelve solo información de diagnóstico SIN el token ni secretos.
import { respuesta, preflight, tokenNavegador, infoToken } from '../lib/paypal.js';

export async function onRequest(context) {
  const { request, env } = context;
  if (request.method === 'OPTIONS') return preflight(request);
  if (request.method !== 'GET' && request.method !== 'POST') return respuesta(request, 405, { error: 'Método no permitido.' });
  try {
    const { token, variante, host } = await tokenNavegador(env, request);
    if (new URL(request.url).searchParams.get('diag') === '1') {
      return respuesta(request, 200, { diagnostico: true, host, variante, token: infoToken(token) });
    }
    return respuesta(request, 200, { accessToken: token, clientToken: token });
  } catch (e) {
    console.error('paypal-auth:', e.message);
    return respuesta(request, 500, { error: 'No se pudo obtener el token de PayPal.', code: e.message });
  }
}
