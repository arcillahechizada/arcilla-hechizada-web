exports.handler = async function () {
  try {
    const id = process.env.PAYPAL_CLIENT_ID;
    const secret = process.env.PAYPAL_CLIENT_SECRET;
    const base = process.env.PAYPAL_API_BASE || 'https://api-m.paypal.com';
    if (!id || !secret) return { statusCode: 500, headers: {'Content-Type':'application/json'}, body: JSON.stringify({error:'PayPal credentials are not configured on the server.'}) };
    const auth = Buffer.from(`${id}:${secret}`).toString('base64');
    const r = await fetch(`${base}/v1/oauth2/token`, {method:'POST',headers:{Authorization:`Basic ${auth}`,'Content-Type':'application/x-www-form-urlencoded'},body:'grant_type=client_credentials&response_type=client_token&intent=sdk_init'});
    const data = await r.json();
    if (!r.ok) return {statusCode:r.status,headers:{'Content-Type':'application/json'},body:JSON.stringify({error:'Could not obtain PayPal client token.'})};
    return {statusCode:200,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'},body:JSON.stringify({accessToken:data.access_token})};
  } catch(e){ return {statusCode:500,headers:{'Content-Type':'application/json'},body:JSON.stringify({error:'PayPal authentication error.'})}; }
};
