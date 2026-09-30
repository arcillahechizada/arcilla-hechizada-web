const REPO='arcillahechizada/arcilla-hechizada-web';
const RAW='https://raw.githubusercontent.com/arcillahechizada/arcilla-hechizada-web/main/';
function shipping(cp){const s=String(cp||'').replace(/\D/g,'');if(!/^\d{5}$/.test(s))return null;const pref=Number(s.slice(0,2));return [35,38,51,52].includes(pref)?7.50:6.50;}
async function loadProducts(){
  const folders=['data/productos','data/infusiones','data/inciensos']; const all=[];
  for(const folder of folders){
    const r=await fetch(`https://api.github.com/repos/${REPO}/contents/${folder}?ref=main`,{headers:{Accept:'application/vnd.github+json'}});
    if(!r.ok)continue; const files=await r.json();
    for(const f of files.filter(x=>x.type==='file'&&/\.json$/i.test(x.name))){const rr=await fetch(f.download_url);if(rr.ok)all.push(await rr.json());}
  }
  const fallback=await fetch(`${RAW}data/productos.json`); if(fallback.ok){const d=await fallback.json();for(const x of (d.productos||[])){if(!all.some(p=>p.id===x.id))all.push(x);}}
  const pu=await fetch(`${RAW}data/piezas-unicas.json`);if(pu.ok){const d=await pu.json();for(const x of (d.piezas||[])){if(!all.some(p=>p.id===x.id))all.push(x);}}
  return all;
}
async function token(){const id=process.env.PAYPAL_CLIENT_ID,secret=process.env.PAYPAL_CLIENT_SECRET,base=process.env.PAYPAL_API_BASE||'https://api-m.paypal.com';const auth=Buffer.from(`${id}:${secret}`).toString('base64');const r=await fetch(`${base}/v1/oauth2/token`,{method:'POST',headers:{Authorization:`Basic ${auth}`,'Content-Type':'application/x-www-form-urlencoded'},body:'grant_type=client_credentials'});const d=await r.json();if(!r.ok)throw new Error('token');return {token:d.access_token,base};}
exports.handler=async event=>{if(event.httpMethod!=='POST')return{statusCode:405,body:'Method Not Allowed'};try{if(!process.env.PAYPAL_CLIENT_ID||!process.env.PAYPAL_CLIENT_SECRET)throw new Error('credentials');const b=JSON.parse(event.body||'{}');const items=Array.isArray(b.items)?b.items:[];const cp=String(b.cp||'');const ship=shipping(cp);if(!items.length||ship===null) return {statusCode:400,headers:{'Content-Type':'application/json'},body:JSON.stringify({error:'Invalid cart or postal code.'})};const products=await loadProducts();let subtotal=0;for(const it of items){const p=products.find(x=>x.id===it.id);const q=Math.max(1,Math.min(99,Number(it.quantity)||1));if(!p||['agotado','vendido','vendida','reservada','oculto'].includes(p.estado)||!Number.isFinite(Number(p.precio)))throw new Error('invalid-item');subtotal+=Number(p.precio)*q;}const total=subtotal+ship;const {token,base}=await token();const r=await fetch(`${base}/v2/checkout/orders`,{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify({intent:'CAPTURE',purchase_units:[{amount:{currency_code:'EUR',value:total.toFixed(2)}}]})});const d=await r.json();return{statusCode:r.status,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'},body:JSON.stringify({id:d.id,details:d,total:total.toFixed(2)})};}catch(e){return{statusCode:500,headers:{'Content-Type':'application/json'},body:JSON.stringify({error:'Could not create PayPal order.'})};}};
