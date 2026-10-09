// POST /api/paypal-create-order
// Crea el pedido en PayPal. El importe se calcula AQUÍ con los precios reales
// del catálogo, nunca con un importe enviado por el navegador.
import { paypalBase, respuesta, preflight, tokenServidor, resolverEnvio, cargarCatalogo, sePuedeComprar } from '../lib/paypal.js';

export async function onRequest(context) {
  const { request, env } = context;
  if (request.method === 'OPTIONS') return preflight(request);
  if (request.method !== 'POST') return respuesta(request, 405, { error: 'Método no permitido.' });
  try {
    let b = {};
    try { b = await request.json(); } catch (e) { return respuesta(request, 400, { error: 'Pedido no válido.' }); }
    const items = Array.isArray(b.items) ? b.items : [];
    const zonaEnvio = resolverEnvio(b.pais, b.cp);
    const numero = String(b.numeroPedido || '').slice(0, 60);
    const esTarjeta = String(b.metodo || '').toLowerCase() === 'tarjeta';
    if (zonaEnvio.tipo === 'internacional') return respuesta(request, 400, { error: 'Envío internacional — consulta el envío por WhatsApp antes de pagar.' });
    if (zonaEnvio.tipo !== 'es') return respuesta(request, 400, { error: 'Introduce un código postal español válido de 5 cifras.' });
    if (!items.length || items.length > 50) return respuesta(request, 400, { error: 'Carrito no válido.' });
    const ship = zonaEnvio.precio;

    const catalogo = await cargarCatalogo(context);
    if (!catalogo.length) return respuesta(request, 503, { error: 'No se pudo comprobar el catálogo. Inténtalo de nuevo en unos segundos.' });

    let subtotal = 0;
    for (const it of items) {
      const p = catalogo.find(x => x.id === it.id);
      const q = Math.max(1, Math.min(99, parseInt(it.cantidad, 10) || 1));
      if (!p || !sePuedeComprar(p)) {
        return respuesta(request, 400, { error: 'Alguno de los productos ya no está disponible.', producto: it.id });
      }
      subtotal += Math.round(Number(p.precio) * 100) * q;
    }
    const totalCent = subtotal + Math.round(ship * 100);
    const total = (totalCent / 100).toFixed(2);

    const orden = {
      intent: 'CAPTURE',
      purchase_units: [{
        custom_id: numero || undefined,
        description: ('Arcilla Hechizada ' + numero).trim().slice(0, 127),
        amount: { currency_code: 'EUR', value: total }
      }]
    };
    // Tarjeta (PSD2/3D Secure): pide autenticación cuando el banco o la normativa la exijan.
    // (Interruptor de emergencia: la variable PAYPAL_SCA con valor "off" desactiva esta parte sin tocar el código.)
    if (esTarjeta && env.PAYPAL_SCA !== 'off') {
      const origen = new URL(request.url).origin;
      orden.payment_source = {
        card: {
          attributes: { verification: { method: 'SCA_WHEN_REQUIRED' } },
          experience_context: { return_url: origen + '/carrito.html', cancel_url: origen + '/carrito.html' }
        }
      };
    }

    const token = await tokenServidor(env);
    const r = await fetch(paypalBase(env) + '/v2/checkout/orders', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify(orden)
    });
    const d = await r.json().catch(() => ({}));
    if (!r.ok || !d.id) {
      console.error('create-order PayPal', r.status, JSON.stringify(d).slice(0, 500));
      return respuesta(request, 502, { error: 'PayPal no ha aceptado el pedido.', detalle: d.name || r.status });
    }
    return respuesta(request, 200, { id: d.id, total: total, envio: ship.toFixed(2), zona: zonaEnvio.zona, subtotal: (subtotal / 100).toFixed(2) });
  } catch (e) {
    console.error('paypal-create-order:', e.message);
    return respuesta(request, 500, { error: 'No se pudo crear el pedido de PayPal.', code: e.message });
  }
}
