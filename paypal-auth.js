// Devuelve el token seguro para el navegador (browser-safe client token, SDK v6).
const { respuesta, preflight, tokenNavegador } = require('./lib/paypal');

exports.handler = async function (event) {
  if (event.httpMethod === 'OPTIONS') return preflight();
  if (event.httpMethod !== 'GET' && event.httpMethod !== 'POST') return respuesta(405, { error: 'Método no permitido.' });
  try {
    const t = await tokenNavegador();
    return respuesta(200, { accessToken: t, clientToken: t });
  } catch (e) {
    console.error('paypal-auth:', e.message);
    return respuesta(500, { error: 'No se pudo obtener el token de PayPal.', code: e.message });
  }
};
