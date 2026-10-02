// Captura el pago de un pedido ya aprobado por el comprador.
const { PAYPAL_BASE, respuesta, preflight, tokenServidor } = require('./lib/paypal');

exports.handler = async function (event) {
  if (event.httpMethod === 'OPTIONS') return preflight();
  if (event.httpMethod !== 'POST') return respuesta(405, { error: 'Método no permitido.' });
  try {
    let orderID = (event.queryStringParameters || {}).orderId || (event.queryStringParameters || {}).orderID;
    try { const b = JSON.parse(event.body || '{}'); orderID = orderID || b.orderID || b.orderId; } catch (e) {}
    if (!orderID || !/^[A-Za-z0-9_-]{5,64}$/.test(String(orderID))) return respuesta(400, { error: 'Falta el identificador del pedido.' });

    const token = await tokenServidor();
    const r = await fetch(PAYPAL_BASE + '/v2/checkout/orders/' + encodeURIComponent(orderID) + '/capture', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json', 'PayPal-Request-Id': 'cap-' + orderID }
    });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) {
      console.error('capture PayPal', r.status, JSON.stringify(d).slice(0, 500));
      return respuesta(r.status >= 500 ? 502 : 400, { error: 'PayPal no ha podido capturar el pago.', detalle: d.name || r.status, status: d.status });
    }
    return respuesta(200, { status: d.status, id: d.id });
  } catch (e) {
    console.error('paypal-capture-order:', e.message);
    return respuesta(500, { error: 'No se pudo capturar el pago.', code: e.message });
  }
};
