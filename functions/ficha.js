// GET /ficha?id=...  -> mismo contenido de siempre, pero con título, descripción y foto del producto
// en las etiquetas de la cabecera. Así WhatsApp, Telegram, Instagram, etc. enseñan el producto correcto.
// Si algo falla, se sirve la página normal sin cambios.
const BASE = 'https://www.arcillahechizada.com';
const TIPOS = {
  amuletos: 'amuleto de arcilla hecho a mano', pociones: 'poción decorativa artesanal',
  botellitas: 'botellita de protección artesanal', grimorios: 'grimorio artesanal hecho a mano',
  mandala: 'mandala de arcilla hecho a mano', infusiones: 'infusión artesanal', inciensos: 'incienso artesanal'
};

async function buscar(context, id) {
  const origen = new URL(context.request.url).origin;
  for (const [archivo, clave] of [['productos', 'productos'], ['piezas-unicas', 'piezas']]) {
    try {
      const r = await context.env.ASSETS.fetch(new URL(`/data/${archivo}.json`, origen));
      if (!r.ok) continue;
      const lista = (await r.json())[clave] || [];
      const p = lista.find(x => String(x.id || '').trim() === id);
      if (p) return p;
    } catch (e) { /* seguimos con el siguiente archivo */ }
  }
  return null;
}

function imagenAbsoluta(p) {
  const img = p.imagenPrincipal || (Array.isArray(p.galeria) && p.galeria[0]) || '';
  if (!img) return '';
  if (/^https?:/i.test(img)) return img;
  return BASE + '/' + encodeURI(String(img).replace(/^\/+/, ''));
}

export async function onRequest(context) {
  const respuesta = await context.next();
  try {
    const id = (new URL(context.request.url).searchParams.get('id') || '').trim();
    const tipo = (respuesta.headers.get('content-type') || '');
    if (!id || !tipo.includes('text/html')) return respuesta;
    const p = await buscar(context, id);
    if (!p || p.estado === 'oculto') return respuesta;

    const titulo = `${p.nombre || 'Pieza artesanal'} — Arcilla Hechizada`;
    const descripcion = String(p.descripcionCorta || p.descripcion || '').replace(/\s+/g, ' ').trim().slice(0, 300)
      || `${p.nombre}${TIPOS[p.categoria] ? ' — ' + TIPOS[p.categoria] : ''}, hecho a mano en Arcilla Hechizada.`;
    const url = `${BASE}/ficha?id=${encodeURIComponent(id)}`;
    const imagen = imagenAbsoluta(p);
    const poner = (valor) => ({ element(e) { if (valor) e.setAttribute('content', valor); } });

    return new HTMLRewriter()
      .on('title', { element(e) { e.setInnerContent(titulo); } })
      .on('meta[name="description"]', poner(descripcion))
      .on('meta[property="og:title"]', poner(titulo))
      .on('meta[property="og:description"]', poner(descripcion))
      .on('meta[property="og:url"]', poner(url))
      .on('meta[property="og:image"]', poner(imagen))
      .on('meta[property="og:type"]', poner('product'))
      .on('head', { element(e) { e.append(`<link rel="canonical" href="${url.replace(/"/g, '&quot;')}">`, { html: true }); } })
      .transform(respuesta);
  } catch (e) {
    return respuesta;
  }
}
