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

  // Aparición suave de secciones al entrar en pantalla
  var secciones = document.querySelectorAll('.seccion');
  if (secciones.length && 'IntersectionObserver' in window && !sinMovimiento) {
    secciones.forEach(function (s) { s.classList.add('por-revelar'); });
    var observador = new IntersectionObserver(function (entradas) {
      entradas.forEach(function (entrada) {
        if (entrada.isIntersecting) {
          entrada.target.classList.add('en-vista');
          observador.unobserve(entrada.target);
        }
      });
    }, { threshold: 0.08 });
    secciones.forEach(function (s) { observador.observe(s); });
  }

  // Marca de agua: movimiento extremadamente sutil con scroll y cursor
  var marcaAgua = document.querySelector('.marca-agua');
  if (marcaAgua && !sinMovimiento) {
    var mx = 0, my = 0;
    window.addEventListener('scroll', function () {
      var despl = Math.min(window.scrollY * 0.03, 24);
      marcaAgua.style.transform = 'translateY(' + despl + 'px) translate(' + mx + 'px,' + my + 'px)';
    }, { passive: true });
    window.addEventListener('mousemove', function (e) {
      mx = (e.clientX / window.innerWidth - 0.5) * 10;
      my = (e.clientY / window.innerHeight - 0.5) * 10;
      marcaAgua.style.transform = 'translate(' + mx + 'px,' + my + 'px)';
    });
  }

  // Enlaces de WhatsApp con mensaje prellenado según el producto
  var numeroWhatsApp = '34722379095';
  document.querySelectorAll('[data-whatsapp-producto]').forEach(function (el) {
    var nombreProducto = el.getAttribute('data-whatsapp-producto');
    var mensaje = 'Hola, estoy interesada/o en el producto "' + nombreProducto + '" de Arcilla Hechizada.';
    el.href = 'https://wa.me/' + numeroWhatsApp + '?text=' + encodeURIComponent(mensaje);
  });

  // Galería de fotos de producto: clic en miniatura cambia la foto principal
  document.querySelectorAll('.galeria-producto').forEach(function (galeria) {
    var principal = galeria.querySelector('.foto-principal img');
    galeria.querySelectorAll('.miniatura').forEach(function (mini) {
      mini.addEventListener('click', function () {
        if (principal) principal.src = mini.src;
        galeria.querySelectorAll('.miniatura').forEach(function (m) { m.classList.remove('activa'); });
        mini.classList.add('activa');
      });
    });
  });

  // FAQ: acordeón simple (usa <details> nativo, esto solo cierra los demás al abrir uno)
  var faqs = document.querySelectorAll('.faq-item');
  faqs.forEach(function (item) {
    item.addEventListener('toggle', function () {
      if (item.open) {
        faqs.forEach(function (otro) {
          if (otro !== item) otro.open = false;
        });
      }
    });
  });
});
