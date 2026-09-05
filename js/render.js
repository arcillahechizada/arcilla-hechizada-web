// ============================================================
// ARCILLA HECHIZADA — catálogo universal + carrito
// ============================================================
let PRODUCTOS = [];
let PIEZAS_UNICAS = [];
let OPINIONES = [];
let FAQ = [];
const WHATSAPP = '34722379095';
const EMAIL = 'arcillahechizada@gmail.com';
const CART_KEY = 'arcillaHechizadaCarrito';

async function cargarDatos() {
  const [productos, piezas, opiniones, faq] = await Promise.all([
    fetch('data/productos.json', {cache:'no-store'}).then(r => r.ok ? r.json() : {productos:[]}).catch(() => ({ productos: [] })),
    fetch('data/piezas-unicas.json', {cache:'no-store'}).then(r => r.ok ? r.json() : {piezas:[]}).catch(() => ({ piezas: [] })),
    fetch('data/opiniones.json', {cache:'no-store'}).then(r => r.ok ? r.json() : {opiniones:[]}).catch(() => ({ opiniones: [] })),
    fetch('data/faq.json', {cache:'no-store'}).then(r => r.ok ? r.json() : {faq:[]}).catch(() => ({ faq: [] }))
  ]);
  PRODUCTOS = Array.isArray(productos.productos) ? productos.productos : [];
  PIEZAS_UNICAS = Array.isArray(piezas.piezas) ? piezas.piezas : [];
  OPINIONES = Array.isArray(opiniones.opiniones) ? opiniones.opiniones : [];
  FAQ = Array.isArray(faq.faq) ? faq.faq : [];
  actualizarContadorCarrito();
}

function escHTML(valor = '') { return String(valor).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;'); }
function texto(valor = '') { return escHTML(valor).replace(/\n/g,'<br>'); }
function imagenProducto(prod) { return prod.imagenPrincipal || (Array.isArray(prod.galeria) && prod.galeria.length ? prod.galeria[0] : ''); }
function bloqueSinFoto() { return '<div class="foto-pendiente">Fotografía pendiente</div>'; }
function etiquetaEstado(estado) { return ({disponible:'Disponible', bajo_pedido:'Bajo pedido', agotado:'Agotado', vendido:'Vendido', reservada:'Reservada', vendida:'Vendida', oculto:'No publicado'})[estado] || estado || ''; }
function precioNumero(prod) { const n = Number(prod?.precio); return Number.isFinite(n) ? n : 0; }
function precioTexto(prod) { return Number.isFinite(Number(prod?.precio)) ? `${escHTML(Number(prod.precio).toFixed(2).replace('.',','))} €` : 'Consultar'; }
function bool(v) { return v === true || v === 'true'; }

function tarjetaProductoHTML(prod) {
  const estado = etiquetaEstado(prod.estado);
  return `<a class="tarjeta-producto" href="ficha.html?id=${encodeURIComponent(prod.id)}" data-id="${escHTML(prod.id)}">
    <div class="foto imagen-tarjeta">
      ${imagenProducto(prod) ? `<img src="${escHTML(imagenProducto(prod))}" alt="${escHTML(prod.nombre || 'Producto')}" loading="lazy">` : bloqueSinFoto()}
      ${estado ? `<span class="etiqueta ${prod.estado === 'vendido' || prod.estado === 'vendida' ? 'etiqueta-vendida' : 'etiqueta-disponible'}">${escHTML(estado)}</span>` : ''}
    </div>
    <div class="info info-tarjeta"><h3>${escHTML(prod.nombre || 'Producto')}</h3><p class="precio">${precioTexto(prod)}</p>${prod.descripcionCorta ? `<p>${texto(prod.descripcionCorta)}</p>` : ''}</div>
  </a>`;
}

function renderCategoria(containerId, categoriaSlug) {
  const container = document.getElementById(containerId); if (!container) return;
  const productos = PRODUCTOS.filter(p => p.categoria === categoriaSlug && p.estado !== 'oculto');
  container.innerHTML = productos.length ? productos.map(tarjetaProductoHTML).join('') : '<p class="aviso-pendiente">Todavía no hay productos publicados en esta categoría.</p>';
}
function renderPiezasUnicas(containerId) {
  const container = document.getElementById(containerId); if (!container) return;
  const piezas = PIEZAS_UNICAS.filter(p => p.estado !== 'oculto');
  container.innerHTML = piezas.map(tarjetaProductoHTML).join('');
}
function campoFicha(titulo, valor) { return valor !== undefined && valor !== null && valor !== '' ? `<section class="ficha-detalle"><h3>${escHTML(titulo)}</h3><p>${texto(valor)}</p></section>` : ''; }
function youtubeEmbed(url) {
  if (!url) return '';
  const match = String(url).match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/);
  return match ? `<div class="video-ficha"><iframe src="https://www.youtube.com/embed/${escHTML(match[1])}" title="Vídeo del producto" loading="lazy" allowfullscreen></iframe></div>` : `<p><a class="btn btn-secundario" href="${escHTML(url)}" target="_blank" rel="noopener">Ver vídeo</a></p>`;
}
function normalizarLista(lista) { if (!Array.isArray(lista)) return []; return lista.map(x => typeof x === 'string' ? {nombre:x.trim(),valor:x.trim()} : {nombre:(x.nombre||x.color||x.titulo||x.valor||'Opción').toString().trim(), valor:(x.valor||x.nombre||x.color||x.titulo||'Opción').toString().trim()}); }

function bloqueOpcionesProducto(prod) {
  const bloques = [];
  if (bool(prod.personalizable)) {
    let html = `<section class="opciones-ficha"><h3>Personalización</h3>`;
    if (prod.opcionesPersonalizacion) html += `<p>${texto(prod.opcionesPersonalizacion)}</p>`;
    const selectores = Array.isArray(prod.opcionesPersonalizacionCliente) ? prod.opcionesPersonalizacionCliente : [];
    if (bool(prod.activarSelectorPersonalizacion) && selectores.length) selectores.forEach((sel,i)=>{
      const opciones = normalizarLista(sel.opciones); if (!opciones.length) return;
      html += `<div class="campo-opcion"><label for="personalizacion-${i}">${escHTML(sel.nombre || 'Elige una opción')}</label><select id="personalizacion-${i}" data-tipo="personalizacion" data-label="${escHTML(sel.nombre || 'Personalización')}">${opciones.map(o=>`<option value="${escHTML(o.valor)}">${escHTML(o.nombre)}</option>`).join('')}</select></div>`;
    });
    html += `</section>`; bloques.push(html);
  }
  if (bool(prod.mostrarVariantes)) {
    const variantes = Array.isArray(prod.variantes) ? prod.variantes.filter(v=>v && v.disponible !== false && v.disponible !== 'false') : [];
    if (variantes.length) bloques.push(`<section class="opciones-ficha"><h3>Variantes / colores</h3><div class="campo-opcion"><label for="select-variante">Elige tu opción</label><select id="select-variante" data-tipo="variante" data-label="Color / variante">${variantes.map(v=>`<option value="${escHTML(v.color||v.nombre||'')}">${escHTML(v.color||v.nombre||'Variante')}${v.precio!==undefined&&v.precio!==''?` — ${escHTML(v.precio)} €`:''}</option>`).join('')}</select></div></section>`);
  }
  if (bool(prod.mostrarCollarLlavero)) {
    let formatos = normalizarLista(prod.formatosDisponibles); if (!formatos.length) formatos=[{nombre:'Collar',valor:'Collar'},{nombre:'Llavero',valor:'Llavero'}];
    bloques.push(`<section class="opciones-ficha"><h3>Formato</h3><div class="campo-opcion"><label for="select-formato">¿Cómo lo quieres?</label><select id="select-formato" data-tipo="formato" data-label="Formato">${formatos.map(o=>`<option value="${escHTML(o.valor)}">${escHTML(o.nombre)}</option>`).join('')}</select></div></section>`);
  }
  if (bool(prod.permiteOtroColor)) bloques.push(`<section class="opciones-ficha"><h3>Otro color</h3><p>Puedes solicitar otro color aunque no aparezca entre las fotografías.</p><div class="campo-opcion"><label for="input-otro-color">Color que te gustaría</label><input id="input-otro-color" type="text" placeholder="Escribe aquí el color" data-tipo="otro-color" data-label="Otro color"></div></section>`);
  return bloques.join('');
}

function galeriaHTML(prod) {
  const fotos=[]; [imagenProducto(prod)].concat(Array.isArray(prod.galeria)?prod.galeria:[]).forEach(f=>{if(f&&!fotos.includes(f))fotos.push(f);});
  const principal = fotos.length ? `<img id="foto-principal-ficha" src="${escHTML(fotos[0])}" alt="${escHTML(prod.nombre||'Producto')}">` : bloqueSinFoto();
  return `<div class="galeria-producto"><div class="foto-principal">${principal}</div>${fotos.length>1?`<div class="galeria-miniaturas">${fotos.map((f,i)=>`<img class="miniatura ${i===0?'activa':''}" src="${escHTML(f)}" alt="Foto ${i+1}" data-foto="${escHTML(f)}" loading="lazy">`).join('')}</div>`:''}${prod.video?youtubeEmbed(prod.video):''}</div>`;
}

function obtenerOpcionesSeleccionadas() {
  const detalles=[]; document.querySelectorAll('#ficha-contenido select[data-tipo], #ficha-contenido input[data-tipo]').forEach(el=>{const v=(el.value||'').trim();if(v)detalles.push(`${el.dataset.label||'Opción'}: ${v}`);}); return detalles;
}
function datosSeleccionFicha(prod) {
  const opciones={}; document.querySelectorAll('#ficha-contenido select[data-tipo], #ficha-contenido input[data-tipo]').forEach(el=>{const v=(el.value||'').trim();if(v)opciones[el.dataset.label||'Opción']=v;}); return opciones;
}
function crearItemCarrito(prod, opciones) { return { key: `${prod.id}::${JSON.stringify(opciones)}`, id:prod.id, nombre:prod.nombre, precio:precioNumero(prod), imagen:imagenProducto(prod), opciones:opciones||{}, cantidad:1, pagos:Array.isArray(prod.formasPagoDisponibles)?prod.formasPagoDisponibles.filter(Boolean):[] }; }
function leerCarrito(){ try { const c=JSON.parse(localStorage.getItem(CART_KEY)||'[]'); return Array.isArray(c)?c:[]; } catch(e){return [];} }
function guardarCarrito(c){ localStorage.setItem(CART_KEY,JSON.stringify(c)); actualizarContadorCarrito(); }
function actualizarContadorCarrito(){ const n=leerCarrito().reduce((s,i)=>s+(Number(i.cantidad)||0),0); document.querySelectorAll('#contador-carrito').forEach(e=>e.textContent=n); }
function añadirAlCarrito(prod, opciones){
  const c=leerCarrito(), item=crearItemCarrito(prod,opciones); const existente=c.find(x=>x.key===item.key);
  if(existente) existente.cantidad += 1; else c.push(item); guardarCarrito(c);
  mostrarAvisoCarrito(`${prod.nombre} se ha añadido al carrito.`);
}
function mostrarAvisoCarrito(txt){ let a=document.getElementById('aviso-carrito'); if(!a){a=document.createElement('div');a.id='aviso-carrito';a.className='aviso-carrito';document.body.appendChild(a);} a.textContent=txt;a.classList.add('visible');clearTimeout(window._avisoCarrito);window._avisoCarrito=setTimeout(()=>a.classList.remove('visible'),2600); }

function mensajeConsultaProducto(prod){
  const detalles=obtenerOpcionesSeleccionadas(); let m=`Hola, me gustaría consultar/pedir este producto de Arcilla Hechizada:\n\n${prod.nombre} — ${precioTexto(prod)}`;
  if(detalles.length)m+=`\n${detalles.map(x=>'\n'+x).join('')}`;
  if(prod.estado==='bajo_pedido')m+='\n\nSé que este producto es bajo pedido.';
  return m;
}
function actualizarPedido(){ const prod=window.PRODUCTO_ACTUAL;if(!prod)return;const m=mensajeConsultaProducto(prod);const wa=document.getElementById('btn-wa');const email=document.getElementById('btn-email');if(wa)wa.href=`https://wa.me/${WHATSAPP}?text=${encodeURIComponent(m)}`;if(email)email.href=`mailto:${EMAIL}?subject=${encodeURIComponent('Consulta sobre '+(prod.nombre||'producto'))}&body=${encodeURIComponent(m)}`; }

function renderFicha(){
  const id=new URLSearchParams(window.location.search).get('id')||new URLSearchParams(window.location.search).get('producto'), contenedor=document.getElementById('ficha-contenido'); if(!contenedor)return;
  if(!id){contenedor.innerHTML='<p class="aviso-pendiente">No se ha indicado ningún producto.</p>';return;}
  const prod=PRODUCTOS.find(p=>p.id===id)||PIEZAS_UNICAS.find(p=>p.id===id); if(!prod||prod.estado==='oculto'){contenedor.innerHTML='<p class="aviso-pendiente">Este producto todavía no está publicado.</p>';return;}
  window.PRODUCTO_ACTUAL=prod; document.title=`${prod.nombre||'Producto'} — Arcilla Hechizada`;
  const estado=etiquetaEstado(prod.estado), vendida=prod.estado==='vendido'||prod.estado==='vendida', sePuedeComprar=bool(prod.activarCompra)&&!['agotado','vendido','vendida','reservada'].includes(prod.estado)&&precioNumero(prod)>=0;
  const acciones=sePuedeComprar?`<div class="ficha-botones ficha-botones-tienda"><button id="btn-carrito" class="btn btn-carrito" type="button">Añadir al carrito</button><a id="btn-wa" href="#" class="btn btn-whatsapp-producto" target="_blank" rel="noopener">WhatsApp · dudas / personalizar</a><a id="btn-email" href="#" class="btn btn-secundario">Enviar correo</a></div>`:'';
  contenedor.innerHTML=`<article class="ficha-producto ficha-universal">${galeriaHTML(prod)}<div class="detalles-ficha"><span class="eyebrow">${escHTML(prod.categoria||'Pieza artesanal')}</span><h1>${escHTML(prod.nombre||'Producto')}</h1><div class="estado-ficha"><span class="etiqueta ${vendida?'etiqueta-vendida':'etiqueta-disponible'}">${escHTML(estado)}</span></div><p class="ficha-precio">${precioTexto(prod)}</p>${campoFicha('Descripción',prod.descripcionCompleta||prod.descripcion)}${campoFicha('Simbolismo y uso',prod.simbolismo||prod.simbolismoUso)}${campoFicha('Materiales',prod.materiales)}${campoFicha('Medidas',prod.medidas)}${campoFicha('Cuidados',prod.cuidados)}${campoFicha('Elaboración',prod.elaboracion||'100% a mano.')}${bloqueOpcionesProducto(prod)}${acciones}${!sePuedeComprar?'<p class="aviso-pendiente aviso-no-compra">Este producto no está disponible para compra online en este momento.</p>':''}</div></article>`;
  contenedor.querySelectorAll('.miniatura').forEach(mini=>mini.addEventListener('click',()=>{const p=contenedor.querySelector('#foto-principal-ficha');if(p)p.src=mini.dataset.foto;contenedor.querySelectorAll('.miniatura').forEach(m=>m.classList.remove('activa'));mini.classList.add('activa');}));
  if(sePuedeComprar){document.getElementById('btn-carrito').addEventListener('click',()=>añadirAlCarrito(prod,datosSeleccionFicha(prod)));document.querySelectorAll('#ficha-contenido select[data-tipo], #ficha-contenido input[data-tipo]').forEach(el=>el.addEventListener('change',actualizarPedido));document.querySelectorAll('#ficha-contenido input[data-tipo]').forEach(el=>el.addEventListener('input',actualizarPedido));actualizarPedido();}
}

function calcularEnvio(cp){
  const s=String(cp||'').replace(/\D/g,''); if(!/^\d{5}$/.test(s))return null;
  const pref=Number(s.slice(0,2));
  if([35,38,51,52].includes(pref))return 7.50;
  if(pref===17)return 4.50;
  return 6.50;
}
function metodosPagoCarrito(c){
  const listas=c.map(i=>Array.isArray(i.pagos)&&i.pagos.length?i.pagos:['Bizum','PayPal','Efectivo']); if(!listas.length)return ['Bizum','PayPal','Efectivo'];
  const inter=listas.reduce((a,b)=>a.filter(x=>b.includes(x)),listas[0].slice()); if(inter.length)return inter;
  return [...new Set(listas.flat())];
}
function renderCarrito(){
  const root=document.getElementById('carrito-contenido');if(!root)return;let c=leerCarrito();
  if(!c.length){root.innerHTML=`<div class="carrito-vacio"><h1>Tu carrito está vacío</h1><p>Cuando encuentres algo que quieras conservar, añádelo aquí.</p><a class="btn btn-primario" href="tienda.html">Explorar la tienda</a></div>`;return;}
  const subtotal=()=>c.reduce((s,i)=>s+(Number(i.precio)||0)*(Number(i.cantidad)||1),0), pagos=metodosPagoCarrito(c);
  function pintar(){const sub=subtotal(),cp=document.getElementById('cp-envio')?.value||'',env=calcularEnvio(cp),total=env===null?sub:sub+env;
    root.innerHTML=`<div class="carrito-layout"><section class="carrito-ticket"><div class="ticket-cabecera"><span>Arcilla Hechizada</span><span>Tu pedido</span></div><div class="carrito-items">${c.map((i,idx)=>`<div class="carrito-item"><div class="carrito-item-foto">${i.imagen?`<img src="${escHTML(i.imagen)}" alt="${escHTML(i.nombre)}">`:'✦'}</div><div class="carrito-item-info"><h3>${escHTML(i.nombre)}</h3>${Object.entries(i.opciones||{}).map(([k,v])=>`<small>${escHTML(k)}: ${escHTML(v)}</small>`).join('')}<strong>${(Number(i.precio)||0).toFixed(2).replace('.',',')} €</strong></div><div class="carrito-cantidad"><button type="button" data-action="menos" data-i="${idx}" aria-label="Reducir cantidad">−</button><span>${i.cantidad}</span><button type="button" data-action="mas" data-i="${idx}" aria-label="Aumentar cantidad">+</button></div><button type="button" class="carrito-eliminar" data-action="eliminar" data-i="${idx}">Eliminar</button></div>`).join('')}</div><div class="ticket-linea"><span>Subtotal</span><strong>${sub.toFixed(2).replace('.',',')} €</strong></div><div class="ticket-linea envio-linea"><span>Gastos de envío</span><strong>${env===null?'Se calcularán':env.toFixed(2).replace('.',',')+' €'}</strong></div><div class="ticket-total"><span>TOTAL</span><strong>${total.toFixed(2).replace('.',',')} €</strong></div></section><aside class="carrito-pago"><h2>Finalizar pedido</h2><label for="cp-envio">Código postal</label><input id="cp-envio" inputmode="numeric" maxlength="5" placeholder="Código postal" value="${escHTML(cp)}"><p class="ayuda-cp">Introduce el código postal de entrega para calcular los gastos de envío.</p><button id="btn-pagar" class="btn btn-pagar" type="button">PAGAR</button><label for="metodo-pago" class="label-pago">Forma de pago</label><select id="metodo-pago">${pagos.map(p=>`<option>${escHTML(p)}</option>`).join('')}</select><p class="aviso-envio">Aviso: los gastos de envío se calculan según el código postal. Envíos desde <strong>4,50 €</strong> con <span class="marca-correos">Correos</span>. Más información en <a href="envios-y-recogida.html">Preguntas, Gastos y Envíos</a>.</p><p class="aviso-envio">El pago se gestiona contigo por WhatsApp según la forma de pago que elijas. También puedes consultar cualquier duda antes de confirmar.</p></aside></div>`;
    root.querySelectorAll('[data-action]').forEach(b=>b.addEventListener('click',()=>{const i=Number(b.dataset.i),a=b.dataset.action;if(a==='mas')c[i].cantidad++;if(a==='menos')c[i].cantidad=Math.max(1,c[i].cantidad-1);if(a==='eliminar')c.splice(i,1);guardarCarrito(c);pintar();}));
    const cpInput=document.getElementById('cp-envio');
    const actualizarTotales=()=>{const env3=calcularEnvio(cpInput.value),linea=document.querySelector('.envio-linea strong'),totalEl=document.querySelector('.ticket-total strong');if(linea)linea.textContent=env3===null?'Se calcularán':env3.toFixed(2).replace('.',',')+' €';if(totalEl)totalEl.textContent=(subtotal()+ (env3||0)).toFixed(2).replace('.',',')+' €';};
    cpInput.addEventListener('input',actualizarTotales);
    document.getElementById('btn-pagar').addEventListener('click',()=>{const cpv=cpInput.value.trim(),env2=calcularEnvio(cpv);if(!env2){alert('Introduce un código postal válido de 5 cifras para calcular el envío.');return;}const metodo=document.getElementById('metodo-pago').value;const sub2=subtotal(),tot=sub2+env2;let m='Hola, quiero realizar este pedido en Arcilla Hechizada:\n\n';c.forEach(i=>{m+=`${i.nombre} × ${i.cantidad} = ${(i.precio*i.cantidad).toFixed(2).replace('.',',')} €\n`;Object.entries(i.opciones||{}).forEach(([k,v])=>m+=`  ${k}: ${v}\n`);});m+=`\nSUBTOTAL: ${sub2.toFixed(2).replace('.',',')} €\nGASTOS DE ENVÍO: ${env2.toFixed(2).replace('.',',')} €\nTOTAL: ${tot.toFixed(2).replace('.',',')} €\n\nCódigo postal de entrega: ${cpv}\nForma de pago elegida: ${metodo}\n\nQuedo a la espera de tus indicaciones para realizar el pago.`;window.location.href=`https://wa.me/${WHATSAPP}?text=${encodeURIComponent(m)}`;});
  }
  pintar();
}

function inyectarCarritoHeader(){
  document.querySelectorAll('header.site .header-inner').forEach(h=>{if(h.querySelector('.enlace-carrito'))return;const a=document.createElement('a');a.href='carrito.html';a.className='enlace-carrito';a.innerHTML='🛒 Carrito <span id="contador-carrito">0</span>';const wa=h.querySelector('.btn-whatsapp-header');wa?wa.insertAdjacentElement('afterend',a):h.appendChild(a);});
  document.querySelectorAll('header.site .menu-movil').forEach(m=>{if(m.querySelector('.enlace-carrito-movil'))return;const a=document.createElement('a');a.href='carrito.html';a.className='enlace-carrito-movil';a.textContent='🛒 Carrito';m.prepend(a);});
  actualizarContadorCarrito();
}

document.addEventListener('DOMContentLoaded',()=>{inyectarCarritoHeader();});
