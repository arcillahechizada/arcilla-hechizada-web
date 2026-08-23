// Arcilla Hechizada — motor de catálogo
// Carga los datos desde archivos JSON reales (data/productos.json, etc.)
// Estos son los mismos archivos que edita el panel de administración (/admin).

let PRODUCTOS = [];
let PIEZAS_UNICAS = [];
let OPINIONES = [];
let FAQS = [];

async function cargarDatos() {
  try {
    const [productos, piezas, opiniones, faqs] = await Promise.all([
      fetch('data/productos.json').then(r => r.json()),
      fetch('data/piezas-unicas.json').then(r => r.json()),
      fetch('data/opiniones.json').then(r => r.json()).catch(() => ({ opiniones: [] })),
      fetch('data/faq.json').then(r => r.json()).catch(() => ({ faq: [] }))
    ]);
    // Los archivos JSON están envueltos en un objeto (ej. { "productos": [...] })
    // porque así es como el panel de edición (Decap CMS) guarda cada colección
    // de un único archivo. Aquí se "desenvuelven" para que el resto del código
    // siga trabajando con listas normales, como hasta ahora.
    PRODUCTOS = productos.productos || [];
    PIEZAS_UNICAS = piezas.piezas || [];
    OPINIONES = opiniones.opiniones || [];
    FAQS = faqs.faq || [];
    return true;
  } catch (err) {
    console.warn('No se pudieron cargar los datos (data/*.json). Si estás abriendo el archivo index.html directamente desde tu ordenador, esto puede fallar por seguridad del navegador — en Netlify funcionará correctamente.', err);
    return false;
  }
}

// Renderiza opiniones publicadas
function renderOpiniones(containerId) {
  const el = document.getElementById(containerId);
  if (!el) return;
  const publicadas = OPINIONES.filter(o => o.estado === "publicada");
  el.innerHTML = publicadas.map(o => `
    <div class="tarjeta-opinion">
      <p style="color:var(--carbon);">"${o.texto}"</p>
      <div class="autor">${o.nombre || "Clienta anónima"}</div>
      ${o.fecha ? `<div class="fecha">${o.fecha}</div>` : ""}
    </div>`).join("");
}

// Renderiza FAQ publicadas
function renderFAQ(containerId) {
  const el = document.getElementById(containerId);
  if (!el) return;
  const publicadas = FAQS.filter(f => f.estado === "publicada");
  el.innerHTML = publicadas.map(f => `
    <details class="faq-item">
      <summary>${f.pregunta}</summary>
      <p>${f.respuesta}</p>
    </details>`).join("");
}

const PLACEHOLDER_TXT = "Foto pendiente";

function precioTexto(p) {
  return (p === null || p === undefined) ? "Precio pendiente" : (p.toFixed(2).replace(".00","") + " €");
}

function estadoEtiqueta(estado) {
  const map = {
    disponible: { texto: "Disponible", clase: "etiqueta-disponible" },
    agotado: { texto: "Agotado", clase: "etiqueta-vendida" },
    bajo_pedido: { texto: "Bajo pedido", clase: "etiqueta-disponible" },
    vendido: { texto: "VENDIDA ✦", clase: "etiqueta-vendida" },
    reservada: { texto: "Reservada", clase: "etiqueta-vendida" }
  };
  return map[estado] || map.disponible;
}

// Construye una tarjeta de producto (HTML string)
function tarjetaProductoHTML(prod, esPiezaUnica) {
  const img = prod.imagenPrincipal
    ? `<img src="${prod.imagenPrincipal}" alt="${prod.nombre} — Arcilla Hechizada" loading="lazy">`
    : PLACEHOLDER_TXT;
  const et = estadoEtiqueta(prod.estado);
  const etiquetaHTML = `<span class="etiqueta ${et.clase}">${et.texto}</span>`;
  const uniqueTag = esPiezaUnica ? `<span class="etiqueta etiqueta-unica">Pieza única</span>` : "";
  return `
    <a class="tarjeta-producto${esPiezaUnica ? ' pieza-unica' : ''}" href="ficha.html?id=${prod.id}${esPiezaUnica ? '&tipo=unica' : ''}">
      <div class="foto">${etiquetaHTML}${img}</div>
      <div class="info">
        ${uniqueTag}
        <h3>${prod.nombre}</h3>
        <span class="precio">${precioTexto(prod.precio)}</span>
      </div>
    </a>`;
}

// Renderiza una cuadrícula de productos por categoría dentro de un contenedor
function renderCategoria(containerId, categoriaSlug) {
  const el = document.getElementById(containerId);
  if (!el) return;
  const productos = PRODUCTOS.filter(p => p.categoria === categoriaSlug && p.estado !== "oculto");
  el.innerHTML = productos.length
    ? productos.map(p => tarjetaProductoHTML(p, false)).join("")
    : `<p class="aviso-pendiente">Todavía no hay productos visibles en esta categoría.</p>`;
}

// Renderiza destacados (los primeros N con foto real primero)
function renderDestacados(containerId, n) {
  const el = document.getElementById(containerId);
  if (!el) return;
  const visibles = PRODUCTOS.filter(p => p.estado !== "oculto");
  const conFoto = visibles.filter(p => p.imagenPrincipal);
  const sinFoto = visibles.filter(p => !p.imagenPrincipal);
  const lista = conFoto.concat(sinFoto).slice(0, n);
  el.innerHTML = lista.map(p => tarjetaProductoHTML(p, false)).join("");
}

// Renderiza piezas únicas separadas por estado
function renderPiezasUnicas(disponiblesId, vendidasId) {
  const disponiblesEl = document.getElementById(disponiblesId);
  const vendidasEl = document.getElementById(vendidasId);
  const disponibles = PIEZAS_UNICAS.filter(p => p.estado !== "vendida");
  const vendidas = PIEZAS_UNICAS.filter(p => p.estado === "vendida");

  if (disponiblesEl) {
    disponiblesEl.innerHTML = disponibles.length
      ? disponibles.map(p => tarjetaProductoHTML({...p, categoria:'unica', estado: p.estado === 'reservada' ? 'reservada' : 'disponible'}, true)).join("")
      : `<p class="aviso-pendiente">Todavía no se han cargado piezas únicas reales. En cuanto me confirmes cada pieza, aparecerán aquí automáticamente.</p>`;
  }
  if (vendidasEl) {
    vendidasEl.innerHTML = vendidas.length
      ? vendidas.map(p => tarjetaProductoHTML({...p, categoria:'unica', estado:'vendido'}, true)).join("")
      : `<p class="aviso-pendiente">Todavía no hay piezas en el archivo. Cuando marques una pieza única como "Vendida", aparecerá aquí automáticamente.</p>`;
  }
}

// Ficha de producto dinámica: lee ?id=xxx de la URL y pinta la página
function renderFicha() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");
  const esUnica = params.get("tipo") === "unica";
  const lista = esUnica ? PIEZAS_UNICAS : PRODUCTOS;
  const prod = lista.find(p => p.id === id && p.estado !== "oculto");

  const cont = document.getElementById("ficha-contenido");
  if (!cont) return;

  if (!prod) {
    cont.innerHTML = `<p>No se ha encontrado este producto. <a href="tienda.html">Volver a la tienda</a>.</p>`;
    return;
  }

  document.title = prod.nombre + " — Arcilla Hechizada";
  const metaDesc = document.querySelector('meta[name="description"]');
  if (metaDesc) metaDesc.setAttribute("content", (prod.descripcionCorta || prod.nombre) + " — Arcilla Hechizada.");
  let linkCanonical = document.querySelector('link[rel="canonical"]');
  if (!linkCanonical) {
    linkCanonical = document.createElement('link');
    linkCanonical.setAttribute('rel', 'canonical');
    document.head.appendChild(linkCanonical);
  }
  const sufijoUnica = esUnica ? "&tipo=unica" : "";
  linkCanonical.setAttribute('href', 'https://www.arcillahechizada.com/ficha.html?id=' + encodeURIComponent(prod.id) + sufijoUnica);

  const galeria = (prod.galeria && prod.galeria.length) ? prod.galeria : (prod.imagenPrincipal ? [prod.imagenPrincipal] : []);
  const galeriaHTML = galeria.length
    ? `<div class="imagen-placeholder" style="aspect-ratio:1/1; background:none; border:none; padding:0;">
         <img src="${galeria[0]}" alt="${prod.nombre} — Arcilla Hechizada" style="border-radius:var(--radio-tarjeta); border:1px solid var(--linea);">
       </div>
       ${galeria.length > 1 ? `<div style="display:flex; gap:8px; margin-top:8px; flex-wrap:wrap;">
         ${galeria.map(g => `<img src="${g}" alt="${prod.nombre}" style="width:70px; height:70px; object-fit:cover; border-radius:8px; border:1px solid var(--linea);">`).join("")}
       </div>` : ""}`
    : `<div class="imagen-placeholder" style="aspect-ratio:1/1;">Fotografías del producto — pendientes de incorporar</div>`;

  const et = estadoEtiqueta(prod.estado);

  const variantesHTML = (prod.variantes && prod.variantes.length) ? `
    <div class="ficha-detalle">
      <h3>Colores / variantes</h3>
      <div style="display:flex; gap:10px; flex-wrap:wrap;">
        ${prod.variantes.map(v => `
          <div style="text-align:center; font-size:.8rem;">
            <img src="${v.imagenes[0]}" alt="${prod.nombre} en ${v.color}" style="width:60px;height:60px;object-fit:cover;border-radius:8px;border:1px solid var(--linea);">
            <div>${v.color}</div>
          </div>`).join("")}
      </div>
      ${prod.permiteOtroColor ? `<p style="margin-top:10px;">¿No ves el color que buscas? <a href="#" data-whatsapp-producto="${prod.nombre} en otro color a consultar">Pídelo por WhatsApp</a>.</p>` : ""}
    </div>` : "";

  const personalizacionHTML = prod.personalizable
    ? `<div class="ficha-botones-extra"><a href="personalizados.html" class="btn btn-secundario">Personaliza el tuyo</a></div>`
    : "";

  cont.innerHTML = `
    <p style="font-size:.85rem;"><a href="tienda.html">Tienda</a> / <a href="tienda.html#${prod.categoria}">${prod.categoria}</a> / ${prod.nombre}</p>
    <div class="ficha-producto">
      <div>${galeriaHTML}</div>
      <div>
        <span class="etiqueta ${et.clase}" style="position:static; display:inline-block; margin-bottom:10px;">${et.texto}</span>
        <h1>${prod.nombre}</h1>
        <p class="ficha-precio">${precioTexto(prod.precio)}</p>
        <p>${prod.descripcionCorta || ""}</p>
        <div class="ficha-botones">
          <a href="#" class="btn btn-primario" data-whatsapp-producto="${prod.nombre}">Quiero uno</a>
          ${personalizacionHTML}
        </div>
        ${variantesHTML}
        <div class="ficha-detalle"><h3>Descripción</h3><p class="${prod.descripcionCompleta.includes('PENDIENTE') ? 'aviso-pendiente':''}">${prod.descripcionCompleta}</p></div>
        <div class="ficha-detalle"><h3>Simbolismo y uso</h3><p class="${prod.simbolismo.includes('PENDIENTE') ? 'aviso-pendiente':''}">${prod.simbolismo}</p></div>
        <div class="ficha-detalle"><h3>Materiales</h3><p class="${prod.materiales.includes('PENDIENTE') ? 'aviso-pendiente':''}">${prod.materiales}</p></div>
        <div class="ficha-detalle"><h3>Medidas</h3><p class="${prod.medidas.includes('PENDIENTE') ? 'aviso-pendiente':''}">${prod.medidas}</p></div>
        <div class="ficha-detalle"><h3>Cuidados</h3><p class="${prod.cuidados.includes('PENDIENTE') ? 'aviso-pendiente':''}">${prod.cuidados}</p></div>
        <div class="ficha-detalle"><h3>Elaboración</h3><p class="${prod.elaboracion.includes('PENDIENTE') ? 'aviso-pendiente':''}">${prod.elaboracion}</p></div>
      </div>
    </div>`;

  // Vuelve a activar los enlaces de WhatsApp generados dinámicamente
  document.querySelectorAll('[data-whatsapp-producto]').forEach(function (el) {
    var nombreProducto = el.getAttribute('data-whatsapp-producto');
    var mensaje = 'Hola 👋 me gustaría adquirir el artículo "' + nombreProducto + '" de Arcilla Hechizada.';
    el.href = 'https://wa.me/34722379095?text=' + encodeURIComponent(mensaje);
  });
}
