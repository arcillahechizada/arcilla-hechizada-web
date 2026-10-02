// Crea el pedido en PayPal. El importe se calcula AQUÍ con los precios reales
// del catálogo, nunca con un importe enviado por el navegador.
const { PAYPAL_BASE, respuesta, preflight, tokenServidor, envio, cargarCatalogo } = require('./lib/paypal');

const NO_VENDIBLE = ['agotado', 'vendido', 'vendida', 'reservada', 'oculto'];

exports.handler = async function (event) {
  if (event.httpMethod === 'OPTIONS') return preflight();
  if (event.httpMethod !== 'POST') return respuesta(405, { error: 'Método no permitido.' });
  try {
    const b = JSON.parse(event.body || '{}');
    const items = Array.isArray(b.items) ? b.items : [];
    const ship = envio(b.cp);
    const numero = String(b.numeroPedido || '').slice(0, 60);
    if (!items.length || ship === null) return respuesta(400, { error: 'Carrito o código postal no válidos.' });

    const catalogo = await cargarCatalogo();
    if (!catalogo.length) return respuesta(503, { error: 'No se pudo comprobar el catálogo. Inténtalo de nuevo en unos segundos.' });

    let subtotal = 0;
    for (const it of items) {
      const p = catalogo.find(x => x.id === it.id);
      const q = Math.max(1, Math.min(99, parseInt(it.cantidad, 10) || 1));
      const precio = p ? Number(p.precio) : NaN;
      if (!p || NO_VENDIBLE.includes(p.estado) || !Number.isFinite(precio)) {
        return respuesta(400, { error: 'Alguno de los productos ya no está disponible.', producto: it.id });
      }
      subtotal += Math.round(precio * 100) * q;
    }
    const totalCent = subtotal + Math.round(ship * 100);
    const total = (totalCent / 100).toFixed(2);

    const token = await tokenServidor();
    const r = await fetch(PAYPAL_BASE + '/v2/checkout/orders', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [{
          custom_id: numero || undefined,
          description: ('Arcilla Hechizada ' + numero).trim().slice(0, 127),
          amount: { currency_code: 'EUR', value: total }
        }]
      })
    });
    const d = await r.json().catch(() => ({}));
    if (!r.ok || !d.id) {
      console.error('create-order PayPal', r.status, JSON.stringify(d).slice(0, 500));
      return respuesta(502, { error: 'PayPal no ha aceptado el pedido.', detalle: d.name || r.status });
    }
    return respuesta(200, { id: d.id, total: total, envio: ship.toFixed(2), subtotal: (subtotal / 100).toFixed(2) });
  } catch (e) {
    console.error('paypal-create-order:', e.message);
    return respuesta(500, { error: 'No se pudo crear el pedido de PayPal.', code: e.message });
  }
};
