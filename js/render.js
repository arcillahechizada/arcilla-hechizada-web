// ============================================================
// ARCILLA HECHIZADA — catálogo universal + carrito
// ============================================================
let PRODUCTOS = [], PIEZAS_UNICAS = [], OPINIONES = [], FAQ = [], INICIO = {};
const WHATSAPP='34722379095', EMAIL='arcillahechizada@gmail.com', CART_KEY='arcillaHechizadaCarrito';
const BIZUM='722379095';
const FORMSPREE_ENDPOINT='https://formspree.io/f/xqpanapp';
const PAYPAL_BACKEND_BASE=window.ARCILLA_PAYPAL_BACKEND||'/api';

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

// ------------------------------------------------------------
// CHECKOUT — estado compartido
// ------------------------------------------------------------
const BIZUM_VISIBLE='722 37 90 95';
const CHK={sdk:{},seq:0,ocupado:false,terminado:false,numero:null,numeroTs:0,ctx:null};
function esEfectivo(m){return m==='Efectivo';}
function numeroPedidoActual(){
  if(!CHK.numero||Date.now()-CHK.numeroTs>20*60*1000){CHK.numero=generarNumeroPedido();CHK.numeroTs=Date.now();}
  return CHK.numero;
}
function mostrarError(msg){
  const e=document.getElementById('pago-error');
  if(!e)return;
  e.textContent=msg||'';
  e.hidden=!msg;
}
function datosClienteCrudo(){
  const get=id=>(document.getElementById(id)?.value||'').trim();
  return {nombre:get('cliente-nombre'),email:get('cliente-email'),telefono:get('cliente-telefono'),direccion:get('cliente-direccion'),cp:get('cp-envio')};
}
// En Efectivo (recogida en taller) no se usa ni se envía dirección ni código postal.
function datosCliente(metodo){
  const c=datosClienteCrudo();
  const m=metodo||document.getElementById('metodo-pago')?.value||'';
  if(esEfectivo(m)){c.direccion='';c.cp='';}
  return c;
}
function validarDatosCheckout(cliente,metodo){
  if(!cliente.nombre||!cliente.email||!cliente.telefono) return 'Completa nombre y apellidos, correo electrónico y teléfono antes de continuar.';
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cliente.email)) return 'El correo electrónico no parece válido. Revísalo para poder enviarte la confirmación.';
  if(!esEfectivo(metodo)&&(!cliente.direccion||!/^[0-9]{5}$/.test(cliente.cp))) return 'Completa la dirección de entrega y un código postal válido de 5 cifras.';
  return '';
}
function subtotalCarrito(c){return c.reduce((s,i)=>s+(Number(i.precio)||0)*(Number(i.cantidad)||1),0);}
function actualizarResumenCheckout(c,metodo){
  const subtotal=subtotalCarrito(c);
  const cp=document.getElementById('cp-envio')?.value||'';
  const efectivo=esEfectivo(metodo);
  const env=efectivo?0:calcularEnvio(cp);
  const envioEl=document.querySelector('.envio-linea strong'),totalEl=document.querySelector('.ticket-total strong');
  if(envioEl) envioEl.textContent=efectivo?'No aplica (recogida en taller)':(env===null?'Se calcularán':formatoEuros(env));
  if(totalEl) totalEl.textContent=formatoEuros(subtotal+(env||0));
  return {subtotal,env};
}
function lineasProductos(c){
  return c.map(i=>{
    const precio=Number(i.precio)||0,cantidad=Number(i.cantidad)||1;
    let t=`- ${i.nombre} × ${cantidad} — ${formatoEuros(precio*cantidad)}`;
    Object.entries(i.opciones||{}).forEach(([k,v])=>t+=`\n  ${k}: ${v}`);
    return t;
  }).join('\n');
}
function construirDetallePedido(c,subtotal,envio,cliente,metodo,numero,estado){
  const total=subtotal+(envio||0);
  let t=`Pedido ${numero}\n\n`;
  t+=`Cliente: ${cliente.nombre}\nTeléfono: ${cliente.telefono}\nEmail: ${cliente.email}\n`;
  if(cliente.direccion) t+=`Dirección: ${cliente.direccion}\n`;
  if(cliente.cp) t+=`Código postal: ${cliente.cp}\n`;
  t+=`\nPRODUCTOS:\n${lineasProductos(c)}\n`;
  t+=`\nSubtotal: ${formatoEuros(subtotal)}\n`;
  if(esEfectivo(metodo)) t+='Envío: No aplica — recogida en taller\n';
  else t+=`Envío: ${formatoEuros(envio||0)}\n`;
  t+=`TOTAL: ${formatoEuros(total)}\nForma de pago: ${metodo}\n`;
  if(estado) t+=`Estado del pago: ${estado}\n`;
  return t;
}
const esperar=ms=>new Promise(r=>setTimeout(r,ms));
async function enviarPedidoFormspree(c,subtotal,envio,cliente,metodo,numero,extra={}){
  const total=subtotal+(envio||0);
  const fd=new FormData();
  fd.append('_subject',`Nuevo pedido ${numero} — ${cliente.nombre}`);
  fd.append('email',cliente.email);            // Formspree usa exactamente este campo
  fd.append('name',cliente.nombre);
  fd.append('phone',cliente.telefono);
  fd.append('numero_pedido',numero);
  fd.append('forma_pago',metodo);
  fd.append('estado_pago',extra.estado||'');
  if(extra.paypalOrderId) fd.append('paypal_order_id',extra.paypalOrderId);
  fd.append('productos',lineasProductos(c));
  fd.append('subtotal',formatoEuros(subtotal));
  fd.append('gastos_envio',esEfectivo(metodo)?'No aplica — recogida en taller':formatoEuros(envio||0));
  fd.append('total',formatoEuros(total));
  fd.append('address',cliente.direccion||'Recogida en taller');
  fd.append('codigo_postal',cliente.cp||'No aplica');
  fd.append('message',construirDetallePedido(c,subtotal,envio,cliente,metodo,numero,extra.estado));
  let ultimo;
  for(let intento=1;intento<=2;intento++){
    try{
      const r=await fetch(FORMSPREE_ENDPOINT,{method:'POST',body:fd,headers:{Accept:'application/json'}});
      if(r.ok) return r;
      ultimo=new Error('Formspree respondió '+r.status);
      if(r.status<500) break;            // error de datos: reintentar no ayuda
    }catch(e){ultimo=e;}
    await esperar(900);
  }
  throw ultimo||new Error('Formspree no ha aceptado el pedido');
}

// ------------------------------------------------------------
// BACKEND DE PAGOS (Cloudflare Pages Functions, rutas /api/...) / PAYPAL
// ------------------------------------------------------------
async function paypalBackend(path,options={}){
  const base=PAYPAL_BACKEND_BASE.replace(/\/$/,'');
  const ctl=typeof AbortController!=='undefined'?new AbortController():null;
  const timer=ctl?setTimeout(()=>ctl.abort(),30000):null;
  let r;
  try{ r=await fetch(base+path,Object.assign({},options,ctl?{signal:ctl.signal}:{})); }
  finally{ if(timer)clearTimeout(timer); }
  let data={}; try{data=await r.json();}catch(_){}
  if(!r.ok){
    const e=new Error(data.error||data.message||`Error del servidor de pagos (${r.status})`);
    e.status=r.status;
    if(r.status===400||r.status===503) e.userMessage=data.error;   // mensajes pensados para el cliente
    throw e;
  }
  return data;
}
async function cargarPayPalSdk(){
  const listo=()=>window.paypal&&typeof window.paypal.createInstance==='function';
  if(listo()) return window.paypal;
  if(window.paypalSdkReady) await Promise.race([window.paypalSdkReady,esperar(15000)]);
  if(listo()) return window.paypal;
  throw new Error('El SDK de PayPal no se ha cargado');
}
async function obtenerSdk(tipo){
  const hit=CHK.sdk[tipo];
  if(hit&&Date.now()-hit.ts<10*60*1000) return hit;   // el token caduca a los 15 min
  const sdk=await cargarPayPalSdk();
  const t=await paypalBackend('/paypal-auth');
  const clientToken=t.accessToken||t.clientToken;
  if(!clientToken) throw new Error('PayPal no ha devuelto el token de cliente');
  const inst=await sdk.createInstance({clientToken,components:[tipo==='tarjeta'?'card-fields':'paypal-payments'],pageType:'checkout'});
  const methods=await inst.findEligibleMethods({currencyCode:'EUR'});
  CHK.sdk[tipo]={inst,methods,ts:Date.now()};
  return CHK.sdk[tipo];
}
async function crearOrdenPayPal(p){
  const order=await paypalBackend('/paypal-create-order',{
    method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({items:p.items.map(i=>({id:i.id,cantidad:Number(i.cantidad)||1})),cp:p.cliente.cp,numeroPedido:p.numero,metodo:p.metodo})
  });
  if(!order.id) throw new Error('PayPal no ha devuelto el número de pedido');
  if(Math.abs(Number(order.total)-p.total)>0.005){
    const e=new Error('El importe calculado no coincide');
    e.userMessage=`El importe del pedido ha cambiado (ahora ${formatoEuros(Number(order.total))}). Revisa tu pedido y vuelve a intentarlo.`;
    throw e;
  }
  return order;
}
async function capturarOrden(orderID){
  let d;
  try{ d=await paypalBackend('/paypal-capture-order',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({orderID})}); }
  catch(e){e.fase='captura';throw e;}
  if(d.status!=='COMPLETED'){const e=new Error('Estado de captura: '+d.status);e.fase='captura';throw e;}
  return d;
}

// ------------------------------------------------------------
// CHECKOUT — flujo común
// ------------------------------------------------------------
function prepararPedido(metodo){
  const items=leerCarrito();
  if(!items.length){mostrarError('Tu carrito está vacío.');return null;}
  const cliente=datosCliente(metodo);
  const err=validarDatosCheckout(cliente,metodo);
  if(err){mostrarError(err);return null;}
  const calc=actualizarResumenCheckout(items,metodo);
  if(!esEfectivo(metodo)&&calc.env===null){mostrarError('Introduce un código postal válido de 5 cifras para calcular el envío.');return null;}
  const envio=calc.env||0;
  return {items,cliente,metodo,subtotal:calc.subtotal,envio,total:calc.subtotal+envio,numero:numeroPedidoActual()};
}
function cerrarPedido(p){
  CHK.terminado=true;CHK.numero=null;
  try{localStorage.setItem('arcillaHechizadaUltimoPedido',JSON.stringify({numero:p.numero,metodo:p.metodo,total:p.total}));}catch(_){}
  try{localStorage.removeItem(CART_KEY);}catch(_){}
  actualizarContadorCarrito();
}
function mostrarPagoCompletado(p,correoOk){
  const box=document.getElementById('checkout-accion');
  mostrarError('');
  if(box) box.innerHTML=`<div class="pago-instrucciones"><h3>¡Pago realizado!</h3><p>Tu pedido <strong>${escHTML(p.numero)}</strong> ha sido registrado correctamente.</p><p>Total: <strong>${formatoEuros(p.total)}</strong></p><p>Forma de pago: <strong>${escHTML(p.metodo)}</strong></p>${correoOk?'<p>Hemos enviado los datos del pedido al correo indicado.</p>':`<p>El pago se ha completado, pero no hemos podido enviar el correo de confirmación. Guarda tu número de pedido <strong>${escHTML(p.numero)}</strong> y escríbenos a <a href="mailto:${EMAIL}">${EMAIL}</a> si lo necesitas.</p>`}</div>`;
}
// Se llama cuando el cobro YA está capturado: nunca debe presentarse como un fallo de pago.
async function terminarPagoOnline(p,orderId){
  let correoOk=true;
  try{ await enviarPedidoFormspree(p.items,p.subtotal,p.envio,p.cliente,p.metodo,p.numero,{estado:'PAGADO a través de PayPal',paypalOrderId:orderId}); }
  catch(e){correoOk=false;console.error('Pedido cobrado, pero Formspree ha fallado:',e);}
  cerrarPedido(p);
  mostrarPagoCompletado(p,correoOk);
}
function mensajeFalloCaptura(p){
  return `El pago ha sido autorizado pero no hemos podido confirmar el cobro. NO repitas el pago: escríbenos por WhatsApp o a ${EMAIL} indicando el pedido ${p.numero}.`;
}
function mensajeUsuario(e,porDefecto){return (e&&e.userMessage)||porDefecto;}

async function pagarConTarjeta(sesion,btn){
  if(CHK.ocupado||CHK.terminado)return;
  const p=prepararPedido('Tarjeta'); if(!p)return;
  CHK.ocupado=true;mostrarError('');
  btn.disabled=true;btn.textContent='Procesando pago…';
  let completado=false;
  try{
    const order=await crearOrdenPayPal(p);
    const res=await sesion.submit(order.id,{billingAddress:{postalCode:p.cliente.cp,countryCode:'ES'}});
    if(res&&res.state==='succeeded'){
      const orderId=(res.data&&res.data.orderId)||order.id;
      await capturarOrden(orderId);
      completado=true;
      await terminarPagoOnline(p,orderId);
    }else if(res&&res.state==='canceled'){
      mostrarError('Has cancelado la verificación del banco. Puedes intentarlo de nuevo.');
    }else{
      console.warn('Tarjeta rechazada',res);
      mostrarError('No se ha podido procesar la tarjeta. Revisa los datos o prueba con otra tarjeta. No se ha realizado ningún cargo.');
    }
  }catch(e){
    console.error(e);
    if(e&&e.fase==='captura') mostrarError(mensajeFalloCaptura(p));
    else mostrarError(mensajeUsuario(e,'No se ha podido completar el pago con tarjeta. Inténtalo de nuevo en unos segundos.'));
  }finally{
    CHK.ocupado=false;
    if(!completado&&!CHK.terminado&&btn.isConnected){btn.disabled=false;btn.textContent='Pagar con tarjeta';}
  }
}
async function montarTarjeta(seq){
  const {inst,methods}=await obtenerSdk('tarjeta');
  if(seq!==CHK.seq)return;
  const box=document.getElementById('paypal-payment-box'); if(!box)return;
  if(!methods.isEligible('advanced_cards')){
    box.innerHTML='<div class="pago-instrucciones"><h3>Tarjeta no disponible en este momento</h3><p>Ahora mismo PayPal no permite pagar con tarjeta directamente en esta tienda. Puedes elegir PayPal, Bizum o Efectivo (recogida en el taller).</p></div>';
    return;
  }
  const caja='height:48px;padding:0;overflow:hidden';
  box.innerHTML=`<div class="paypal-card-fields">
    <div class="paypal-card-title"><strong>Pago seguro con tarjeta</strong><br><span class="ayuda-cp">Procesado de forma segura por PayPal</span></div>
    <label>Nombre del titular</label><div id="paypal-card-name" style="${caja}"></div>
    <label>Número de tarjeta</label><div id="paypal-card-number" style="${caja}"></div>
    <div class="card-fields-row"><label style="margin:0 0 6px">Caducidad</label><label style="margin:0 0 6px">CVV</label></div>
    <div class="card-fields-row" style="margin-bottom:10px"><div id="paypal-card-expiry" style="${caja}"></div><div id="paypal-card-cvv" style="${caja}"></div></div>
    <button id="paypal-card-submit" class="btn btn-pagar" type="button">Pagar con tarjeta</button>
  </div>`;
  const sesion=inst.createCardFieldsOneTimePaymentSession();
  const style={input:{fontSize:'16px',fontFamily:'Inter, Arial, sans-serif',color:'#3A332C',background:'transparent',border:'none',padding:'0 12px',height:'46px'},'.invalid':{color:'#9A5325'}};
  [['paypal-card-name','name','Nombre del titular'],['paypal-card-number','number','Número de tarjeta'],['paypal-card-expiry','expiry','MM/AA'],['paypal-card-cvv','cvv','CVV']].forEach(([id,type,placeholder])=>{
    document.getElementById(id).appendChild(sesion.createCardFieldsComponent({type,placeholder,style}));
  });
  const btn=document.getElementById('paypal-card-submit');
  btn.addEventListener('click',()=>pagarConTarjeta(sesion,btn));
}
async function montarPayPal(seq){
  const {inst,methods}=await obtenerSdk('paypal');
  if(seq!==CHK.seq)return;
  const box=document.getElementById('paypal-payment-box'); if(!box)return;
  if(!methods.isEligible('paypal')){
    box.innerHTML='<div class="pago-instrucciones"><p>PayPal no está disponible para este pedido en este momento. Puedes elegir otra forma de pago.</p></div>';
    return;
  }
  box.innerHTML='<paypal-button id="paypal-btn-ah" type="pay" class="paypal-gold"></paypal-button>';
  const sesion=inst.createPayPalOneTimePaymentSession({
    onApprove:async(data)=>{
      const p=CHK.ctx; if(!p)return;
      try{
        await capturarOrden(data.orderId);
        await terminarPagoOnline(p,data.orderId);
      }catch(e){
        console.error(e);
        mostrarError(e&&e.fase==='captura'?mensajeFalloCaptura(p):'PayPal no ha podido completar el pago. Inténtalo de nuevo.');
      }finally{CHK.ocupado=false;}
    },
    onCancel:()=>{CHK.ocupado=false;mostrarError('Has cancelado el pago en PayPal. Puedes intentarlo de nuevo cuando quieras.');},
    onError:(e)=>{console.error('PayPal',e);CHK.ocupado=false;mostrarError('PayPal no ha podido completar el pago. Inténtalo de nuevo.');}
  });
  document.getElementById('paypal-btn-ah').addEventListener('click',()=>{
    if(CHK.ocupado||CHK.terminado)return;
    const p=prepararPedido('PayPal'); if(!p)return;
    CHK.ocupado=true;CHK.ctx=p;mostrarError('');
    // start() debe llamarse dentro del clic; el pedido se crea mientras se abre la ventana de PayPal.
    sesion.start({presentationMode:'auto'},crearOrdenPayPal(p).then(o=>({orderId:o.id}))).catch(e=>{
      console.error(e);CHK.ocupado=false;
      mostrarError(mensajeUsuario(e,'No se ha podido abrir PayPal. Inténtalo de nuevo.'));
    });
  });
}
function falloCargaPago(seq,e){
  console.error('No se pudo preparar el pago:',e);
  if(seq!==CHK.seq)return;
  const box=document.getElementById('paypal-payment-box'); if(!box)return;
  box.innerHTML=`<div class="pago-instrucciones"><h3>No hemos podido cargar el pago seguro</h3><p>Recarga la página e inténtalo de nuevo. Si el problema continúa, puedes pagar por Bizum o escribirnos por <a href="https://wa.me/${WHATSAPP}" target="_blank" rel="noopener">WhatsApp</a>.</p></div>`;
}
async function copiarTexto(t,aviso){
  try{await navigator.clipboard.writeText(t);mostrarAvisoCarrito(aviso);}catch(_){alert(t);}
}
async function confirmarPedidoSinPagoOnline(metodo){
  if(CHK.ocupado||CHK.terminado)return;
  const p=prepararPedido(metodo); if(!p)return;
  const btn=document.getElementById('btn-pagar');
  CHK.ocupado=true;mostrarError('');
  if(btn){btn.disabled=true;btn.textContent='Enviando pedido…';}
  try{
    const bizum=metodo==='Bizum';
    await enviarPedidoFormspree(p.items,p.subtotal,p.envio,p.cliente,metodo,p.numero,{estado:bizum?'PENDIENTE — esperando el Bizum del cliente':'PENDIENTE — pago en efectivo en el taller el día de la recogida'});
    cerrarPedido(p);
    const box=document.getElementById('checkout-accion');
    if(bizum){
      box.innerHTML=`<div class="pago-instrucciones">
        <h3>Pago mediante Bizum</h3>
        <p>Tu pedido <strong>${escHTML(p.numero)}</strong> está registrado. Para completarlo, haz este Bizum desde la app de tu banco:</p>
        <p><strong>Número:</strong> ${BIZUM_VISIBLE}</p>
        <p><strong>Importe:</strong> ${formatoEuros(p.total)}</p>
        <p><strong>Concepto:</strong> ${escHTML(p.numero)}</p>
        <p>El pedido quedará pendiente de confirmación hasta que recibamos el Bizum. Te hemos enviado los datos al correo indicado.</p>
        <button type="button" class="btn btn-pagar" id="copiar-bizum">Copiar número Bizum</button>
        <button type="button" class="btn btn-pagar" id="copiar-concepto">Copiar concepto</button>
      </div>`;
      document.getElementById('copiar-bizum').addEventListener('click',()=>copiarTexto(BIZUM,'Número Bizum copiado.'));
      document.getElementById('copiar-concepto').addEventListener('click',()=>copiarTexto(p.numero,'Concepto copiado.'));
    }else{
      box.innerHTML=`<div class="pago-instrucciones">
        <h3>Pedido ${escHTML(p.numero)} recibido</h3>
        <p><strong>Pago en efectivo en el taller.</strong> El pago se efectuará el día acordado para la recogida. No se aplican gastos de envío.</p>
        <p><strong>Total a pagar: ${formatoEuros(p.total)}</strong></p>
        <p>Te hemos enviado la confirmación al correo indicado.</p>
      </div>`;
    }
  }catch(e){
    console.error(e);
    mostrarError('No hemos podido registrar tu pedido. Inténtalo de nuevo en unos segundos o escríbenos por WhatsApp.');
    if(btn&&btn.isConnected){btn.disabled=false;btn.textContent=metodo==='Bizum'?'Confirmar pedido y ver datos de Bizum':'Confirmar pedido (pago en el taller)';}
  }finally{CHK.ocupado=false;}
}
// Muestra SOLO lo que corresponde al método elegido.
function pintarAccion(metodo){
  const box=document.getElementById('checkout-accion'); if(!box||CHK.terminado)return;
  const seq=++CHK.seq;
  mostrarError('');
  if(metodo==='Tarjeta'||metodo==='PayPal'){
    box.innerHTML=`<div id="paypal-payment-box"><p class="ayuda-cp">Cargando el pago seguro de PayPal…</p></div>`;
    (metodo==='Tarjeta'?montarTarjeta(seq):montarPayPal(seq)).catch(e=>falloCargaPago(seq,e));
  }else{
    box.innerHTML=`<button id="btn-pagar" class="btn btn-pagar" type="button">${metodo==='Bizum'?'Confirmar pedido y ver datos de Bizum':'Confirmar pedido (pago en el taller)'}</button>`;
    document.getElementById('btn-pagar').addEventListener('click',()=>confirmarPedidoSinPagoOnline(metodo));
  }
}
function pintarCamposCheckout(metodo){
  const efectivo=esEfectivo(metodo);
  const d=document.getElementById('datos-entrega');
  if(d) d.hidden=efectivo;
  const aviso=document.getElementById('aviso-efectivo');
  if(aviso) aviso.hidden=!efectivo;
  actualizarResumenCheckout(leerCarrito(),metodo);
  pintarAccion(metodo);
}
function htmlCarritoVacio(){return '<div class="carrito-vacio"><h1>Tu carrito está vacío</h1><p>Cuando encuentres algo que quieras conservar, añádelo aquí.</p><a class="btn btn-primario" href="tienda.html#categorias-tienda">Explorar la tienda</a></div>';}
function renderCarrito(){
  const root=document.getElementById('carrito-contenido');
  if(!root)return;
  let c=leerCarrito();
  if(!c.length){root.innerHTML=htmlCarritoVacio();return;}
  const sub=()=>subtotalCarrito(c);
  function pintar(){
    if(!c.length){root.innerHTML=htmlCarritoVacio();return;}
    const clientePrev=datosClienteCrudo();
    const metodoPrev=document.getElementById('metodo-pago')?.value||'Tarjeta';
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
        <div id="checkout-accion"></div>
        <p id="pago-error" class="ayuda-cp" role="alert" hidden style="color:#9A5325;font-weight:600;font-size:.85rem;margin-top:10px"></p>
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
    select.value=metodoPrev;
    select.addEventListener('change',()=>pintarCamposCheckout(select.value));
    ['cliente-nombre','cliente-email','cliente-telefono','cliente-direccion','cp-envio'].forEach(id=>{
      document.getElementById(id)?.addEventListener('input',()=>{mostrarError('');actualizarResumenCheckout(c,select.value);});
    });
    pintarCamposCheckout(select.value);
  }
  pintar();
}
