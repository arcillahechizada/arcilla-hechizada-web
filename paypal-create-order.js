const fetch = require('node-fetch');

exports.handler = async (event) => {
  const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'Content-Type','Access-Control-Allow-Methods':'POST, OPTIONS'};
  if(event.httpMethod==='OPTIONS') return {statusCode:204,headers:cors,body:''};
  try{
    const body=JSON.parse(event.body||'{}');
    const amount=Number(body.amount);
    if(!Number.isFinite(amount)||amount<=0) return {statusCode:400,headers:cors,body:JSON.stringify({error:'Importe de pedido no válido'})};

    const id=process.env.PAYPAL_CLIENT_ID, secret=process.env.PAYPAL_CLIENT_SECRET;
    const auth=Buffer.from(`${id}:${secret}`).toString('base64');
    const authRes=await fetch('https://api-m.paypal.com/v1/oauth2/token',{
      method:'POST',headers:{'Authorization':`Basic ${auth}`,'Content-Type':'application/x-www-form-urlencoded'},
      body:'grant_type=client_credentials'
    });
    const authData=await authRes.json();
    if(!authRes.ok) return {statusCode:authRes.status,headers:cors,body:JSON.stringify(authData)};

    const orderRes=await fetch('https://api-m.paypal.com/v2/checkout/orders',{
      method:'POST',
      headers:{'Authorization':`Bearer ${authData.access_token}`,'Content-Type':'application/json'},
      body:JSON.stringify({intent:'CAPTURE',purchase_units:[{amount:{currency_code:'EUR',value:amount.toFixed(2)}}]})
    });
    const orderData=await orderRes.json();
    return {statusCode:orderRes.status,headers:{...cors,'Content-Type':'application/json'},body:JSON.stringify(orderData)};
  }catch(error){
    return {statusCode:500,headers:cors,body:JSON.stringify({error:error.message})};
  }
};
