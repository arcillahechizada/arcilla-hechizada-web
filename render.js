// ============================================================
// ARCILLA HECHIZADA — catálogo universal + carrito
// ============================================================
let PRODUCTOS = [], PIEZAS_UNICAS = [], OPINIONES = [], FAQ = [], INICIO = {};
const WHATSAPP='34722379095', EMAIL='arcillahechizada@gmail.com', CART_KEY='arcillaHechizadaCarrito';
const BIZUM='722379095';
const FORMSPREE_ENDPOINT='https://formspree.io/f/xqpanapp';
const PAYPAL_BACKEND_BASE=window.ARCILLA_PAYPAL_BACKEND||'https://wonderful-sawine-8541d2.netlify.app/.netlify/functions';

const GITHUB_REPO='arcillahechizada/arcilla-hechizada-web';
async function cargarCarpetaProductosGitHub(folder){
  const api=`https://api.github.com/repos/${GITHUB_REPO}/contents/${folder}?ref=main`;
  const r=await fetch(api,{cache:'no-store',headers:{'Accept':'application/vnd.github+json'}});
  if(!r.ok) throw new Error('No se pudo leer '+folder);
  const files=await r.json();
  const jsons=Array.isArray(files)?files.filter(f=>f.type==='file'&&/\.json$/i.test(f.name)):[];
  const datos=await Promise.all(jsons.map(async f=>{
    const rr=await fetch(f.download_url+`?t=${Date.now()}`,{cache:'no-store'});
    if(!rr.ok) return null;
    try{return await rr.json();}catch(e){return null;}
  }));
  return datos.filter(Boolean);
}
async function cargarDatos(){
  const [productosFallback,piezas,opiniones,faq,inicio]=await Promise.all([
    fetch('data/productos.json',{cache:'no-store'}).then(r=>r.ok?r.json():{productos:[]}).catch(()=>({productos:[]})),
    fetch('data/piezas-unicas.json',{cache:'no-store'}).then(r=>r.ok?r.json():{piezas:[]}).catch(()=>({piezas:[]})),
    fetch('data/opiniones.json',{cache:'no-store'}).then(r=>r.ok?r.json():{opiniones:[]}).catch(()=>({opiniones:[]})),
    fetch('data/faq.json',{cache:'no-store'}).then(r=>r.ok?r.json():{faq:[]}).catch(()=>({faq:[]})),
    fetch('data/inicio.json',{cache:'no-store'}).then(r=>r.ok?r.json():{}).catch(()=>({}))
  ]);

  // Cada carpeta se carga de forma independiente. Si una falla, las demás
  // siguen funcionando y nunca hacen desaparecer el catálogo general.
  const [generalesResult,infusionesResult,inciensosResult]=await Promise.all([
    cargarCarpetaProductosGitHub('data/productos').catch(()=>[]),
    cargarCarpetaProductosGitHub('data/infusiones').catch(()=>[]),
    cargarCarpetaProductosGitHub('data/inciensos').catch(()=>[])
  ]);

  const fallbackGenerales=Array.isArray(productosFallback.productos)
    ? productosFallback.productos.filter(p=>p.categoria!=='infusiones'&&p.categoria!=='inciensos')
    : [];

  const generales=generalesResult.length?generalesResult:fallbackGenerales;
  const infusiones=infusionesResult.map(p=>({...p,categoria:'infusiones'}));
  const inciensos=inciensosResult.map(p=>({...p,categoria:'inciensos'}));

  PRODUCTOS=[...generales,...infusiones,...inciensos];
  PRODUCTOS.sort(ordenProductos);

  PIEZAS_UNICAS=Array.isArray(piezas.piezas)?piezas.piezas:[];
  OPINIONES=Array.isArray(opiniones.opiniones)?opiniones.opiniones:[];
  FAQ=Array.isArray(faq.faq)?faq.faq:[];
  INICIO=inicio&&typeof inicio==='object'?inicio:{};
  actualizarContadorCarrito();
}
function ordenProductos(a,b){
  const oa=Number.isFinite(Number(a.orden))?Number(a.orden):999999;
  const ob=Number.isFinite(Number(b.orden))?Number(b.orden):999999;
  if(oa!==ob)return oa-ob;
  return String(a.nombre||'').localeCompare(String(b.nombre||''),'es',{sensitivity:'base'});
}
function escHTML(v=''){return String(v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;');}
function texto(v=''){return escHTML(v).replace(/\n/g,'<br>');}
function precioNumero(p){const n=Number(p?.precio);return Number.isFinite(n)?n:0;}
function precioTexto(p){return Number.isFinite(Number(p?.precio))?`${Number(p.precio).toFixed(2).replace('.',',')} €`:'Consultar';}
function bool(v){return v===true||v==='true';}
function etiquetaEstado(e){return ({disponible:'Disponible',bajo_pedido:'Bajo pedido',agotado:'Agotado',vendido:'Vendido',reservada:'Reservada',vendida:'Vendida',oculto:'No publicado'})[e]||e||'';}
function imagenProducto(p){return p.imagenPrincipal||(Array.isArray(p.galeria)&&p.galeria[0])||'';}
function bloqueSinFoto(){return '<div class="foto-pendiente">Fotografía pendiente</div>';}
function tarjetaProductoHTML(p){const est=etiquetaEstado(p.estado);return `<a class="tarjeta-producto" href="ficha.html?id=${encodeURIComponent(p.id)}"><div class="foto imagen-tarjeta">${imagenProducto(p)?`<img src="${escHTML(imagenProducto(p))}" alt="${escHTML(p.nombre||'Producto')}" loading="lazy">`:bloqueSinFoto()}${est?`<span class="etiqueta ${['vendido','vendida'].includes(p.estado)?'etiqueta-vendida':'etiqueta-disponible'}">${escHTML(est)}</span>`:''}</div><div class="info info-tarjeta"><h3>${escHTML(p.nombre||'Producto')}</h3><p class="precio">${precioTexto(p)}</p>${p.descripcionCorta?`<p>${texto(p.descripcionCorta)}</p>`:''}</div></a>`;}

function mediaInicioHTML(seccion, alt){
  const datos=INICIO&&INICIO[seccion] ? INICIO[seccion] : {};
  const media=Array.isArray(datos.media)?datos.media.filter(x=>x&&(x.src||x.video)):[];
  if(!media.length) return '<div class="inicio-media-placeholder">Foto o vídeo pendiente de incorporar</div>';
  const id='inicio-media-'+seccion;
  return `<div class="inicio-media" id="${id}" data-count="${media.length}">
    <div class="inicio-media-viewport">
      ${media.map((m,i)=>{
        const tipo=String(m.tipo||'imagen').toLowerCase();
        const src=m.src||m.video||'';
        const activo=i===0?' activa':'';
        const caption=m.titulo?`<div class="inicio-media-caption">${escHTML(m.titulo)}</div>`:'';
        if(tipo==='video') return `<div class="inicio-media-slide${activo}" data-index="${i}"><video controls playsinline preload="metadata" src="${escHTML(src)}" aria-label="${escHTML(alt)}"></video>${caption}</div>`;
        return `<div class="inicio-media-slide${activo}" data-index="${i}"><img src="${escHTML(src)}" alt="${escHTML(m.alt||alt)}" loading="lazy">${caption}</div>`;
      }).join('')}
    </div>
    ${media.length>1?`<button class="inicio-media-prev" type="button" aria-label="Anterior">‹</button><button class="inicio-media-next" type="button" aria-label="Siguiente">›</button><div class="inicio-media-dots">${media.map((_,i)=>`<button type="button" class="inicio-media-dot${i===0?' activa':''}" data-index="${i}" aria-label="Ir a la imagen ${i+1}"></button>`).join('')}</div>`:''}
  </div>`;
}
function renderInicio(){
  const map=[['hero','hero-media','Imagen o vídeo del taller o pieza destacada'],['hecho_a_mano','manos-media','Manos trabajando la arcilla'],['personalizacion','personalizacion-media','Pieza personalizada'],['taller','taller-media','Taller o artesana']];
  map.forEach(([key,id,alt])=>{const c=document.getElementById(id);if(c)c.innerHTML=mediaInicioHTML(key,alt);});
  document.querySelectorAll('.inicio-media').forEach(g=>{
    const slides=[...g.querySelectorAll('.inicio-media-slide')],dots=[...g.querySelectorAll('.inicio-media-dot')];
    if(slides.length<2)return;
    let n=0;
    const show=i=>{n=(i+slides.length)%slides.length;slides.forEach((x,j)=>x.classList.toggle('activa',j===n));dots.forEach((x,j)=>x.classList.toggle('activa',j===n));};
    g.querySelector('.inicio-media-prev')?.addEventListener('click',()=>show(n-1));
    g.querySelector('.inicio-media-next')?.addEventListener('click',()=>show(n+1));
    dots.forEach(d=>d.addEventListener('click',()=>show(Number(d.dataset.index)||0)));
  });
}

function renderCategoria(id,cat){const c=document.getElementById(id);if(!c)return;const ps=PRODUCTOS.filter(p=>p.categoria===cat&&p.estado!=='oculto'&&p.coleccion!=='linea_efecto_piedra').sort(ordenProductos);c.innerHTML=ps.length?ps.map(tarjetaProductoHTML).join(''):'<p class="aviso-pendiente">Todavía no hay productos publicados en esta categoría.</p>';}
function renderColeccion(id,coleccion){const c=document.getElementById(id);if(!c)return;const ps=PRODUCTOS.filter(p=>p.coleccion===coleccion&&p.estado!=='oculto').sort(ordenProductos);c.innerHTML=ps.length?ps.map(tarjetaProductoHTML).join(''):'<p class="aviso-pendiente">Todavía no hay productos publicados en esta colección.</p>';}
function renderPiezasUnicas(id){const c=document.getElementById(id);if(!c)return;c.innerHTML=PIEZAS_UNICAS.filter(p=>p.estado!=='oculto').map(tarjetaProductoHTML).join('');}
function youtubeEmbed(url){if(!url)return'';const m=String(url).match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/);return m?`<div class="video-ficha"><iframe src="https://www.youtube.com/embed/${m[1]}" title="Vídeo del producto" loading="lazy" allowfullscreen></iframe></div>`:`<p><a class="btn btn-secundario" href="${escHTML(url)}" target="_blank" rel="noopener">Ver vídeo</a></p>`;}
function imagenes(p){const a=[];[imagenProducto(p)].concat(Array.isArray(p.galeria)?p.galeria:[]).forEach(x=>{if(x&&!a.includes(x))a.push(x);});return a;}
function galeriaHTML(p){const fs=imagenes(p);return `<div class="galeria-producto"><div class="foto-principal">${fs.length?`<img id="foto-principal-ficha" src="${escHTML(fs[0])}" alt="${escHTML(p.nombre||'Producto')}">`:bloqueSinFoto()}</div>${fs.length>1?`<div class="galeria-miniaturas">${fs.map((f,i)=>`<img class="miniatura ${i?'':'activa'}" src="${escHTML(f)}" alt="Foto ${i+1}" data-foto="${escHTML(f)}" loading="lazy">`).join('')}</div>`:''}${p.video?youtubeEmbed(p.video):''}</div>`;}
function parrafos(v){return String(v||'').split(/\n\s*\n/).map(x=>x.trim()).filter(Boolean);}
function detalleDesplegable(titulo,contenido,clase=''){if(!contenido)return'';return `<details class="ficha-acordeon ${clase}"><summary>${escHTML(titulo)}</summary><div class="acordeon-contenido">${texto(contenido)}</div></details>`;}
function descripcionConLeerMas(v){const ps=parrafos(v);if(!ps.length)return'';if(ps.length===1)return `<section class="ficha-detalle"><h3>Descripción</h3><p>${texto(ps[0])}</p></section>`;return `<section class="ficha-detalle"><h3>Descripción</h3><p>${texto(ps[0])}</p><details class="leer-mas"><summary>Leer más</summary><div class="acordeon-contenido">${ps.slice(1).map(x=>`<p>${texto(x)}</p>`).join('')}</div></details></section>`;}
function normalizarLista(a){if(!Array.isArray(a))return[];return a.map(x=>typeof x==='string'?{nombre:x.trim(),valor:x.trim()}:{nombre:String(x.nombre||x.color||x.titulo||x.valor||'Opción').trim(),valor:String(x.valor||x.nombre||x.color||x.titulo||'Opción').trim()});}
function opcionesProducto(p){const out=[];if(bool(p.personalizable)){let h='<section class="opciones-ficha"><h3>Personalización</h3>';if(p.opcionesPersonalizacion)h+=`<p>${texto(p.opcionesPersonalizacion)}</p>`;const sels=Array.isArray(p.opcionesPersonalizacionCliente)?p.opcionesPersonalizacionCliente:[];if(bool(p.activarSelectorPersonalizacion)&&sels.length)sels.forEach((s,i)=>{const os=normalizarLista(s.opciones);if(!os.length)return;h+=`<div class="campo-opcion"><label for="personalizacion-${i}">${escHTML(s.nombre||'Elige una opción')}</label><select id="personalizacion-${i}" data-tipo="personalizacion" data-label="${escHTML(s.nombre||'Personalización')}">${os.map(o=>`<option value="${escHTML(o.valor)}">${escHTML(o.nombre)}</option>`).join('')}</select></div>`;});h+='</section>';out.push(h);}
if(bool(p.mostrarVariantes)){const vs=Array.isArray(p.variantes)?p.variantes.filter(v=>v&&v.disponible!==false&&v.disponible!=='false'):[];if(vs.length)out.push(`<section class="opciones-ficha"><h3>Variantes / colores</h3><div class="campo-opcion"><label for="select-variante">Elige tu opción</label><select id="select-variante" data-tipo="variante" data-label="Color / variante">${vs.map(v=>`<option value="${escHTML(v.color||v.nombre||'')}">${escHTML(v.color||v.nombre||'Variante')}</option>`).join('')}</select></div></section>`);}
if(bool(p.mostrarCollarLlavero)){let fs=normalizarLista(p.formatosDisponibles);if(!fs.length)fs=[{nombre:'Collar',valor:'Collar'},{nombre:'Llavero',valor:'Llavero'}];out.push(`<section class="opciones-ficha"><h3>Formato</h3><div class="campo-opcion"><label for="select-formato">¿Cómo lo quieres?</label><select id="select-formato" data-tipo="formato" data-label="Formato">${fs.map(o=>`<option value="${escHTML(o.valor)}">${escHTML(o.nombre)}</option>`).join('')}</select></div></section>`);}
if(bool(p.permiteOtroColor))out.push(`<section class="opciones-ficha"><h3>Otro color</h3><p>Puedes solicitar otro color aunque no aparezca entre las fotografías.</p><div class="campo-opcion"><label for="input-otro-color">Color que te gustaría</label><input id="input-otro-color" data-tipo="otro-color" data-label="Otro color" type="text" placeholder="Escribe aquí el color"></div></section>`);return out.join('');}
function opcionesSeleccionadas(){const d={};document.querySelectorAll('#ficha-contenido select[data-tipo],#ficha-contenido input[data-tipo]').forEach(e=>{const v=(e.value||'').trim();if(v)d[e.dataset.label||'Opción']=v;});return d;}
function mensajeConsulta(p){const o=opcionesSeleccionadas();let m=`Hola, me gustaría consultar/pedir este producto de Arcilla Hechizada:\n\n${p.nombre} — ${precioTexto(p)}`;Object.entries(o).forEach(([k,v])=>m+=`\n${k}: ${v}`);if(p.estado==='bajo_pedido')m+='\n\nSé que este producto es bajo pedido.';return m;}
function actualizarPedido(){const p=window.PRODUCTO_ACTUAL;if(!p)return;const m=mensajeConsulta(p),wa=document.getElementById('btn-wa'),em=document.getElementById('btn-email');if(wa)wa.href=`https://wa.me/${WHATSAPP}?text=${encodeURIComponent(m)}`;if(em)em.href=`mailto:${EMAIL}?subject=${encodeURIComponent('Consulta sobre '+p.nombre)}&body=${encodeURIComponent(m)}`;}
function normalizarMetodosPago(v){if(!Array.isArray(v))return[];return v.map(x=>{if(typeof x==='string')return x.trim();if(x&&typeof x==='object')return String(x.forma||x.nombre||x.value||'').trim();return '';}).filter(Boolean).filter((x,i,a)=>a.indexOf(x)===i);}
function itemCarrito(p,o){return{key:p.id+'::'+JSON.stringify(o||{}),id:p.id,nombre:p.nombre,precio:precioNumero(p),imagen:imagenProducto(p),opciones:o||{},cantidad:1,pagos:normalizarMetodosPago(p.formasPagoDisponibles)};}
function leerCarrito(){try{const c=JSON.parse(localStorage.getItem(CART_KEY)||'[]');return Array.isArray(c)?c:[];}catch(e){return[];}}
function guardarCarrito(c){localStorage.setItem(CART_KEY,JSON.stringify(c));actualizarContadorCarrito();}
function actualizarContadorCarrito(){const n=leerCarrito().reduce((s,i)=>s+(Number(i.cantidad)||0),0);document.querySelectorAll('#contador-carrito').forEach(e=>e.textContent=n);}
function añadirAlCarrito(p,o,cantidad=1){const c=leerCarrito(),it=itemCarrito(p,o),old=c.find(x=>x.key===it.key);if(old)old.cantidad+=cantidad;else{it.cantidad=cantidad;c.push(it);}guardarCarrito(c);mostrarAvisoCarrito('Producto añadido al carrito.');}
function mostrarAvisoCarrito(t){let a=document.getElementById('aviso-carrito');if(!a){a=document.createElement('div');a.id='aviso-carrito';a.className='aviso-carrito';document.body.appendChild(a);}a.textContent=t;a.classList.add('visible');clearTimeout(window._aviso);window._aviso=setTimeout(()=>a.classList.remove('visible'),2400);}
function sePuedeComprar(p){return bool(p.activarCompra)&&!['agotado','vendido','vendida','reservada','oculto'].includes(p.estado)&&Number.isFinite(Number(p.precio));}
function accionesCompra(p){if(!sePuedeComprar(p))return '';const cantidad=(p.categoria==='infusiones'||p.categoria==='inciensos')?`<div class="cantidad-ficha"><span>Cantidad</span><button type="button" id="cantidad-menos">−</button><strong id="cantidad-valor">1</strong><button type="button" id="cantidad-mas">+</button></div>`:'';return `${cantidad}<div class="ficha-botones ficha-botones-tienda"><button id="btn-carrito" class="btn btn-carrito" type="button">Añadir al carrito</button><a id="btn-wa" href="#" class="btn btn-whatsapp-producto" target="_blank" rel="noopener">WhatsApp · dudas / personalizar</a><a id="btn-email" href="#" class="btn btn-secundario">Enviar correo</a></div>`;}
function fichaEspecial(p){if(p.categoria==='infusiones'){return `${descripcionConLeerMas(p.descripcionCompleta||p.descripcion)}${detalleDesplegable('Modo de empleo',p.modoEmpleo)}${detalleDesplegable('Ingredientes',p.ingredientes)}${p.medidas?`<section class="ficha-detalle"><h3>Cantidad / formato</h3><p>${texto(p.medidas)}</p></section>`:''}`;}
if(p.categoria==='inciensos'){return `${descripcionConLeerMas(p.descripcionCompleta||p.descripcion)}${detalleDesplegable('Notas olfativas',p.notasOlfativas)}${detalleDesplegable('Modo de uso',p.modoUso)}${detalleDesplegable('Características',p.caracteristicas)}${detalleDesplegable('Ingredientes',p.ingredientes)}${p.medidas?`<section class="ficha-detalle"><h3>Cantidad / formato</h3><p>${texto(p.medidas)}</p></section>`:''}`;}
return `${descripcionConLeerMas(p.descripcionCompleta||p.descripcion)}${detalleDesplegable('Simbolismo y uso',p.simbolismo||p.simbolismoUso)}${detalleDesplegable('Materiales',p.materiales)}${p.medidas?`<section class="ficha-detalle"><h3>Medidas</h3><p>${texto(p.medidas)}</p></section>`:''}${detalleDesplegable('Cuidados',p.cuidados)}${p.elaboracion?`<section class="ficha-detalle"><h3>Elaboración</h3><p>${texto(p.elaboracion)}</p></section>`:''}`;}
function renderFicha(){const id=new URLSearchParams(location.search).get('id')||new URLSearchParams(location.search).get('producto'),c=document.getElementById('ficha-contenido');if(!c)return;if(!id){c.innerHTML='<p class="aviso-pendiente">No se ha indicado ningún producto.</p>';return;}const p=PRODUCTOS.find(x=>x.id===id)||PIEZAS_UNICAS.find(x=>x.id===id);if(!p||p.estado==='oculto'){c.innerHTML='<p class="aviso-pendiente">Este producto todavía no está publicado.</p>';return;}window.PRODUCTO_ACTUAL=p;document.title=`${p.nombre||'Producto'} — Arcilla Hechizada`;const est=etiquetaEstado(p.estado),comprable=sePuedeComprar(p);c.innerHTML=`<article class="ficha-producto ficha-universal">${galeriaHTML(p)}<div class="detalles-ficha"><span class="eyebrow">${escHTML(p.categoria||'Pieza artesanal')}</span><h1>${escHTML(p.nombre||'Producto')}</h1><div class="estado-ficha"><span class="etiqueta ${['vendido','vendida'].includes(p.estado)?'etiqueta-vendida':'etiqueta-disponible'}">${escHTML(est)}</span></div><p class="ficha-precio">${precioTexto(p)}</p>${fichaEspecial(p)}${opcionesProducto(p)}${accionesCompra(p)}${!comprable?'<p class="aviso-pendiente aviso-no-compra">Este producto no está disponible para compra online en este momento.</p>':''}</div></article>`;
 c.querySelectorAll('.miniatura').forEach(m=>m.addEventListener('click',()=>{const im=c.querySelector('#foto-principal-ficha');if(im)im.src=m.dataset.foto;c.querySelectorAll('.miniatura').forEach(x=>x.classList.remove('activa'));m.classList.add('activa');}));
 if(comprable){let cantidad=1;const cv=c.querySelector('#cantidad-valor');const menos=c.querySelector('#cantidad-menos');const mas=c.querySelector('#cantidad-mas');if(cv&&menos&&mas){menos.addEventListener('click',()=>{cantidad=Math.max(1,cantidad-1);cv.textContent=cantidad;});mas.addEventListener('click',()=>{cantidad++;cv.textContent=cantidad;});}document.getElementById('btn-carrito').addEventListener('click',()=>añadirAlCarrito(p,opcionesSeleccionadas(),cantidad));document.querySelectorAll('#ficha-contenido select[data-tipo],#ficha-contenido input[data-tipo]').forEach(e=>{e.addEventListener('change',actualizarPedido);e.addEventListener('input',actualizarPedido);});actualizarPedido();}
}
function calcularEnvio(cp){const s=String(cp||'').replace(/\D/g,'');if(!/^\d{5}$/.test(s))return null;const pref=Number(s.slice(0,2));if([35,38,51,52].includes(pref))return 7.50;return 6.50;}
function metodosPagoCarrito(c){const listas=c.map(i=>{const actual=PRODUCTOS.find(p=>p.id===i.id)||PIEZAS_UNICAS.find(p=>p.id===i.id);const metodosActuales=actual?normalizarMetodosPago(actual.formasPagoDisponibles):[];return metodosActuales.length?metodosActuales:(normalizarMetodosPago(i.pagos).length?normalizarMetodosPago(i.pagos):['Bizum','PayPal','Efectivo']);});if(!listas.length)return['Bizum','PayPal','Efectivo'];const union=[...new Set(listas.flat())];const orden=['Bizum','PayPal','Efectivo'];return [...orden.filter(x=>union.includes(x)),...union.filter(x=>!orden.includes(x))];}

function generarNumeroPedido(){
  const d=new Date();
  const dd=String(d.getDate()).padStart(2,'0');
  const mm=String(d.getMonth()+1).padStart(2,'0');
  const hh=String(d.getHours()).padStart(2,'0');
  const min=String(d.getMinutes()).padStart(2,'0');
  return `#AH-${dd}${mm}${hh}:${min}`;
}
function formatoEuros(n){return Number(n||0).toFixed(2).replace('.',',')+' €';}
function datosCliente(){
  const get=id=>(document.getElementById(id)?.value||'').trim();
  return {
    nombre:get('cliente-nombre'),
    email:get('cliente-email'),
    telefono:get('cliente-telefono'),
    direccion:get('cliente-direccion'),
    cp:get('cp-envio')
  };
}
function construirDetallePedido(c,subtotal,envio,cliente,metodo,numero){
  const total=subtotal+(envio||0);
  let t=`Pedido ${numero}\n\n`;
  t+=`Cliente: ${cliente.nombre}\nTeléfono: ${cliente.telefono}\nEmail: ${cliente.email}\n`;
  if(cliente.direccion) t+=`Dirección: ${cliente.direccion}\n`;
  if(cliente.cp) t+=`Código postal: ${cliente.cp}\n`;
  t+='\nPRODUCTOS:\n';
  c.forEach(i=>{
    const precio=Number(i.precio)||0, cantidad=Number(i.cantidad)||1;
    t+=`- ${i.nombre} × ${cantidad} — ${formatoEuros(precio*cantidad)}\n`;
    Object.entries(i.opciones||{}).forEach(([k,v])=>t+=`  ${k}: ${v}\n`);
  });
  t+=`\nSubtotal: ${formatoEuros(subtotal)}\n`;
  if(envio>0) t+=`Envío: ${formatoEuros(envio)}\n`;
  else if(metodo==='Efectivo') t+='Envío: No aplica — recogida en taller\n';
  t+=`TOTAL: ${formatoEuros(total)}\nForma de pago: ${metodo}\n`;
  return t;
}
function construirMensajeBizum(c,subtotal,cliente,numero){
  return `Hola ${cliente.nombre},\n\nTu pedido ${numero} en Arcilla Hechizada está preparado para completar el pago por Bizum.\n\nIMPORTE TOTAL: ${formatoEuros(subtotal)}\nNúmero Bizum: ${BIZUM}\nConcepto: ${numero}\n\nRealiza el Bizum indicando como concepto exactamente ${numero}.\n\nGracias por tu compra.`;
}
async function enviarPedidoFormspree(c,subtotal,envio,cliente,metodo,numero){
  const detalle=construirDetallePedido(c,subtotal,envio,cliente,metodo,numero);
  const fd=new FormData();
  fd.append('subject',`Nuevo pedido ${numero} — ${cliente.nombre}`);
  fd.append('email',cliente.email);
  fd.append('name',cliente.nombre);
  fd.append('phone',cliente.telefono);
  fd.append('address',cliente.direccion||'Recogida en taller');
  fd.append('codigo_postal',cliente.cp||'No aplica');
  fd.append('numero_pedido',numero);
  fd.append('forma_pago',metodo);
  fd.append('total',formatoEuros(subtotal+envio));
  fd.append('message',detalle);
  const r=await fetch(FORMSPREE_ENDPOINT,{method:'POST',body:fd,headers:{Accept:'application/json'}});
  if(!r.ok) throw new Error('Formspree no ha aceptado el pedido');
  return r;
}
function validarDatosCheckout(cliente,metodo){
  if(!cliente.nombre||!cliente.email||!cliente.telefono){
    alert('Completa nombre y apellidos, correo electrónico y teléfono antes de continuar.');
    return false;
  }
  if(metodo!=='Efectivo' && (!cliente.direccion||!/^[0-9]{5}$/.test(cliente.cp))){
    alert('Completa la dirección de entrega y un código postal válido de 5 cifras.');
    return false;
  }
  return true;
}
function actualizarResumenCheckout(c,metodo){
  const subtotal=c.reduce((s,i)=>s+(Number(i.precio)||0)*(Number(i.cantidad)||1),0);
  const cp=document.getElementById('cp-envio')?.value||'';
  const env=metodo==='Efectivo'?0:calcularEnvio(cp);
  const envioEl=document.querySelector('.envio-linea strong'),totalEl=document.querySelector('.ticket-total strong');
  if(envioEl) envioEl.textContent=metodo==='Efectivo'?'No aplica — recogida en taller':(env===null?'Se calcularán':formatoEuros(env));
  if(totalEl) totalEl.textContent=formatoEuros(subtotal+(env||0));
  return {subtotal,env};
}
function pintarCamposCheckout(metodo){
  const efectivo=metodo==='Efectivo';
  const d=document.getElementById('datos-entrega');
  if(d) d.hidden=efectivo;
  const cp=document.getElementById('cp-envio');
  const direccion=document.getElementById('cliente-direccion');
  if(cp) cp.required=!efectivo;
  if(direccion) direccion.required=!efectivo;
  const aviso=document.getElementById('aviso-efectivo');
  if(aviso) aviso.hidden=!efectivo;
  actualizarResumenCheckout(leerCarrito(),metodo);
}
async function paypalBackend(path,options={}){
  const base=PAYPAL_BACKEND_BASE.replace(/\/$/,'');
  const r=await fetch(base+path,options);
  let data={}; try{data=await r.json();}catch(_){}
  if(!r.ok) throw new Error(data.error||data.message||`Error PayPal (${r.status})`);
  return data;
}
async function cargarPayPalSdk(){
  if(window.paypal&&typeof window.paypal.createInstance==='function') return window.paypal;
  if(window.paypalSdkReady) await window.paypalSdkReady;
  if(window.paypal&&typeof window.paypal.createInstance==='function') return window.paypal;
  throw new Error('El SDK de PayPal no se ha cargado');
}
async function inicializarPayPalUI(items,cliente,subtotal,envio,numero,metodo){
  const box=document.getElementById('paypal-payment-box');
  if(!box)return;
  box.innerHTML='<p class="ayuda-cp">Cargando el pago seguro de PayPal…</p>';
  const sdk=await cargarPayPalSdk();
  const token=await paypalBackend('/paypal-auth');
  const clientToken=token.accessToken||token.clientToken;
  if(!clientToken) throw new Error('PayPal no ha devuelto el token de cliente');
  const sdkInstance=await sdk.createInstance({
    clientToken,
    components: metodo==='Tarjeta'?['card-fields']:['paypal-payments'],
    pageType:'checkout'
  });
  const methods=await sdkInstance.findEligibleMethods({currencyCode:'EUR'});
  if(metodo==='Tarjeta'){
    if(!methods.isEligible('advanced_cards')){
      box.innerHTML='<div class="pago-instrucciones"><h3>Tarjeta no disponible todavía</h3><p>PayPal todavía no ha habilitado los pagos avanzados con tarjeta para esta cuenta o dominio. El resto de la tienda sigue funcionando con normalidad.</p></div>';
      return;
    }
    box.innerHTML=`<div class="paypal-card-fields">
      <div class="paypal-card-title"><strong>Pago seguro con tarjeta</strong><span>Procesado de forma segura por PayPal</span></div>
      <label>Nombre del titular</label><div id="paypal-card-name"></div>
      <label>Número de tarjeta</label><div id="paypal-card-number"></div>
      <div class="card-fields-row"><div><label>Caducidad</label><div id="paypal-card-expiry"></div></div><div><label>CVV</label><div id="paypal-card-cvv"></div></div></div>
      <button id="paypal-card-submit" class="btn btn-pagar" type="button">Pagar con tarjeta</button>
    </div>`;
    const session=sdkInstance.createCardFieldsOneTimePaymentSession();
    const style={input:{fontSize:'16px',fontFamily:'Arial, sans-serif'}};
    const fields=[
      ['paypal-card-name','name','Nombre del titular'],
      ['paypal-card-number','number','Número de tarjeta'],
      ['paypal-card-expiry','expiry','MM/AA'],
      ['paypal-card-cvv','cvv','CVV']
    ];
    fields.forEach(([id,type,placeholder])=>{
      const el=session.createCardFieldsComponent({type,placeholder,style});
      document.getElementById(id).appendChild(el);
    });
    document.getElementById('paypal-card-submit').addEventListener('click',async()=>{
      const b=document.getElementById('paypal-card-submit');
      b.disabled=true;b.textContent='Procesando pago…';
      try{
        const order=await paypalBackend('/paypal-create-order',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({amount:(subtotal+envio).toFixed(2)})});
        const result=await session.submit(order.id,{billingAddress:{postalCode:cliente.cp,countryCode:'ES'}});
        if(result.state==='succeeded'){
          await paypalBackend('/paypal-capture-order',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({orderID:result.data?.orderId||order.id})});
          await enviarPedidoFormspree(items,subtotal,envio,cliente,metodo,numero);
          mostrarPagoCompletado(numero,subtotal+envio,metodo);
        }else{
          throw new Error(result.data?.message||'El pago no ha sido aceptado');
        }
      }catch(e){
        console.error(e);
        alert('No se ha podido completar el pago con tarjeta. Puedes intentarlo de nuevo.');
        b.disabled=false;b.textContent='Pagar con tarjeta';
      }
    });
  }else{
    if(!methods.isEligible('paypal')){
      box.innerHTML='<p class="pago-instrucciones">PayPal no está disponible para este pedido en este momento.</p>';
      return;
    }
    box.innerHTML='<paypal-button id="paypal-btn-ah" type="pay"></paypal-button>';
    const session=sdkInstance.createPayPalOneTimePaymentSession({
      onApprove:async({orderId})=>{
        await paypalBackend('/paypal-capture-order',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({orderID:orderId})});
        await enviarPedidoFormspree(items,subtotal,envio,cliente,metodo,numero);
        mostrarPagoCompletado(numero,subtotal+envio,metodo);
      },
      onCancel:()=>{},
      onError:e=>{console.error(e);alert('PayPal no ha podido completar el pago. Puedes intentarlo de nuevo.');}
    });
    document.getElementById('paypal-btn-ah').addEventListener('click',async()=>{
      try{
        const order=await paypalBackend('/paypal-create-order',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({amount:(subtotal+envio).toFixed(2)})});
        await session.start({presentationMode:'auto'},Promise.resolve(order.id));
      }catch(e){console.error(e);alert('No se ha podido abrir PayPal. Inténtalo de nuevo.');}
    });
  }
}
function mostrarPagoCompletado(numero,total,metodo){
  const box=document.getElementById('checkout-accion');
  if(box) box.innerHTML=`<div class="pago-instrucciones"><h3>¡Pago realizado!</h3><p>Tu pedido <strong>${escHTML(numero)}</strong> ha sido registrado correctamente.</p><p>Total: <strong>${formatoEuros(total)}</strong></p><p>Forma de pago: <strong>${escHTML(metodo)}</strong></p><p>Hemos enviado los datos del pedido al correo indicado.</p></div>`;
  localStorage.removeItem(CART_KEY);
  actualizarContadorCarrito();
}
function renderCarrito(){
  const root=document.getElementById('carrito-contenido');
  if(!root)return;
  let c=leerCarrito();
  if(!c.length){
    root.innerHTML='<div class="carrito-vacio"><h1>Tu carrito está vacío</h1><p>Cuando encuentres algo que quieras conservar, añádelo aquí.</p><a class="btn btn-primario" href="tienda.html#categorias-tienda">Explorar la tienda</a></div>';
    return;
  }
  const sub=()=>c.reduce((s,i)=>s+(Number(i.precio)||0)*(Number(i.cantidad)||1),0);
  function pintar(){
    const clientePrev=datosCliente();
    const subtotal=sub();
    root.innerHTML=`<div class="carrito-layout">
      <section class="carrito-ticket">
        <div class="ticket-cabecera"><span>Arcilla Hechizada</span><span>Tu pedido</span></div>
        <div class="carrito-items">${c.map((i,idx)=>`<div class="carrito-item">
          <a class="carrito-item-foto carrito-enlace-producto" href="ficha.html?id=${encodeURIComponent(i.id)}" title="Volver al producto">${i.imagen?`<img src="${escHTML(i.imagen)}" alt="${escHTML(i.nombre)}">`:'✦'}</a>
          <div class="carrito-item-info"><a class="carrito-producto-enlace" href="ficha.html?id=${encodeURIComponent(i.id)}"><h3>${escHTML(i.nombre)}</h3></a>${Object.entries(i.opciones||{}).map(([k,v])=>`<small>${escHTML(k)}: ${escHTML(v)}</small>`).join('')}<strong>${formatoEuros((Number(i.precio)||0)*(Number(i.cantidad)||1))}</strong></div>
          <div class="carrito-cantidad"><button type="button" data-action="menos" data-i="${idx}">−</button><span>${i.cantidad}</span><button type="button" data-action="mas" data-i="${idx}">+</button></div>
          <button type="button" class="carrito-eliminar" data-action="eliminar" data-i="${idx}">Eliminar</button>
        </div>`).join('')}</div>
        <div class="ticket-linea"><span>Subtotal</span><strong>${formatoEuros(subtotal)}</strong></div>
        <div class="ticket-linea envio-linea"><span>Gastos de envío</span><strong>Se calcularán</strong></div>
        <div class="ticket-total"><span>TOTAL</span><strong>${formatoEuros(subtotal)}</strong></div>
      </section>
      <aside class="carrito-pago">
        <h2>Finalizar pedido</h2>
        <label for="cliente-nombre">Nombre y apellidos</label><input id="cliente-nombre" autocomplete="name" placeholder="Tu nombre y apellidos" value="${escHTML(clientePrev.nombre)}">
        <label for="cliente-email">Correo electrónico</label><input id="cliente-email" type="email" autocomplete="email" placeholder="tu@email.com" value="${escHTML(clientePrev.email)}">
        <label for="cliente-telefono">Teléfono</label><input id="cliente-telefono" type="tel" autocomplete="tel" placeholder="Tu teléfono" value="${escHTML(clientePrev.telefono)}">
        <div id="datos-entrega">
          <label for="cliente-direccion">Dirección de entrega</label><input id="cliente-direccion" autocomplete="street-address" placeholder="Calle, número, piso..." value="${escHTML(clientePrev.direccion)}">
          <label for="cp-envio">Código postal</label><input id="cp-envio" inputmode="numeric" maxlength="5" autocomplete="postal-code" placeholder="Introduce tu código postal" value="${escHTML(clientePrev.cp)}">
          <p class="ayuda-cp">Introduce el código postal de entrega para calcular los gastos de envío.</p>
        </div>
        <p id="aviso-efectivo" class="pago-instrucciones" hidden>💶 <strong>Pago en efectivo en el taller.</strong><br>El pago se efectuará el día acordado para la recogida. No se aplican gastos de envío.</p>
        <label for="metodo-pago" class="label-pago">Forma de pago</label>
        <select id="metodo-pago">
          <option value="Tarjeta">💳 Tarjeta</option>
          <option value="Bizum">📲 Bizum</option>
          <option value="PayPal">🅿️ PayPal</option>
          <option value="Efectivo">💶 Efectivo</option>
        </select>
        <div class="pagos-protegidos" aria-label="Pago protegido"><strong>🔒 Pago protegido</strong><span>Los pagos con tarjeta y PayPal se gestionan de forma segura mediante PayPal.</span></div>
        <div id="checkout-accion"><button id="btn-pagar" class="btn btn-pagar" type="button">Continuar con el pago</button></div>
        <p class="aviso-envio">Los gastos de envío solo se aplican a pedidos con entrega. Más información en <a href="envios-y-recogida.html">Preguntas y Envíos</a>.</p>
      </aside>
    </div>`;
    root.querySelectorAll('[data-action]').forEach(b=>b.addEventListener('click',()=>{
      const i=Number(b.dataset.i),a=b.dataset.action;
      if(a==='mas')c[i].cantidad++;
      if(a==='menos')c[i].cantidad=Math.max(1,c[i].cantidad-1);
      if(a==='eliminar')c.splice(i,1);
      guardarCarrito(c);pintar();
    }));
    const select=document.getElementById('metodo-pago');
    select.addEventListener('change',()=>pintarCamposCheckout(select.value));
    ['cliente-nombre','cliente-email','cliente-telefono','cliente-direccion','cp-envio'].forEach(id=>{
      document.getElementById(id)?.addEventListener('input',()=>{
        const metodo=select.value;
        actualizarResumenCheckout(c,metodo);
      });
    });
    document.getElementById('btn-pagar').addEventListener('click',()=>procesarCheckout(c));
    pintarCamposCheckout('Tarjeta');
  }
  async function procesarCheckout(items){
    const metodo=document.getElementById('metodo-pago').value;
    const cliente=datosCliente();
    if(!validarDatosCheckout(cliente,metodo))return;
    const calc=actualizarResumenCheckout(items,metodo);
    if(metodo!=='Efectivo' && calc.env===null){
      alert('Introduce un código postal válido de 5 cifras para calcular el envío.');
      return;
    }
    const envio=calc.env||0, subtotal=calc.subtotal, total=subtotal+envio, numero=generarNumeroPedido();
    const boton=document.getElementById('btn-pagar');
    if(boton){boton.disabled=true;boton.textContent='Preparando…';}
    try{
      if(metodo==='Bizum'){
        await enviarPedidoFormspree(items,subtotal,0,cliente,metodo,numero);
        document.getElementById('checkout-accion').innerHTML=`<div class="pago-instrucciones">
          <h3>Pedido ${escHTML(numero)}</h3>
          <p>Para completar tu compra, realiza un Bizum de <strong>${formatoEuros(subtotal)}</strong>.</p>
          <p><strong>Número Bizum:</strong> <span>${BIZUM}</span></p>
          <p><strong>Concepto:</strong> ${escHTML(numero)}</p>
          <p>El pedido quedará pendiente de confirmación hasta recibir el Bizum.</p>
          <button type="button" class="btn btn-pagar" id="copiar-bizum">Copiar número Bizum</button>
        </div>`;
        document.getElementById('copiar-bizum').addEventListener('click',async()=>{
          try{await navigator.clipboard.writeText(BIZUM);mostrarAvisoCarrito('Número Bizum copiado.');}catch(_){alert('Número Bizum: '+BIZUM);}
        });
      }else if(metodo==='Efectivo'){
        await enviarPedidoFormspree(items,subtotal,0,cliente,metodo,numero);
        document.getElementById('checkout-accion').innerHTML=`<div class="pago-instrucciones">
          <h3>Pedido ${escHTML(numero)} recibido</h3>
          <p>Has elegido <strong>pago en efectivo en el taller</strong>.</p>
          <p>El pago se efectuará el día acordado para la recogida de tu pedido.</p>
          <p><strong>Total a pagar: ${formatoEuros(subtotal)}</strong></p>
          <p>Te enviaremos la confirmación al correo indicado.</p>
        </div>`;
      }else{
        document.getElementById('checkout-accion').innerHTML='<div id="paypal-payment-box"></div>';
        await inicializarPayPalUI(items,cliente,subtotal,envio,numero,metodo);
      }
      localStorage.setItem('arcillaHechizadaUltimoPedido',JSON.stringify({numero,metodo,total}));
    }catch(e){
      console.error(e);
      alert('No hemos podido preparar el pago. Inténtalo de nuevo en unos segundos.');
      if(boton){boton.disabled=false;boton.textContent='Continuar con el pago';}
    }
  }
  pintar();
}
