// POST /api/paypal-capture-order
// Captura el pago de un pedido ya aprobado por el comprador.
import { paypalBase, respuesta, preflight, tokenServidor } from '../lib/paypal.js';

export async function onRequest(context) {
  const { request, env } = context;
  if (request.method === 'OPTIONS') return preflight(request);
  if (request.method !== 'POST') return respuesta(request, 405, { error: 'Método no permitido.' });
  try {
    const url = new URL(request.url);
    let orderID = url.searchParams.get('orderId') || url.searchParams.get('orderID');
    try { const b = await request.json(); orderID = orderID || b.orderID || b.orderId; } catch (e) { /* sin cuerpo */ }
    if (!orderID || !/^[A-Za-z0-9_-]{5,64}$/.test(String(orderID))) return respuesta(request, 400, { error: 'Falta el identificador del pedido.' });

    const base = paypalBase(env);
    const token = await tokenServidor(env);
    const r = await fetch(base + '/v2/checkout/orders/' + encodeURIComponent(orderID) + '/capture', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json', 'PayPal-Request-Id': 'cap-' + orderID }
    });
    const d = await r.json().catch(() => ({}));

    // Evita duplicados: si el pedido YA estaba capturado (reintento, doble clic, recarga), no es un error;
    // se consulta su estado real y se devuelve tal cual.
    const yaCapturado = r.status === 422 && Array.isArray(d.details) && d.details.some(x => x.issue === 'ORDER_ALREADY_CAPTURED');
    if (yaCapturado) {
      const g = await fetch(base + '/v2/checkout/orders/' + encodeURIComponent(orderID), { headers: { Authorization: 'Bearer ' + token } });
      const o = await g.json().catch(() => ({}));
      if (g.ok && o.status === 'COMPLETED') return respuesta(request, 200, { status: o.status, id: o.id, yaCapturado: true });
    }
    if (!r.ok) {
      console.error('capture PayPal', r.status, JSON.stringify(d).slice(0, 500));
      return respuesta(request, r.status >= 500 ? 502 : 400, { error: 'PayPal no ha podido capturar el pago.', detalle: d.name || r.status, status: d.status });
    }
    return respuesta(request, 200, { status: d.status, id: d.id });
  } catch (e) {
    console.error('paypal-capture-order:', e.message);
    return respuesta(request, 500, { error: 'No se pudo capturar el pago.', code: e.message });
  }
}
