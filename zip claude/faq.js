// Arcilla Hechizada — Preguntas frecuentes
// Lee data/faq.json (lo que se edita desde el panel /admin/) y construye
// el acordeón automáticamente: orden, textos y qué está publicado se
// controlan enteramente desde el panel, no desde este archivo.

(function () {
  function escapeHtml(texto) {
    return String(texto).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function crearPregunta(pregunta, respuesta) {
    var detalle = document.createElement('details');
    detalle.className = 'faq-item';

    var resumen = document.createElement('summary');

    var textoPregunta = document.createElement('span');
    textoPregunta.textContent = pregunta;

    var toggle = document.createElement('span');
    toggle.className = 'faq-toggle';
    toggle.textContent = 'Leer más';

    resumen.appendChild(textoPregunta);
    resumen.appendChild(toggle);

    var textoRespuesta = document.createElement('p');
    textoRespuesta.innerHTML = escapeHtml(respuesta).replace(/\n/g, '<br>');

    detalle.appendChild(resumen);
    detalle.appendChild(textoRespuesta);

    detalle.addEventListener('toggle', function () {
      toggle.textContent = detalle.open ? 'Cerrar' : 'Leer más';
    });

    return detalle;
  }

  async function cargarFaq() {
    var contenedor = document.getElementById('lista-faq');
    if (!contenedor) return;

    try {
      var respuesta = await fetch('data/faq.json?rev=' + Date.now());
      if (!respuesta.ok) throw new Error('No se pudo leer data/faq.json');
      var datos = await respuesta.json();

      var preguntas = (datos.faq || []).filter(function (p) {
        return p && p.estado === 'publicada' && p.pregunta && p.respuesta;
      });

      contenedor.innerHTML = '';

      if (!preguntas.length) {
        contenedor.innerHTML = '<p style="text-align:center; color:var(--marron-gris);">Todavía no hay preguntas publicadas.</p>';
        return;
      }

      var items = preguntas.map(function (p) {
        return crearPregunta(p.pregunta, p.respuesta);
      });

      items.forEach(function (item) {
        contenedor.appendChild(item);
        item.addEventListener('toggle', function () {
          if (item.open) {
            items.forEach(function (otro) {
              if (otro !== item) otro.open = false;
            });
          }
        });
      });
    } catch (e) {
      contenedor.innerHTML = '<p style="text-align:center; color:var(--marron-gris);">No se han podido cargar las preguntas ahora mismo. Escríbenos por <a href="https://wa.me/34722379095" target="_blank" rel="noopener">WhatsApp</a> si tienes alguna duda.</p>';
    }
  }

  document.addEventListener('DOMContentLoaded', cargarFaq);
})();
