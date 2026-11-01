// GET /articulo?a=...  -> misma página de siempre, pero con título, descripción y foto del artículo
// en la cabecera, para que WhatsApp, Instagram, etc. enseñen el artículo correcto al compartirlo.
// Si algo falla, se sirve la página normal sin cambios.
const BASE = 'https://www.arcillahechizada.com';

export async function onRequest(context) {
  const respuesta = await context.next();
  try {
    const slug = (new URL(context.request.url).searchParams.get('a') || '').trim();
    const tipo = (respuesta.headers.get('content-type') || '');
    if (!slug || !tipo.includes('text/html')) return respuesta;
    const origen = new URL(context.request.url).origin;
    const r = await context.env.ASSETS.fetch(new URL('/data/blog.json', origen));
    if (!r.ok) return respuesta;
    const a = ((await r.json()).articulos || []).find(x => x.slug === slug);
    if (!a) return respuesta;
    const titulo = `${a.seoTitulo || a.titulo} — Arcilla Hechizada`;
    const descripcion = String(a.seoDescripcion || a.resumen || '').replace(/\s+/g, ' ').trim().slice(0, 300);
    const url = `${BASE}/articulo?a=${encodeURIComponent(slug)}`;
    const imagen = !a.imagen ? '' : (/^https?:/i.test(a.imagen) ? a.imagen : BASE + '/' + encodeURI(String(a.imagen).replace(/^\/+/, '')));
    const poner = (valor) => ({ element(e) { if (valor) e.setAttribute('content', valor); } });
    return new HTMLRewriter()
      .on('title', { element(e) { e.setInnerContent(titulo); } })
      .on('meta[name="description"]', poner(descripcion))
      .on('meta[property="og:title"]', poner(titulo))
      .on('meta[property="og:description"]', poner(descripcion))
      .on('meta[property="og:url"]', poner(url))
      .on('meta[property="og:image"]', poner(imagen))
      .on('link[rel="canonical"]', { element(e) { e.setAttribute('href', url); } })
      .transform(respuesta);
  } catch (e) {
    return respuesta;
  }
}
