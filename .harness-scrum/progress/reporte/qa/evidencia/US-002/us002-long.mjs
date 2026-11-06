import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {browser,staticServer,controlledNetwork,qaRoot,delay} from './cdp.mjs';
import {offer} from './fixtures.mjs';
const host=await staticServer();let c,release;const calls=[],errors=[];
const gate=new Promise(resolve=>{release=resolve;});const output=qaRoot+'/us002-evidence';
const payload=offer('LONG','Comida',{titulo:'QA título '.repeat(20),descripcion:'QA descripción extensa '.repeat(20),codigo_cupon:'QA-CUPON-LARGO-'.repeat(10)});
async function click(selector,scroll=true){const p=await c.evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});if(e.closest('[hidden]'))throw Error('Control hidden');${scroll?"e.scrollIntoView({behavior:'instant',block:'center'});":''}const r=e.getBoundingClientRect();if(r.top<0||r.bottom>innerHeight)throw Error('Control outside viewport');return{x:r.x+r.width/2,y:r.y+r.height/2}})()`);for(const type of ['mousePressed','mouseReleased'])await c.send('Input.dispatchMouseEvent',{type,button:'left',clickCount:1,...p});}
async function key(key,modifiers=0){for(const type of ['keyDown','keyUp'])await c.send('Input.dispatchKeyEvent',{type,key,code:key,modifiers,...(key==='Enter'?{windowsVirtualKeyCode:13,nativeVirtualKeyCode:13,...(type==='keyDown'?{text:'\r',unmodifiedText:'\r'}:{})}:{})});await delay(40);}
async function geometry(){return c.evaluate('(()=>{const d=document.querySelector("#confirmModal .dialog"),r=d.getBoundingClientRect();return{top:r.top,bottom:r.bottom,viewport:innerHeight,scrollTop:d.scrollTop,scrollHeight:d.scrollHeight,clientHeight:d.clientHeight}})()');}
async function wheel(deltaY){await c.send('Input.dispatchMouseEvent',{type:'mouseWheel',x:160,y:284,deltaX:0,deltaY});await delay(160);}
async function shot(name){const r=await c.send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});await writeFile(output+'/'+name+'.png',Buffer.from(r.data,'base64'));}
try{
  c=await browser();c.on('Runtime.exceptionThrown',p=>errors.push(p.exceptionDetails.text));
  await c.send('Emulation.setDeviceMetricsOverride',{width:320,height:568,deviceScaleFactor:1,mobile:true});
  await controlledNetwork(c,host.origin,p=>{
    const u=new URL(p.request.url);
    if(u.port==='1337'&&u.pathname==='/api/offers')return{body:{data:[payload]}};
    if(u.port!=='8686'||u.pathname!=='/track')return null;
    if(p.request.method==='OPTIONS')return{status:204,body:'',headers:[{name:'Access-Control-Allow-Headers',value:'Content-Type, Accept'},{name:'Access-Control-Allow-Methods',value:'POST, OPTIONS'}]};
    const body=JSON.parse(p.request.postData);calls.push(body);return{body:{task:'00000000-0000-4000-8000-000000000001',ux:[],response:{},profile:{id:'00000000-0000-4000-8000-000000000002',interests:{}}},...(body.events.some(e=>e.type==='offer-redeem')?{wait:gate}:{})};
  });
  await c.send('Page.navigate',{url:host.origin+'/'});await c.waitFor('!!document.querySelector("#locationModal")&&!document.querySelector("#locationModal").hidden');await click('#declineLocation');await c.waitFor('document.querySelector("#offerList").getAttribute("aria-busy")==="false"');await click('#categoryFilters [data-filter="Comida"]');await click('#offerList article button');await click('#redeemButton');
  const initial=await geometry();assert.ok(initial.top>=0&&initial.bottom<=568);await wheel(1200);const scrolled=await geometry();assert.ok(scrolled.scrollTop>0);await click('#cancelRedeem',false);assert.equal(await c.evaluate('document.querySelector("#confirmModal").hidden'),true);
  await click('#redeemButton');await wheel(-1200);await click('#closeConfirm',false);await click('#redeemButton');
  const focus=[];for(const id of ['closeConfirm','confirmRedeem','cancelRedeem']){await key('Tab');assert.equal(await c.evaluate('document.activeElement.id'),id);const g=await c.evaluate('(()=>{const r=document.activeElement.getBoundingClientRect();return{top:r.top,bottom:r.bottom}})()');assert.ok(g.top>=0&&g.bottom<=568);focus.push({id,...g});}
  await key('Tab',8);await key('Enter');await c.waitFor('document.querySelector("#confirmStatus").textContent.includes("Registrando")');assert.equal(await c.evaluate('document.querySelector("#successModal").hidden'),true);const pending=await geometry();assert.ok(pending.top>=0&&pending.bottom<=568);await shot('long-pending-320');
  release();await c.waitFor('!document.querySelector("#successModal").hidden');await shot('long-success-320');await key('Escape');assert.equal(await c.evaluate('document.querySelector("#catalogView").hidden'),false);assert.equal(calls.flatMap(x=>x.events).filter(e=>e.type==='offer-redeem').length,1);assert.deepEqual(errors,[]);
  const result={status:'PASS',scope:'LONG320 regression with asynchronous confirmation and status message',initial,scrolled,pending,focus,redeems:1,noSuccessBeforeAcceptance:true,cancelCloseAndKeyboardWork:true,uncaughtErrors:errors};await writeFile(output+'/long.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));
}catch(error){const result={status:'FAIL',error:error.stack,uncaughtErrors:errors};await writeFile(output+'/long.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));process.exitCode=1;}finally{release();if(c)await c.close();await host.close();}
