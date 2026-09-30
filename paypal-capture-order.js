exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') return {statusCode:405,body:'Method Not Allowed'};
  try {
    const id=process.env.PAYPAL_CLIENT_ID, secret=process.env.PAYPAL_CLIENT_SECRET;
    const base=process.env.PAYPAL_API_BASE || 'https://api-m.paypal.com';
    const orderId=(event.queryStringParameters||{}).orderId;
    if(!id||!secret||!orderId) return {statusCode:400,headers:{'Content-Type':'application/json'},body:JSON.stringify({error:'Missing configuration or order ID.'})};
    const auth=Buffer.from(`${id}:${secret}`).toString('base64');
    const tok=await fetch(`${base}/v1/oauth2/token`,{method:'POST',headers:{Authorization:`Basic ${auth}`,'Content-Type':'application/x-www-form-urlencoded'},body:'grant_type=client_credentials'});
    const td=await tok.json(); if(!tok.ok) throw new Error('token');
    const r=await fetch(`${base}/v2/checkout/orders/${encodeURIComponent(orderId)}/capture`,{method:'POST',headers:{Authorization:`Bearer ${td.access_token}`,'Content-Type':'application/json'}});
    const data=await r.json();
    return {statusCode:r.status,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'},body:JSON.stringify(data)};
  }catch(e){return {statusCode:500,headers:{'Content-Type':'application/json'},body:JSON.stringify({error:'Could not capture PayPal order.'})};}
};
