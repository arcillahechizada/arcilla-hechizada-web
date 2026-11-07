// Arcilla Hechizada — funciones compartidas del sitio

document.addEventListener('DOMContentLoaded', function () {
  var sinMovimiento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Menú móvil
  var toggle = document.querySelector('.menu-toggle');
  var menu = document.querySelector('.menu-movil');
  if (toggle && menu) {
    toggle.addEventListener('click', function () {
      menu.classList.toggle('abierto');
      var abierto = menu.classList.contains('abierto');
      toggle.setAttribute('aria-expanded', abierto ? 'true' : 'false');
    });
  }

  // Header: estado al hacer scroll
  var header = document.querySelector('header.site');
  if (header) {
    var alScrollear = function () {
      if (window.scrollY > 12) header.classList.add('con-scroll');
      else header.classList.remove('con-scroll');
    };
    alScrollear();
    window.addEventListener('scroll', alScrollear, { passive: true });
  }

  // Aparición suave de secciones
  var secciones = document.querySelectorAll('.seccion');
  if (secciones.length && 'IntersectionObserver' in window && !sinMovimiento) {
    secciones.forEach(function (s) { s.classList.add('por-revelar'); });
    var observador = new IntersectionObserver(function (entradas) {
      entradas.forEach(function (entrada) {
        if (entrada.isIntersecting) { entrada.target.classList.add('en-vista'); observador.unobserve(entrada.target); }
      });
    }, { threshold: 0.08 });
    secciones.forEach(function (s) { observador.observe(s); });
  }

  // Marca de agua
  var marcaAgua = document.querySelector('.marca-agua');
  if (marcaAgua && !sinMovimiento) {
    var mx = 0, my = 0;
    window.addEventListener('scroll', function () { var despl = Math.min(window.scrollY * 0.03, 24); marcaAgua.style.transform = 'translateY(' + despl + 'px) translate(' + mx + 'px,' + my + 'px)'; }, { passive: true });
    window.addEventListener('mousemove', function (e) { mx = (e.clientX / window.innerWidth - 0.5) * 10; my = (e.clientY / window.innerHeight - 0.5) * 10; marcaAgua.style.transform = 'translate(' + mx + 'px,' + my + 'px)'; });
  }

  // FAQ: solo uno abierto a la vez
  var faqs = document.querySelectorAll('.faq-item');
  faqs.forEach(function (item) { item.addEventListener('toggle', function () { if (item.open) faqs.forEach(function (otro) { if (otro !== item) otro.open = false; }); }); });

  // Tienda desplegable y carrito en la barra superior.
  construirNavegacionTienda();

  // Navegación contextual: TODAS las páginas (menos la portada) tienen un «← Volver atrás».
  // Vuelve a la página donde estabas; si se entra directo (enlace, WhatsApp…) va a una página lógica.
  (function volverAtras() {
    var pagina = (window.location.pathname.split('/').pop() || 'index.html').toLowerCase();
    if (pagina === '' || pagina === 'index.html' || pagina === '404.html' || pagina === 'gracias.html') return;
    var main = document.querySelector('main');
    if (!main) return;
    var destinoPorDefecto = (pagina === 'tienda.html') ? 'index.html' : 'tienda.html';
    var etiqueta = '← Volver atrás';
    // ¿Ya hay un botón de volver en la página? Se aprovecha y se unifica.
    var existente = main.querySelector('.btn-volver-atras') ||
      Array.from(main.querySelectorAll('a.btn')).find(function (a) { return /^\s*←/.test(a.textContent); });
    var btn = existente;
    if (!btn) {
      var barra = document.createElement('div');
      barra.className = 'volver-atras-barra' + (main.classList.contains('contenedor') ? '' : ' contenedor');
      btn = document.createElement('a');
      btn.className = 'btn btn-secundario btn-volver-atras';
      btn.href = destinoPorDefecto;
      barra.appendChild(btn);
      main.insertBefore(barra, main.firstChild);
    }
    btn.textContent = etiqueta;
    btn.classList.add('btn-volver-atras');
    btn.addEventListener('click', function (e) {
      var ref = document.referrer || '';
      var mismoSitio = false;
      try { mismoSitio = ref && new URL(ref, window.location.href).origin === window.location.origin; } catch (_) {}
      if (window.history.length > 1 && mismoSitio) { e.preventDefault(); window.history.back(); }
    });
  })();
});

// Secciones de la tienda (data/secciones.json, se crean y se publican desde el panel > Secciones de la tienda).
// Si ese archivo no se puede leer, la web funciona como siempre (todo lo clásico visible; Packs y Velas según data/ajustes.json).
window.SECCIONES_P = window.SECCIONES_P || fetch('data/secciones.json',{cache:'no-store'}).then(function(r){return r.ok?r.json():{};}).then(function(d){
  var l = (d && Array.isArray(d.secciones)) ? d.secciones : [];
  try { if (l.length) localStorage.setItem('arcillaSecciones', JSON.stringify(l)); } catch (_) {}
  return l;
}).catch(function(){return [];});
window.AJUSTES_P = window.AJUSTES_P || window.SECCIONES_P.then(function(l){
  if (l.length) {
    var g = function(id){ return l.find(function(x){return x.id===id;}); };
    return { mostrarPacks: !!(g('packs') && g('packs').publicada), mostrarVelas: !!(g('velas') && g('velas').publicada) };
  }
  return fetch('data/ajustes.json',{cache:'no-store'}).then(function(r){return r.ok?r.json():{};}).catch(function(){return {};});
});

var MENU_CLASICO = [
  ['Grimorios','grimorios.html'], ['Amuletos','amuletos.html'], ['Pociones','pociones.html'],
  ['Mandalas','mandalas.html'], ['Botellitas','botellitas.html'], ['Infusiones','infusiones.html'],
  ['Inciensos','inciensos.html'], ['Plantas / Semillas','plantas-semillas.html']
];
var EMOJI_SECCION = { 'grimorios':'📖','amuletos':'✦','pociones':'🧪','mandalas':'◎','botellitas':'🍶','infusiones':'🍵','inciensos':'🕯️','plantas-semillas':'🌿','packs':'🎁','velas':'🕯️' };
var SECCIONES_ANTIGUAS = ['grimorios','amuletos','pociones','mandalas','botellitas','infusiones','inciensos','plantas-semillas','packs','velas'];

function itemsMenuTienda(lista){
  var items = [['Ver tienda','tienda.html']];
  if (lista && lista.length) {
    lista.filter(function(s){return s.publicada && s.mostrarEnMenu!==false;}).forEach(function(s){ items.push([s.nombre, s.pagina || (s.id+'.html')]); });
  } else {
    MENU_CLASICO.forEach(function(c){ items.push(c); });
  }
  items.push(['Opiniones','opiniones.html']);
  return items;
}
function pintarEnlaces(box, items){
  box.textContent='';
  items.forEach(function(c){ var a=document.createElement('a'); a.href=c[1]; a.textContent=c[0]; box.appendChild(a); });
}
function aplicarSecciones(){
  window.SECCIONES_P.then(function(lista){
    window.__secciones = lista;
    if (lista.length) {
      var items = itemsMenuTienda(lista);
      document.querySelectorAll('.submenu-tienda[data-menu="tienda"], .menu-tienda-lista').forEach(function(box){ pintarEnlaces(box, items); });
    }
    // Compatibilidad: tarjetas antiguas ocultas (Packs / Velas) en páginas que aún las lleven fijas
    window.AJUSTES_P.then(function(a){
      [['mostrarPacks','packs'],['mostrarVelas','velas']].forEach(function(s){
        if(!a||!a[s[0]]) return;
        document.querySelectorAll('[data-seccion="'+s[1]+'"]').forEach(function(e){ e.hidden=false; });
      });
    });
    pintarCabecerasSecciones(lista);
    ocultarPaginaSiNoPublicada(lista);
    refrescarTarjetas();
  });
}
// Foto de la parte de arriba de Infusiones / Inciensos (y de cualquier sección clásica que la tenga), editable desde el panel.
function pintarCabecerasSecciones(lista){
  lista.forEach(function(s){
    if (!s.fotoCabecera) return;
    var img = document.getElementById('cabecera-'+s.id);
    if (!img) return;
    img.src = s.fotoCabecera;
    if (s.altCabecera) img.alt = s.altCabecera;
  });
}
// Si una sección clásica está oculta (Publicada apagada), su página enseña «muy pronto» y no se indexa.
function ocultarPaginaSiNoPublicada(lista){
  var m = (location.pathname.split('/').pop() || '').replace(/\.html$/,'');
  if (m==='packs' || m==='velas' || SECCIONES_ANTIGUAS.indexOf(m)<0) return; // Packs y Velas ya lo hacen sus páginas
  var s = lista.find(function(x){return x.id===m;});
  if (!s || s.publicada) return;
  var main = document.querySelector('main');
  if (!main) return;
  main.innerHTML = '<div style="margin-bottom:24px;"><a href="tienda.html" class="btn btn-secundario">← Volver a la tienda</a></div><div class="centro" style="margin-bottom:40px;"><span class="eyebrow">Colección</span><h1></h1><p class="aviso-pendiente">Esta sección estará disponible muy pronto.</p></div>';
  main.querySelector('h1').textContent = s.nombre;
  var mt=document.createElement('meta'); mt.name='robots'; mt.content='noindex'; document.head.appendChild(mt);
}
// Tarjetas de «Mis creaciones» (portada) y de la tienda: salen de las secciones publicadas.
function refrescarTarjetas(){
  var lista = window.__secciones;
  if (!lista || !lista.length) return;
  var hayProductos = (typeof PRODUCTOS !== 'undefined') && PRODUCTOS.length;
  document.querySelectorAll('.grid-categorias').forEach(function(grid){
    if (!grid.querySelector('.categoria-card')) return;
    grid.textContent='';
    lista.filter(function(s){return s.publicada && s.mostrarEnTarjetas!==false;}).forEach(function(s){
      var a=document.createElement('a'); a.className='categoria-card'; a.href=s.pagina || (s.id+'.html');
      var ic=document.createElement('div'); ic.className='icono'; ic.textContent=EMOJI_SECCION[s.id]||'✧';
      var h=document.createElement('h3'); h.textContent=s.nombre;
      a.appendChild(ic); a.appendChild(h);
      var foto = s.fotoTarjeta;
      if (!foto && SECCIONES_ANTIGUAS.indexOf(s.id)<0 && hayProductos) {
        var ps = PRODUCTOS.filter(function(p){return p.seccion===s.id && p.estado!=='oculto' && (p.imagenPrincipal || (p.galeria && p.galeria[0]));});
        var p0 = ps.find(function(p){return !/collage/i.test(p.imagenPrincipal || p.galeria[0]);}) || ps[0];
        if (p0) foto = p0.imagenPrincipal || p0.galeria[0];
      }
      if (foto) {
        var d=document.createElement('div'); d.className='cat-foto';
        var im=document.createElement('img'); im.src=foto; im.alt=''; im.loading='lazy'; d.appendChild(im);
        a.replaceChild(d, ic); a.classList.add('con-foto');
      }
      grid.appendChild(a);
    });
    grid.dataset.secciones='1';
  });
  // Las secciones clásicas sin foto propia usan la primera pieza de su categoría (como siempre)
  if (hayProductos && typeof fotosCategorias === 'function') { try { fotosCategorias(); } catch (_) {} }
}
// Cuando los productos terminan de cargarse, se completan las fotos de las tarjetas (sin cambiar nada de lo que devuelve cargarDatos)
if (typeof window.cargarDatos === 'function' && !window.__cargarDatosEnvuelto) {
  window.__cargarDatosEnvuelto = true;
  var cargarDatosOriginal = window.cargarDatos;
  window.cargarDatos = function(){
    var p = cargarDatosOriginal.apply(this, arguments);
    try { p.then(function(){ refrescarTarjetas(); }, function(){}); } catch (_) {}
    return p;
  };
}
function construirNavegacionTienda() {
  var guardadas = []; try { guardadas = JSON.parse(localStorage.getItem('arcillaSecciones') || '[]'); } catch (_) {}
  var cats = itemsMenuTienda(Array.isArray(guardadas) ? guardadas : []);
  function desplegable(nav, original, texto, href, items, etiquetaAria){
    var wrap = document.createElement('div'); wrap.className='menu-tienda';
    var link = document.createElement('a'); link.href=href; link.textContent=texto; link.className='tienda-trigger';
    var flecha = document.createElement('button'); flecha.type='button'; flecha.className='tienda-flecha'; flecha.textContent='⌄';
    flecha.setAttribute('aria-label',etiquetaAria); flecha.setAttribute('aria-haspopup','true'); flecha.setAttribute('aria-expanded','false');
    var sub = document.createElement('div'); sub.className='submenu-tienda'; sub.setAttribute('data-menu', texto==='Tienda' ? 'tienda' : 'ayuda');
    items.forEach(function(c){ var a=document.createElement('a'); a.href=c[1]; a.textContent=c[0]; sub.appendChild(a); });
    wrap.appendChild(link); wrap.appendChild(flecha); wrap.appendChild(sub); nav.replaceChild(wrap,original);
    wrap.addEventListener('mouseenter', function(){ flecha.setAttribute('aria-expanded','true'); });
    wrap.addEventListener('mouseleave', function(){ if(!wrap.classList.contains('abierto')) flecha.setAttribute('aria-expanded','false'); });
    flecha.addEventListener('focus', function(){ flecha.setAttribute('aria-expanded','true'); });
    flecha.addEventListener('click', function(e){ e.preventDefault(); var abierto = wrap.classList.toggle('abierto'); flecha.setAttribute('aria-expanded', abierto ? 'true' : 'false'); });
    wrap.addEventListener('focusout', function(e){ if(!wrap.contains(e.relatedTarget) && !wrap.classList.contains('abierto')) flecha.setAttribute('aria-expanded','false'); });
    document.addEventListener('click', function(e){ if(!wrap.contains(e.target)){ wrap.classList.remove('abierto'); flecha.setAttribute('aria-expanded','false'); } });
  }
  var ayuda = [['Envíos y recogida','envios-y-recogida.html'],['Preguntas frecuentes','faq.html'],['Opiniones','opiniones.html'],['Para tiendas','para-tiendas.html'],['Reserva una llamada','reserva-de-llamada.html'],['Contacto','contacto.html']];
  document.querySelectorAll('nav.principal').forEach(function(nav) {
    if (nav.querySelector('.menu-tienda')) return;
    var tienda = Array.from(nav.children).find(function(a){ return a.tagName === 'A' && a.getAttribute('href') === 'tienda.html'; });
    if (!tienda) return;
    // «Tienda» lleva a la página principal; la flecha ▾ abre/cierra las categorías.
    // (No usar preventDefault en el enlace «Tienda»: si se añade, el enlace deja de llevar a inicio.)
    desplegable(nav, tienda, 'Tienda', 'index.html', cats, 'Mostrar las categorías de la tienda');
    var ay = nav.querySelector('a[data-grupo="ayuda"]');
    if (ay) desplegable(nav, ay, 'Ayuda', 'faq.html', ayuda, 'Mostrar el menú de ayuda');
    var cart=document.createElement('a'); cart.href='carrito.html'; cart.className='enlace-carrito'; cart.innerHTML='🛒 Carrito <span id="contador-carrito">0</span>'; nav.parentElement.appendChild(cart);
  });
  document.querySelectorAll('.menu-movil').forEach(function(menu){
    if(menu.querySelector('.menu-tienda-movil')) return;
    var tienda=Array.from(menu.children).find(function(a){return a.tagName==='A' && a.getAttribute('href')==='tienda.html';});
    if(!tienda) return;
    // En móvil: «Tienda» lleva a inicio y la flecha ▾ despliega las categorías.
    var d=document.createElement('div'); d.className='menu-tienda-movil';
    var fila=document.createElement('div'); fila.className='menu-tienda-fila';
    var la=document.createElement('a'); la.href='index.html'; la.textContent='Tienda';
    var fl=document.createElement('button'); fl.type='button'; fl.className='tienda-flecha-movil'; fl.textContent='⌄';
    fl.setAttribute('aria-label','Mostrar las categorías de la tienda'); fl.setAttribute('aria-expanded','false');
    fila.appendChild(la); fila.appendChild(fl); d.appendChild(fila);
    var lista=document.createElement('div'); lista.className='menu-tienda-lista'; lista.hidden=true;
    cats.forEach(function(c){var a=document.createElement('a');a.href=c[1];a.textContent=c[0];lista.appendChild(a);});
    d.appendChild(lista);
    fl.addEventListener('click',function(){var ab=lista.hidden; lista.hidden=!ab; d.classList.toggle('abierto',ab); fl.setAttribute('aria-expanded',ab?'true':'false');});
    menu.replaceChild(d,tienda);
    var cart=document.createElement('a');cart.href='carrito.html';cart.className='enlace-carrito-movil';cart.textContent='🛒 Carrito';menu.insertBefore(cart,menu.firstChild);
  });
  aplicarSecciones();
  var n=0; try{n=JSON.parse(localStorage.getItem('arcillaHechizadaCarrito')||'[]').reduce(function(t,i){return t+(Number(i.cantidad)||0);},0);}catch(e){} document.querySelectorAll('#contador-carrito').forEach(function(e){e.textContent=n;});
}

/* ---- Cookies: aviso de consentimiento (Google Maps y Cal.com solo se cargan si lo aceptas) ---- */
(function(){
  var KEY='arcillaHechizadaCookies';
  function leer(){try{return localStorage.getItem(KEY);}catch(e){return null;}}
  function guardar(v){try{localStorage.setItem(KEY,v);}catch(e){}}
  function cargarExternos(){
    document.querySelectorAll('iframe[data-consent-src]').forEach(function(f){
      f.src=f.getAttribute('data-consent-src'); f.removeAttribute('data-consent-src');
      var p=f.parentNode&&f.parentNode.querySelector('.consent-placeholder'); if(p) p.remove();
    });
  }
  function marcadores(){
    if(leer()==='todas') return;
    document.querySelectorAll('iframe[data-consent-src]').forEach(function(f){
      if(f.hasAttribute('data-consent-nolabel')||f.parentNode.querySelector('.consent-placeholder')) return;
      var d=document.createElement('div'); d.className='consent-placeholder';
      d.innerHTML='<p>Para ver '+(f.getAttribute('data-consent-label')||'este contenido')+' necesito tu permiso, porque lo ofrece un servicio externo que puede guardar cookies.</p><button type="button" class="btn btn-primario">Aceptar y ver</button>';
      d.querySelector('button').addEventListener('click',function(){guardar('todas');cargarExternos();cerrar();});
      f.parentNode.insertBefore(d,f);
    });
  }
  function cerrar(){var b=document.getElementById('aviso-cookies'); if(b) b.remove();}
  function abrir(){
    cerrar();
    var b=document.createElement('div'); b.id='aviso-cookies'; b.setAttribute('role','dialog'); b.setAttribute('aria-label','Aviso de cookies');
    b.innerHTML='<p><strong>🍪 Cookies, con transparencia.</strong> Uso solo lo necesario para que la tienda funcione. El mapa (Google Maps) y el calendario de reservas (Cal.com) son servicios externos y solo se cargan si me das permiso. Más información en la <a href="cookies.html">política de cookies</a>.</p><div class="aviso-cookies-botones"><button type="button" class="btn btn-primario" data-acepto="todas">Aceptar todo</button><button type="button" class="btn btn-secundario" data-acepto="necesarias">Solo las necesarias</button></div>';
    b.querySelectorAll('button').forEach(function(x){x.addEventListener('click',function(){var v=x.getAttribute('data-acepto');guardar(v);if(v==='todas')cargarExternos(); else marcadores(); cerrar();});});
    document.body.appendChild(b);
  }
  window.ahCookies={abrir:abrir};
  function iniciar(){
    var v=leer();
    if(v==='todas') cargarExternos(); else { marcadores(); if(!v) abrir(); }
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',iniciar); else iniciar();
})();
