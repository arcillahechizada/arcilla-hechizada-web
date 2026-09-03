// ============================================================
// RENDERIZADO DE PRODUCTOS DESDE data/productos.json
// Arcilla Hechizada
// ============================================================
let PRODUCTOS = [];
let PIEZAS_UNICAS = [];
let OPINIONES = [];
let FAQ = [];

async function cargarDatos() {
  const [productos, piezas, opiniones, faq] = await Promise.all([
    fetch('data/productos.json').then(r => r.json()).catch(() => ({ productos: [] })),
    fetch('data/piezas-unicas.json').then(r => r.json()).catch(() => ({ piezas: [] })),
    fetch('data/opiniones.json').then(r => r.json()).catch(() => ({ opiniones: [] })),
    fetch('data/faq.json').then(r => r.json()).catch(() => ({ faq: [] }))
  ]);
  PRODUCTOS = productos.productos || [];
  PIEZAS_UNICAS = piezas.piezas || [];
  OPINIONES = opiniones.opiniones || [];
  FAQ = faq.faq || [];
}

function escHTML(valor = '') {
  return String(valor).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}
function texto(valor = '') { return escHTML(valor).replace(/\n/g, '<br>'); }
function imagenProducto(prod) {
  return prod.imagenPrincipal || (Array.isArray(prod.galeria) && prod.galeria.length ? prod.galeria[0] : 'img/placeholder.jpg');
}

function tarjetaProductoHTML(prod) {
  const precio = prod.precio !== undefined && prod.precio !== null && prod.precio !== '' ? `${escHTML(prod.precio)} €` : 'Consultar';
  const estado = prod.estado && prod.estado !== 'disponible' ? prod.estado : '';
  return `
    <a class="tarjeta-producto" href="ficha.html?id=${encodeURIComponent(prod.id)}" data-id="${escHTML(prod.id)}">
      <div class="foto imagen-tarjeta">
        <img src="${escHTML(imagenProducto(prod))}" alt="${escHTML(prod.nombre || '')}" loading="lazy">
        ${estado ? `<span class="estado-producto">${escHTML(estado)}</span>` : ''}
      </div>
      <div class="info info-tarjeta">
        <h3>${escHTML(prod.nombre || 'Producto')}</h3>
        <p class="precio">${precio}</p>
        ${prod.descripcionCorta ? `<p>${escHTML(prod.descripcionCorta)}</p>` : ''}
      </div>
    </a>`;
}

function renderCategoria(containerId, categoriaSlug) {
  const container = document.getElementById(containerId);
  if (!container) return;
  const dinamicos = PRODUCTOS.filter(p => p.categoria === categoriaSlug && p.estado !== 'oculto');
  const antiguas = Array.from(container.querySelectorAll(':scope > .tarjeta-producto'));
  const idsDinamicos = new Set(dinamicos.map(p => p.id));
  const legacy = antiguas.filter(card => {
    const raw = card.dataset.id || ((card.getAttribute('href') || '').match(/[?&]id=([^&]+)/) || [])[1];
    if (!raw) return true;
    const id = decodeURIComponent(raw);
    return !idsDinamicos.has(id);
  });
  container.innerHTML = dinamicos.map(p => tarjetaProductoHTML(p)).join('');
  legacy.forEach(card => container.appendChild(card));
}

function renderPiezasUnicas(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  const piezas = PIEZAS_UNICAS.filter(p => p.estado !== 'oculto');
  container.innerHTML = piezas.map(p => tarjetaProductoHTML(p)).join('');
}

function campoFicha(titulo, valor) {
  if (valor === undefined || valor === null || valor === '') return '';
  return `<section class="detalle-ficha"><h3>${escHTML(titulo)}</h3><p>${texto(valor)}</p></section>`;
}

function renderFicha() {
  const id = new URLSearchParams(window.location.search).get('id');
  if (!id) return;
  const prod = PRODUCTOS.find(p => p.id === id) || PIEZAS_UNICAS.find(p => p.id === id);
  const nuevo = document.getElementById('ficha-contenido');
  // Si aún no está en el CMS, conserva la ficha antigua.
  if (!prod || !nuevo) return;

  const principal = imagenProducto(prod);
  const galeria = Array.isArray(prod.galeria) && prod.galeria.length ? prod.galeria : [principal];
  const precio = prod.precio !== undefined && prod.precio !== null && prod.precio !== '' ? `${escHTML(prod.precio)} €` : 'Consultar';
  const personalizable = prod.personalizable === true || prod.personalizable === 'true';
  const otroColor = prod.otroColor === true || prod.otroColor === 'true';

  let variantes = '';
  if (Array.isArray(prod.variantes) && prod.variantes.length) {
    variantes = `<section class="detalle-ficha"><h3>Variantes</h3><div class="variantes-ficha">${prod.variantes.map(v => `<div class="variante-ficha">${v.imagen ? `<img src="${escHTML(v.imagen)}" alt="${escHTML(v.nombre || '')}" loading="lazy">` : ''}<strong>${escHTML(v.nombre || 'Variante')}</strong>${v.precio !== undefined && v.precio !== '' ? `<span>${escHTML(v.precio)} €</span>` : ''}</div>`).join('')}</div></section>`;
  }

  nuevo.innerHTML = `
    <article class="ficha-producto ficha-dinamica">
      <div class="galeria-ficha">
        <img class="imagen-principal-ficha" src="${escHTML(principal)}" alt="${escHTML(prod.nombre || '')}">
        ${galeria.length > 1 ? `<div class="miniaturas-ficha">${galeria.map(img => `<img src="${escHTML(img)}" alt="${escHTML(prod.nombre || '')}" loading="lazy">`).join('')}</div>` : ''}
      </div>
      <div class="contenido-ficha">
        <p class="categoria-ficha">${escHTML(prod.categoria || '')}</p>
        <h1>${escHTML(prod.nombre || 'Producto')}</h1>
        <p class="precio-ficha">${precio}</p>
        ${prod.descripcionCorta ? `<p class="descripcion-corta-ficha">${texto(prod.descripcionCorta)}</p>` : ''}
        ${campoFicha('Descripción', prod.descripcionCompleta)}
        ${campoFicha('Simbolismo / uso', prod.simbolismoUso)}
        ${campoFicha('Materiales', prod.materiales)}
        ${campoFicha('Medidas', prod.medidas)}
        ${campoFicha('Cuidados', prod.cuidados)}
        ${campoFicha('Elaboración', prod.elaboracion)}
        ${variantes}
        ${personalizable ? `<section class="detalle-ficha"><h3>Personalización</h3><p>${texto(prod.opcionesPersonalizacion || 'Esta pieza se puede personalizar.')}</p>${otroColor ? '<p>También se puede solicitar en otro color no fotografiado.</p>' : ''}</section>` : ''}
        <div class="acciones-ficha"><a class="boton" href="https://wa.me/34600000000?text=${encodeURIComponent('Hola, estoy interesada en ' + (prod.nombre || 'este producto'))}" target="_blank" rel="noopener">Preguntar por WhatsApp</a>${personalizable ? '<a class="boton boton-secundario" href="personalizados.html">Solicitar personalización</a>' : ''}</div>
      </div>
    </article>`;

  const legacy = document.querySelector('.contenedor-ficha');
  if (legacy) legacy.style.display = 'none';
}
