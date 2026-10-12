import nodemailer from 'nodemailer';
import {fail} from './security.mjs';

export function emailConfigured(env=process.env) {
  return Boolean(env.EMAIL_FROM && (env.RESEND_API_KEY || env.EMAIL_WEBHOOK_URL || (env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASSWORD)));
}
export async function sendEmail(to,subject,text,{env=process.env,fetcher=fetch,transportFactory=nodemailer.createTransport}={}) {
  fail(emailConfigured(env),'EMAIL_UNAVAILABLE','Email delivery is not configured on this game server.',503);
  if(env.RESEND_API_KEY) {
    const response=await fetcher('https://api.resend.com/emails',{method:'POST',headers:{authorization:`Bearer ${env.RESEND_API_KEY}`,'content-type':'application/json'},body:JSON.stringify({from:env.EMAIL_FROM,to:[to],subject,text}),signal:AbortSignal.timeout(10000)});
    fail(response.ok,'EMAIL_DELIVERY','Email could not be sent. Please retry later.',502);
    return;
  }
  if(env.SMTP_HOST&&env.SMTP_USER&&env.SMTP_PASSWORD) {
    const port=Number(env.SMTP_PORT||587);
    fail(Number.isInteger(port)&&port>0&&port<65536,'EMAIL_CONFIG','Configure a valid SMTP port.',503);
    const secure=port===465||env.SMTP_SECURE==='true';
    const transport=transportFactory({host:env.SMTP_HOST,port,secure,requireTLS:!secure,auth:{user:env.SMTP_USER,pass:env.SMTP_PASSWORD},connectionTimeout:10000,socketTimeout:15000,tls:{minVersion:'TLSv1.2'},disableFileAccess:true,disableUrlAccess:true});
    try {await transport.sendMail({from:env.EMAIL_FROM,to,subject,text});}
    catch {fail(false,'EMAIL_DELIVERY','Email could not be sent. Please retry later.',502);}
    finally {transport.close?.();}
    return;
  }
  const endpoint=new URL(env.EMAIL_WEBHOOK_URL);
  fail(endpoint.protocol==='https:'||env.NODE_ENV!=='production','EMAIL_CONFIG','Production email delivery requires HTTPS.',503);
  const response=await fetcher(endpoint,{method:'POST',headers:{'content-type':'application/json',...(env.EMAIL_WEBHOOK_TOKEN?{authorization:`Bearer ${env.EMAIL_WEBHOOK_TOKEN}`}:{})},body:JSON.stringify({from:env.EMAIL_FROM,to,subject,text}),signal:AbortSignal.timeout(10000)});
  fail(response.ok,'EMAIL_DELIVERY','Email could not be sent. Please retry later.',502);
}
