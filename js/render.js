// ============================================================
// SISTEMA UNIVERSAL DE PRODUCTOS — Arcilla Hechizada
// El administrador es la fuente de verdad: productos.json
// ============================================================
let PRODUCTOS = [];
let PIEZAS_UNICAS = [];
let OPINIONES = [];
let FAQ = [];

async function cargarDatos() {
  const [productos, piezas, opiniones, faq] = await Promise.all([
    fetch('data/productos.json').then(r => r.ok ? r.json() : {productos:[]}).catch(() => ({ productos: [] })),
    fetch('data/piezas-unicas.json').then(r => r.ok ? r.json() : {piezas:[]}).catch(() => ({ piezas: [] })),
    fetch('data/opiniones.json').then(r => r.ok ? r.json() : {opiniones:[]}).catch(() => ({ opiniones: [] })),
    fetch('data/faq.json').then(r => r.ok ? r.json() : {faq:[]}).catch(() => ({ faq: [] }))
  ]);
  PRODUCTOS = Array.isArray(productos.productos) ? productos.productos : [];
  PIEZAS_UNICAS = Array.isArray(piezas.piezas) ? piezas.piezas : [];
  OPINIONES = Array.isArray(opiniones.opiniones) ? opiniones.opiniones : [];
  FAQ = Array.isArray(faq.faq) ? faq.faq : [];
}

function escHTML(valor = '') {
  return String(valor)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}
function texto(valor = '') { return escHTML(valor).replace(/\n/g, '<br>'); }
function imagenProducto(prod) {
  return prod.imagenPrincipal || (Array.isArray(prod.galeria) && prod.galeria.length ? prod.galeria[0] : 'img/placeholder.jpg');
}
function etiquetaEstado(estado) {
  const mapa = {
    disponible: 'Disponible',
    bajo_pedido: 'Bajo pedido',
    agotado: 'Agotado',
    vendido: 'Vendido',
    reservada: 'Reservada',
    vendida: 'Vendida'
  };
  return mapa[estado] || estado || '';
}
function precioTexto(prod) {
  return prod.precio !== undefined && prod.precio !== null && prod.precio !== ''
    ? `${escHTML(prod.precio)} €` : 'Consultar';
}

function tarjetaProductoHTML(prod) {
  const estado = etiquetaEstado(prod.estado);
  return `
    <a class="tarjeta-producto" href="ficha.html?id=${encodeURIComponent(prod.id)}" data-id="${escHTML(prod.id)}">
      <div class="foto imagen-tarjeta">
        <img src="${escHTML(imagenProducto(prod))}" alt="${escHTML(prod.nombre || 'Producto')}" loading="lazy" onerror="this.src='img/placeholder.jpg'">
        ${estado ? `<span class="etiqueta ${prod.estado === 'vendido' || prod.estado === 'vendida' ? 'etiqueta-vendida' : 'etiqueta-disponible'}">${escHTML(estado)}</span>` : ''}
      </div>
      <div class="info info-tarjeta">
        <h3>${escHTML(prod.nombre || 'Producto')}</h3>
        <p class="precio">${precioTexto(prod)}</p>
        ${prod.descripcionCorta ? `<p>${texto(prod.descripcionCorta)}</p>` : ''}
      </div>
    </a>`;
}

function renderCategoria(containerId, categoriaSlug) {
  const container = document.getElementById(containerId);
  if (!container) return;
  const productos = PRODUCTOS.filter(p => p.categoria === categoriaSlug && p.estado !== 'oculto');
  container.innerHTML = productos.map(tarjetaProductoHTML).join('');
  if (!productos.length) {
    container.innerHTML = '<p class="aviso-pendiente">Todavía no hay productos publicados en esta categoría.</p>';
  }
}

function renderPiezasUnicas(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  const piezas = PIEZAS_UNICAS.filter(p => p.estado !== 'oculto');
  container.innerHTML = piezas.map(p => tarjetaProductoHTML(p)).join('');
}

function campoFicha(titulo, valor) {
  if (valor === undefined || valor === null || valor === '') return '';
  return `<section class="ficha-detalle"><h3>${escHTML(titulo)}</h3><p>${texto(valor)}</p></section>`;
}

function youtubeEmbed(url) {
  if (!url) return '';
  const match = String(url).match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/);
  if (!match) return `<p><a class="btn btn-secundario" href="${escHTML(url)}" target="_blank" rel="noopener">Ver vídeo</a></p>`;
  return `<div class="video-ficha"><iframe src="https://www.youtube.com/embed/${escHTML(match[1])}" title="Vídeo de ${escHTML(document.title)}" loading="lazy" allowfullscreen></iframe></div>`;
}

function normalizarLista(lista) {
  if (!Array.isArray(lista)) return [];
  return lista.map(x => {
    if (typeof x === 'string') return {nombre:x, valor:x};
    return {nombre: x.nombre || x.color || x.titulo || x.valor || 'Opción', valor: x.valor || x.nombre || x.color || x.titulo || 'Opción'};
  });
}

function bloqueOpcionesProducto(prod) {
  const bloques = [];
  const personalizable = prod.personalizable === true || prod.personalizable === 'true';

  if (personalizable) {
    let html = `<section class="opciones-ficha"><h3>Personalización</h3>`;
    if (prod.opcionesPersonalizacion) html += `<p>${texto(prod.opcionesPersonalizacion)}</p>`;
    const selectores = Array.isArray(prod.opcionesPersonalizacionCliente) ? prod.opcionesPersonalizacionCliente : [];
    if ((prod.activarSelectorPersonalizacion === true || prod.activarSelectorPersonalizacion === 'true') && selectores.length) {
      selectores.forEach((sel, i) => {
        const opciones = normalizarLista(sel.opciones);
        if (!opciones.length) return;
        html += `<div class="campo-opcion"><label for="personalizacion-${i}">${escHTML(sel.nombre || 'Elige una opción')}</label><select id="personalizacion-${i}" data-tipo="personalizacion" data-label="${escHTML(sel.nombre || 'Personalización')}" onchange="actualizarPedido()">`;
        opciones.forEach(o => html += `<option value="${escHTML(o.valor)}">${escHTML(o.nombre)}</option>`);
        html += `</select></div>`;
      });
    }
    html += `</section>`;
    bloques.push(html);
  }

  const mostrarVariantes = prod.mostrarVariantes === true || prod.mostrarVariantes === 'true';
  const variantes = Array.isArray(prod.variantes) ? prod.variantes.filter(v => v && v.disponible !== false && v.disponible !== 'false') : [];
  if (mostrarVariantes && variantes.length) {
    let html = `<section class="opciones-ficha"><h3>Variantes / colores</h3><div class="campo-opcion"><label for="select-variante">Elige tu opción</label><select id="select-variante" data-tipo="variante" data-label="Color / variante" onchange="actualizarPedido()">`;
    variantes.forEach(v => html += `<option value="${escHTML(v.color || v.nombre || '')}">${escHTML(v.color || v.nombre || 'Variante')}${v.precio !== undefined && v.precio !== '' ? ` — ${escHTML(v.precio)} €` : ''}</option>`);
    html += `</select></div></section>`;
    bloques.push(html);
  }

  const mostrarFormato = prod.mostrarCollarLlavero === true || prod.mostrarCollarLlavero === 'true';
  if (mostrarFormato) {
    let formatos = normalizarLista(prod.formatosDisponibles);
    if (!formatos.length) formatos = [{nombre:'Collar',valor:'Collar'},{nombre:'Llavero',valor:'Llavero'}];
    let html = `<section class="opciones-ficha"><h3>Formato</h3><div class="campo-opcion"><label for="select-formato">¿Cómo lo quieres?</label><select id="select-formato" data-tipo="formato" data-label="Formato" onchange="actualizarPedido()">`;
    formatos.forEach(o => html += `<option value="${escHTML(o.valor)}">${escHTML(o.nombre)}</option>`);
    html += `</select></div></section>`;
    bloques.push(html);
  }

  if (prod.permiteOtroColor === true || prod.permiteOtroColor === 'true') {
    bloques.push(`<section class="opciones-ficha"><h3>Otro color</h3><p>También puedes solicitar otro color que no aparezca entre las fotografías.</p><div class="campo-opcion"><label for="input-otro-color">Color que te gustaría</label><input id="input-otro-color" type="text" placeholder="Escribe aquí el color" data-tipo="otro-color" data-label="Otro color" oninput="actualizarPedido()"></div></section>`);
  }

  return bloques.join('');
}

function galeriaHTML(prod) {
  const principal = imagenProducto(prod);
  const fotos = [];
  [principal].concat(Array.isArray(prod.galeria) ? prod.galeria : []).forEach(f => {
    if (f && !fotos.includes(f)) fotos.push(f);
  });
  const lista = fotos.length ? fotos : ['img/placeholder.jpg'];
  return `<div class="galeria-producto">
    <div class="foto-principal"><img id="foto-principal-ficha" src="${escHTML(lista[0])}" alt="${escHTML(prod.nombre || 'Producto')}" onerror="this.src='img/placeholder.jpg'"></div>
    ${lista.length > 1 ? `<div class="galeria-miniaturas">${lista.map((f,i)=>`<img class="miniatura ${i===0?'activa':''}" src="${escHTML(f)}" alt="${escHTML(prod.nombre || 'Producto')} — foto ${i+1}" data-foto="${escHTML(f)}" loading="lazy">`).join('')}</div>` : ''}
    ${prod.video ? youtubeEmbed(prod.video) : ''}
  </div>`;
}

function obtenerOpcionesSeleccionadas() {
  const detalles = [];
  document.querySelectorAll('#ficha-contenido select[data-tipo], #ficha-contenido input[data-tipo]').forEach(el => {
    const valor = el.value && el.value.trim();
    if (valor) detalles.push(`${el.dataset.label || 'Opción'}: ${valor}`);
  });
  return detalles;
}

function actualizarPedido() {
  const prod = window.PRODUCTO_ACTUAL;
  if (!prod) return;
  const detalles = obtenerOpcionesSeleccionadas();
  let mensaje = `Hola, me interesa el producto "${prod.nombre || 'Producto'}" de Arcilla Hechizada.`;
  if (detalles.length) mensaje += `\n\nMis elecciones:\n- ${detalles.join('\n- ')}`;
  if (prod.estado === 'bajo_pedido') mensaje += '\n\nSé que este producto es bajo pedido.';
  const wa = document.getElementById('btn-wa');
  const email = document.getElementById('btn-email');
  const asunto = `Consulta sobre ${prod.nombre || 'producto'}`;
  if (wa) wa.href = `https://wa.me/34722379095?text=${encodeURIComponent(mensaje)}`;
  if (email) email.href = `mailto:arcillahechizada@gmail.com?subject=${encodeURIComponent(asunto)}&body=${encodeURIComponent(mensaje)}`;
}

function renderFicha() {
  const id = new URLSearchParams(window.location.search).get('id') || new URLSearchParams(window.location.search).get('producto');
  const contenedor = document.getElementById('ficha-contenido');
  if (!contenedor) return;
  if (!id) {
    contenedor.innerHTML = '<p class="aviso-pendiente">No se ha indicado ningún producto.</p>';
    return;
  }

  const prod = PRODUCTOS.find(p => p.id === id) || PIEZAS_UNICAS.find(p => p.id === id);
  if (!prod || prod.estado === 'oculto') {
    contenedor.innerHTML = '<p class="aviso-pendiente">Este producto todavía no está publicado.</p>';
    return;
  }
  window.PRODUCTO_ACTUAL = prod;
  document.title = `${prod.nombre || 'Producto'} — Arcilla Hechizada`;

  const estado = etiquetaEstado(prod.estado);
  const estadoClass = prod.estado === 'vendido' || prod.estado === 'vendida' ? 'etiqueta-vendida' : 'etiqueta-disponible';

  contenedor.innerHTML = `
    <article class="ficha-producto ficha-universal">
      ${galeriaHTML(prod)}
      <div class="detalles-ficha">
        <span class="eyebrow">${escHTML(prod.categoria || 'Pieza artesanal')}</span>
        <h1>${escHTML(prod.nombre || 'Producto')}</h1>
        <div class="estado-ficha"><span class="etiqueta ${estadoClass}">${escHTML(estado)}</span></div>
        <p class="ficha-precio">${precioTexto(prod)}</p>
        ${campoFicha('Descripción', prod.descripcionCompleta)}
        ${campoFicha('Simbolismo y uso', prod.simbolismo || prod.simbolismoUso)}
        ${campoFicha('Materiales', prod.materiales)}
        ${campoFicha('Medidas', prod.medidas)}
        ${campoFicha('Cuidados', prod.cuidados)}
        ${campoFicha('Elaboración', prod.elaboracion || '100% a mano.')}
        ${bloqueOpcionesProducto(prod)}
        <div class="ficha-botones">
          <a id="btn-wa" href="https://wa.me/34722379095" class="btn btn-primario" target="_blank" rel="noopener">Consultar / pedir por WhatsApp</a>
          <a id="btn-email" href="mailto:arcillahechizada@gmail.com" class="btn btn-secundario">Enviar un correo</a>
        </div>
      </div>
    </article>`;

  // Galería universal
  contenedor.querySelectorAll('.miniatura').forEach(mini => {
    mini.addEventListener('click', () => {
      const principal = contenedor.querySelector('#foto-principal-ficha');
      if (principal) principal.src = mini.dataset.foto;
      contenedor.querySelectorAll('.miniatura').forEach(m => m.classList.remove('activa'));
      mini.classList.add('activa');
    });
  });
  actualizarPedido();
}
