import {createHmac,timingSafeEqual} from 'node:crypto';
import {fail} from './security.mjs';

export const premiumTiers=Object.freeze([
  {level:1,requiredXp:100,coins:25,cosmeticId:'frame-eclipse'},
  {level:2,requiredXp:500,coins:50,cosmeticId:'banner-solar'},
  {level:3,requiredXp:1000,coins:75,cosmeticId:'marks-galaxy'},
  {level:4,requiredXp:2000,coins:100,cosmeticId:'effect-dragon'},
  {level:5,requiredXp:3500,coins:150,cosmeticId:'arena-starlight'},
]);
export const passCoinPrice=900;
export function checkoutConfigured(env=process.env) {return Boolean(env.RAZORPAY_KEY_ID&&env.RAZORPAY_KEY_SECRET&&env.RAZORPAY_WEBHOOK_SECRET);}
function price(value,fallback) {
  const result=Number(value||fallback);
  fail(Number.isInteger(result)&&result>=100&&result<=99999900,'PAYMENT_CONFIG','Configure positive prices in paise.',503);
  return result;
}
export function commerceProducts(env=process.env) {
  return [
    {id:'coins-spark',name:'Spark pouch',coins:500,amount:price(env.RAZORPAY_SPARK_PAISE,4900),currency:'INR'},
    {id:'coins-flare',name:'Flare chest',coins:1200,amount:price(env.RAZORPAY_FLARE_PAISE,9900),currency:'INR'},
    {id:'coins-cosmic',name:'Cosmic vault',coins:3000,amount:price(env.RAZORPAY_COSMIC_PAISE,19900),currency:'INR'},
    {id:'season-pass',name:'Season cosmetic pass',coins:0,amount:price(env.RAZORPAY_PASS_PAISE,9900),currency:'INR'},
  ];
}
export function validHmac(payload,signature,key) {
  if(!key||typeof signature!=='string'||!/^[a-f0-9]{64}$/i.test(signature))return false;
  const expected=createHmac('sha256',key).update(payload).digest();
  return timingSafeEqual(expected,Buffer.from(signature,'hex'));
}
export function validateCapturedPayment(order,payment) {
  fail(payment?.status==='captured','PAYMENT_PENDING','Payment is awaiting capture. No reward has been granted.',409);
  fail(payment.order_id===order.providerOrderId&&payment.amount===order.amount&&payment.currency===order.currency,'PAYMENT_MISMATCH','Payment does not match the game order.',403);
  fail(/^pay_[A-Za-z0-9]+$/.test(payment.id||''),'PAYMENT_INVALID','Invalid payment identifier.',403);
  return payment;
}
