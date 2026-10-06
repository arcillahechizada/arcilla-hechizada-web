// GET/POST /api/paypal-auth
// Devuelve el token seguro para el navegador (browser-safe client token, SDK v6).
import { respuesta, preflight, tokenNavegador } from '../lib/paypal.js';

export async function onRequest(context) {
  const { request, env } = context;
  if (request.method === 'OPTIONS') return preflight(request);
  if (request.method !== 'GET' && request.method !== 'POST') return respuesta(request, 405, { error: 'Método no permitido.' });
  try {
    const t = await tokenNavegador(env);
    return respuesta(request, 200, { accessToken: t, clientToken: t });
  } catch (e) {
    console.error('paypal-auth:', e.message);
    return respuesta(request, 500, { error: 'No se pudo obtener el token de PayPal.', code: e.message });
  }
}
