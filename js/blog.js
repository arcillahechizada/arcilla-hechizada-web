/* El Grimorio: listado (el-grimorio.html) y artículo (articulo.html). Lee data/blog.json, que genera solo GitHub. */
(function () {
  var BASE = 'https://www.arcillahechizada.com';
  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function fechaBonita(iso) {
    var d = new Date(iso);
    if (isNaN(d)) return '';
    return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
  }
  function rutaImg(s) {
    if (!s) return '';
    if (/^https?:/i.test(s)) return s;
    return encodeURI(String(s).replace(/^\/+/, ''));
  }
  function enlinea(t) {
    t = esc(t);
    t = t.replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, function (m, alt, src) {
      if (/^javascript:/i.test(src)) return '';
      return '<img src="' + rutaImg(src.replace(/&amp;/g, '&')) + '" alt="' + alt + '" loading="lazy">';
    });
    t = t.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, function (m, txt, url) {
      if (!/^(https?:|mailto:|\/|#|[a-z0-9\-_.]+(\.html)?(\?|#|$))/i.test(url) || /^javascript:/i.test(url)) return txt;
      var ext = /^https?:/i.test(url) ? ' target="_blank" rel="noopener"' : '';
      return '<a href="' + url + '"' + ext + '>' + txt + '</a>';
    });
    t = t.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>').replace(/(^|[^*])\*([^*\s][^*]*)\*/g, '$1<em>$2</em>');
    return t;
  }
  function markdown(md) {
    var lineas = String(md || '').replace(/\r/g, '').split('\n');
    var html = [], parrafo = [], lista = null;
    function cierraP() { if (parrafo.length) { html.push('<p>' + enlinea(parrafo.join(' ')) + '</p>'); parrafo = []; } }
    function cierraL() { if (lista) { html.push('</' + lista + '>'); lista = null; } }
    lineas.forEach(function (l) {
      var m;
      if (/^\s*$/.test(l)) { cierraP(); cierraL(); return; }
      if ((m = l.match(/^(#{1,6})\s+(.*)$/))) {
        cierraP(); cierraL();
        var n = Math.min(Math.max(m[1].length + 1, 2), 4);
        html.push('<h' + n + '>' + enlinea(m[2]) + '</h' + n + '>'); return;
      }
      if ((m = l.match(/^\s*[-*]\s+(.*)$/))) {
        cierraP(); if (lista !== 'ul') { cierraL(); html.push('<ul>'); lista = 'ul'; }
        html.push('<li>' + enlinea(m[1]) + '</li>'); return;
      }
      if ((m = l.match(/^\s*\d+[.)]\s+(.*)$/))) {
        cierraP(); if (lista !== 'ol') { cierraL(); html.push('<ol>'); lista = 'ol'; }
        html.push('<li>' + enlinea(m[1]) + '</li>'); return;
      }
      if (/^>\s?/.test(l)) { cierraP(); cierraL(); html.push('<blockquote>' + enlinea(l.replace(/^>\s?/, '')) + '</blockquote>'); return; }
      cierraL(); parrafo.push(l.trim());
    });
    cierraP(); cierraL();
    return html.join('\n');
  }
  function cargar() {
    return fetch('data/blog.json', { cache: 'no-cache' }).then(function (r) {
      if (!r.ok) throw new Error('sin blog');
      return r.json();
    }).then(function (j) { return (j && j.articulos) || []; });
  }
  function ponMeta(sel, attr, valor) {
    var e = document.querySelector(sel);
    if (e && valor) e.setAttribute(attr, valor);
  }

  var lista = document.getElementById('lista-blog');
  if (lista) {
    cargar().then(function (arts) {
      if (!arts.length) return; /* se queda el mensaje "Próximamente" */
      lista.innerHTML = arts.map(function (a) {
        var img = a.imagen ? '<img src="' + rutaImg(a.imagen) + '" alt="' + esc(a.titulo) + '" loading="lazy">' : '<span class="blog-sin-foto" aria-hidden="true">✦</span>';
        return '<a class="tarjeta-producto tarjeta-blog" href="articulo.html?a=' + encodeURIComponent(a.slug) + '">' +
          '<div class="foto">' + img + '</div><div class="info">' +
          (a.categoria ? '<span class="eyebrow">' + esc(a.categoria) + '</span>' : '') +
          '<h3>' + esc(a.titulo) + '</h3><p style="font-size:.9rem;">' + esc(a.resumen) + '</p>' +
          '</div></a>';
      }).join('');
      var aviso = document.getElementById('aviso-blog');
      if (aviso) aviso.style.display = 'none';
    }).catch(function () { /* si algo falla se queda el mensaje de siempre */ });
  }

  var cont = document.getElementById('articulo');
  if (cont) {
    var slug = new URLSearchParams(location.search).get('a') || '';
    cargar().then(function (arts) {
      var a = arts.filter(function (x) { return x.slug === slug; })[0];
      if (!a) throw new Error('no existe');
      var titulo = (a.seoTitulo || a.titulo) + ' — Arcilla Hechizada';
      var desc = a.seoDescripcion || a.resumen;
      var url = BASE + '/articulo?a=' + encodeURIComponent(a.slug);
      var img = a.imagen ? (/^https?:/i.test(a.imagen) ? a.imagen : BASE + '/' + rutaImg(a.imagen)) : '';
      document.title = titulo;
      ponMeta('meta[name="description"]', 'content', desc);
      ponMeta('meta[property="og:title"]', 'content', titulo);
      ponMeta('meta[property="og:description"]', 'content', desc);
      ponMeta('meta[property="og:url"]', 'content', url);
      ponMeta('meta[property="og:type"]', 'content', 'article');
      if (img) ponMeta('meta[property="og:image"]', 'content', img);
      ponMeta('link[rel="canonical"]', 'href', url);
      var ld = { '@context': 'https://schema.org', '@type': 'Article', headline: a.titulo, description: desc,
        author: { '@type': 'Organization', name: 'Arcilla Hechizada' }, publisher: { '@type': 'Organization', name: 'Arcilla Hechizada' }, mainEntityOfPage: url };
      if (img) ld.image = img;
      var s = document.createElement('script'); s.type = 'application/ld+json'; s.textContent = JSON.stringify(ld); document.head.appendChild(s);
      cont.innerHTML =
        (a.categoria ? '<span class="eyebrow">' + esc(a.categoria) + '</span>' : '') +
        '<h1>' + esc(a.titulo) + '</h1>' +
        (a.imagen ? '<img class="blog-portada" src="' + rutaImg(a.imagen) + '" alt="' + esc(a.titulo) + '">' : '') +
        '<div class="blog-cuerpo">' + markdown(a.cuerpo) + '</div>' +
        '<aside class="aviso-pendiente">Si enciendes velas o incienso, hazlo siempre sobre una superficie que no arda, lejos de telas, papeles y plantas secas, y nunca dejes el fuego sin vigilar.</aside>' +
        '<p style="margin-top:28px;"><a class="btn btn-secundario" href="el-grimorio.html">← Volver a El Grimorio</a></p>';
    }).catch(function () {
      cont.innerHTML = '<h1>Este artículo no está disponible</h1><p>Puede que haya cambiado de dirección o que aún no esté publicado. Pásate por <a href="el-grimorio.html">El Grimorio</a> y échale un vistazo a los que sí están.</p>';
    });
  }
})();
