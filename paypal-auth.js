const fetch = require('node-fetch');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Methods': 'GET, OPTIONS'
    }, body: '' };
  }

  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
  if (!clientId || !clientSecret) return { statusCode: 500, headers:{'Access-Control-Allow-Origin':'*'}, body: JSON.stringify({error:'Faltan las variables PAYPAL_CLIENT_ID/PAYPAL_CLIENT_SECRET en Netlify'}) };

  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  try {
    const response = await fetch('https://api-m.paypal.com/v1/oauth2/token', {
      method:'POST',
      headers:{'Authorization':`Basic ${auth}`,'Content-Type':'application/x-www-form-urlencoded'},
      body:'grant_type=client_credentials&response_type=client_token&domains[]=arcillahechizada.github.io,https://www.arcillahechizada.com'
    });
    const data=await response.json();
    return { statusCode:response.status, headers:{'Access-Control-Allow-Origin':'*','Content-Type':'application/json'}, body:JSON.stringify(data) };
  } catch(error) {
    return { statusCode:500, headers:{'Access-Control-Allow-Origin':'*'}, body:JSON.stringify({error:error.message}) };
  }
};
