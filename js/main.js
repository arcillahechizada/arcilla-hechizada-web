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

  // Navegación contextual: vuelve a la página anterior dentro del sitio.
  document.querySelectorAll('.btn-volver-atras').forEach(function (btn) {
    btn.addEventListener('click', function (e) {
      var ref = document.referrer || '';
      var mismoSitio = false;
      try { mismoSitio = ref && new URL(ref, window.location.href).origin === window.location.origin; } catch (_) {}
      if (window.history.length > 1 && mismoSitio) { e.preventDefault(); window.history.back(); }
    });
  });
});

function construirNavegacionTienda() {
  var cats = [
    ['Grimorios','grimorios.html'], ['Amuletos','amuletos.html'], ['Pociones','pociones.html'],
    ['Mandalas','mandalas.html'], ['Botellitas','botellitas.html'], ['Infusiones','infusiones.html'],
    ['Inciensos','inciensos.html'], ['Plantas / Semillas','plantas-semillas.html']
  ];
  document.querySelectorAll('nav.principal').forEach(function(nav) {
    if (nav.querySelector('.menu-tienda')) return;
    var tienda = Array.from(nav.children).find(function(a){ return a.tagName === 'A' && a.getAttribute('href') === 'tienda.html'; });
    if (!tienda) return;
    var wrap = document.createElement('div'); wrap.className='menu-tienda';
    var link = document.createElement('a'); link.href='tienda.html#categorias-tienda'; link.textContent='Tienda'; link.className='tienda-trigger'; link.setAttribute('aria-haspopup','true'); link.setAttribute('aria-expanded','false');
    var sub = document.createElement('div'); sub.className='submenu-tienda';
    cats.forEach(function(c){ var a=document.createElement('a'); a.href=c[1]; a.textContent=c[0]; sub.appendChild(a); });
    wrap.appendChild(link); wrap.appendChild(sub); nav.replaceChild(wrap,tienda);
    link.addEventListener('click', function(e){ e.preventDefault(); var abierto=wrap.classList.toggle('abierto'); link.setAttribute('aria-expanded', abierto?'true':'false'); });
    var cart=document.createElement('a'); cart.href='carrito.html'; cart.className='enlace-carrito'; cart.innerHTML='🛒 Carrito <span id="contador-carrito">0</span>'; nav.parentElement.appendChild(cart);
  });
  document.querySelectorAll('.menu-movil').forEach(function(menu){
    if(menu.querySelector('.menu-tienda-movil')) return;
    var tienda=Array.from(menu.children).find(function(a){return a.tagName==='A' && a.getAttribute('href')==='tienda.html';});
    if(!tienda) return;
    var d=document.createElement('details'); d.className='menu-tienda-movil';
    var sum=document.createElement('summary'); sum.textContent='Tienda'; d.appendChild(sum);
    cats.forEach(function(c){var a=document.createElement('a');a.href=c[1];a.textContent=c[0];d.appendChild(a);});
    menu.replaceChild(d,tienda);
    var cart=document.createElement('a');cart.href='carrito.html';cart.className='enlace-carrito-movil';cart.textContent='🛒 Carrito';menu.insertBefore(cart,menu.firstChild);
  });
  var n=0; try{n=JSON.parse(localStorage.getItem('arcillaHechizadaCarrito')||'[]').reduce(function(t,i){return t+(Number(i.cantidad)||0);},0);}catch(e){} document.querySelectorAll('#contador-carrito').forEach(function(e){e.textContent=n;});
}
