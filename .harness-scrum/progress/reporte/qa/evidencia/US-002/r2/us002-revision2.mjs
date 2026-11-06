import assert from 'node:assert/strict';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {browser,staticServer,controlledNetwork,qaRoot,projectRoot,delay} from './cdp.mjs';
import {offer,catalog} from './fixtures.mjs';
const out=qaRoot+'/us002-r2-evidence';await mkdir(out,{recursive:true});
const host=await staticServer();const results=[],openClients=new Set();
const profile='00000000-0000-4000-8000-000000000002';
const intruder='00000000-0000-4000-8000-000000000099';
const accepted=(id=profile)=>({task:'00000000-0000-4000-8000-000000000001',ux:[],response:{},profile:{id,interests:{}}});
const item=catalog[0];const rows=[...catalog,offer('SEGUNDA','Comida')];
const filterMap=[['Comida','comida-seg'],['Electronica','electronica-seg'],['Cine','cine-seg'],['Ropa','ropa-seg'],['Online','online-seg'],['Todos','category-filter'],['Viajes','category-filter']];
const api=url=>{const u=new URL(url);return u.hostname==='localhost'&&u.port==='8686'&&u.pathname==='/track';};
async function click(c,s){const p=await c.evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(s)});if(!e||e.closest('[hidden]'))throw Error('Missing control '+${JSON.stringify(s)});e.scrollIntoView({block:'center',behavior:'instant'});const r=e.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()`);for(const type of ['mousePressed','mouseReleased'])await c.send('Input.dispatchMouseEvent',{type,button:'left',clickCount:1,...p});}
async function key(c,key){for(const type of ['keyDown','keyUp'])await c.send('Input.dispatchKeyEvent',{type,key,code:key});await delay(30);}
async function visible(c,s){return c.evaluate(`!document.querySelector(${JSON.stringify(s)}).closest('[hidden]')`);}
const text=(c,s)=>c.evaluate(`document.querySelector(${JSON.stringify(s)}).textContent.trim()`);
async function waitUntil(fn,description,timeout=5000){const until=Date.now()+timeout;do{if(await fn())return;await delay(30);}while(Date.now()<until);throw Error('Timeout '+description);}
const events=ctx=>ctx.calls.flatMap(call=>call.body.events);
const redeems=ctx=>events(ctx).filter(e=>e.type==='offer-redeem');
async function waitCalls(ctx,n){await waitUntil(()=>ctx.calls.length>=n,'track calls '+n);}
async function saved(c){return c.evaluate('JSON.parse(localStorage.getItem("mastv.visitor.v1"))');}
async function profileSaved(c){await c.waitFor(`JSON.parse(localStorage.getItem('mastv.visitor.v1'))?.profileId===${JSON.stringify(profile)}`);}
async function select(ctx,name='Comida'){await click(ctx.c,`#categoryFilters [data-filter="${name}"]`);}
async function detail(ctx,index=1){await click(ctx.c,`#offerList article:nth-child(${index}) button`);assert.equal(await visible(ctx.c,'#detailView'),true);}
async function openConfirm(ctx){await click(ctx.c,'#redeemButton');assert.equal(await visible(ctx.c,'#confirmModal'),true);}
async function prime(ctx){await select(ctx);await profileSaved(ctx.c);await detail(ctx);await waitCalls(ctx,2);}
async function checkProps(event,source=item,redeem=false){
  const p=event.properties;
  const expected={id:source.id_offer,offer_id:source.id_offer,title:source.titulo,category:source.categoria,store:source.establecimiento,entidad_federativa:source.entidad_federativa||null,price_original:source.precio_original,price:source.precio_oferta,price_offer:source.precio_oferta,discount_percentage:source.descuento_porcentaje,coupon_code:source.codigo_cupon,expiration_date:source.fecha_expiracion,offer_type:source.tipo_oferta,action:redeem?'offer_redeem':'offer_click'};
  for(const [k,v]of Object.entries(expected))assert.deepEqual(p[k],v,k);
  if(redeem){assert.equal(p.coupon,source.codigo_cupon);assert.ok(Number.isFinite(Date.parse(p.redeemed_at)));}
}
async function screenshot(c,name){const r=await c.send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});await writeFile(out+'/'+name+'.png',Buffer.from(r.data,'base64'));}
async function setup(options={}){
  const c=await browser(),calls=[],errors=[];openClients.add(c);let release=()=>{};
  c.on('Runtime.exceptionThrown',p=>errors.push(p.exceptionDetails.exception?.description||p.exceptionDetails.text));
  await c.send('Emulation.setDeviceMetricsOverride',{width:options.mobile?320:430,height:options.mobile?568:932,deviceScaleFactor:1,mobile:true});
  if(options.storageDenied)await c.send('Page.addScriptToEvaluateOnNewDocument',{source:'Object.defineProperty(window,"localStorage",{configurable:true,get(){throw new DOMException("QA storage denied","SecurityError")}});'});
  let resolveGate;const gate=new Promise(resolve=>{resolveGate=resolve;});release=resolveGate;
  const ctx={c,calls,errors,release,mode:options.mode||'accepted'};
  await controlledNetwork(c,host.origin,p=>{
    const u=new URL(p.request.url);
    if(u.hostname==='localhost'&&u.port==='1337'&&u.pathname==='/api/offers')return {body:{data:rows}};
    if(!api(u))return null;
    if(p.request.method==='OPTIONS')return {status:204,body:'',headers:[{name:'Access-Control-Allow-Methods',value:'POST, OPTIONS'},{name:'Access-Control-Allow-Headers',value:'Content-Type, Accept'}]};
    assert.equal(p.request.method,'POST');const body=JSON.parse(p.request.postData);calls.push({body});
    const isRedeem=body.events.some(e=>e.type==='offer-redeem');
    if(options.allFail)return {error:'ConnectionFailed'};
    let response={body:accepted()};
    if(isRedeem){
      if(ctx.mode==='reject')response={body:{...accepted(intruder),response:{errors:['QA rejected']}}};
      if(ctx.mode==='invalid')response={body:{profile:{id:intruder}}};
      if(ctx.mode==='invalidJSON')response={body:'{ QA malformed JSON'};
      if(ctx.mode==='network')response={error:'ConnectionFailed'};
    }
    if((options.firstDelayed&&calls.length===1)||(options.redeemDelayed&&isRedeem))response.wait=gate;
    if(options.personalization&&calls.length===1)response={body:{...accepted(),profile:{id:profile,interests:{Comida:4,Cine:2}}},wait:gate};
    return response;
  });
  await c.send('Page.navigate',{url:host.origin+'/'});await c.waitFor('!!document.querySelector("#locationModal")&&!document.querySelector("#locationModal").hidden');
  await click(c,'#declineLocation');await c.waitFor('document.querySelector("#offerList").getAttribute("aria-busy")==="false"');
  await delay(80);assert.equal(calls.length,0,'Initial render must not track');
  return ctx;
}

const cases=filterMap.map(([name,type])=>[`Registrar selección de filtro: ${name}`,async ctx=>{
  await select(ctx,name);await waitCalls(ctx,1);await profileSaved(ctx.c);
  const body=ctx.calls[0].body;assert.equal(body.source.id,'demo-source');assert.ok(body.session.id);assert.equal(body.profile,null);assert.equal(body.events.length,1);
  const event=body.events[0];assert.equal(event.type,type);assert.equal(event.properties.category,name);assert.ok(Number.isFinite(Date.parse(event.properties.filter_time)));
  if(type!=='category-filter')assert.equal(event.properties.action,'category_filter');
  return {category:name,type,count:1};
}]);
cases.push(
  ['Registrar apertura de beneficio',async ctx=>{await prime(ctx);const body=ctx.calls[1].body;assert.deepEqual(body.events.map(e=>e.type),['offer-click','offer-view']);for(const event of body.events)await checkProps(event);return {types:body.events.map(e=>e.type),samePublishedOffer:true};}],
  ['Vincular interacciones con perfil y serializar primera respuesta',async ctx=>{
    await select(ctx);await waitCalls(ctx,1);await detail(ctx);await delay(150);assert.equal(ctx.calls.length,1,'Later opening must await first profile');assert.equal(ctx.calls[0].body.profile,null);
    ctx.release();await waitCalls(ctx,2);assert.equal(ctx.calls[1].body.profile.id,profile);assert.equal(ctx.calls[0].body.session.id,ctx.calls[1].body.session.id);return {initialPendingRequests:1,nextProfileMatches:true};
  },{firstDelayed:true}],
  ['Mantener identidad al recargar',async ctx=>{
    await select(ctx);await profileSaved(ctx.c);const first=ctx.calls[0].body;
    await ctx.c.send('Page.reload');await ctx.c.waitFor('!!document.querySelector("#locationModal")&&!document.querySelector("#locationModal").hidden');await click(ctx.c,'#declineLocation');await ctx.c.waitFor('document.querySelector("#offerList").getAttribute("aria-busy")==="false"');
    await select(ctx);await detail(ctx,2);await waitCalls(ctx,3);for(const call of ctx.calls.slice(1)){assert.equal(call.body.session.id,first.session.id);assert.equal(call.body.profile.id,profile);}assert.equal(ctx.calls.at(-1).body.events[0].properties.id,'QA-SEGUNDA');return {reloadSessionMatches:true,reloadProfileMatches:true};
  }],
  ['Continuar sin persistencia',async ctx=>{await select(ctx);await waitCalls(ctx,1);await detail(ctx);await waitCalls(ctx,2);assert.equal(ctx.calls[1].body.session.id,ctx.calls[0].body.session.id);assert.equal(ctx.calls[1].body.profile.id,profile);return {storage:'getter throws SecurityError',memoryIdentityPreserved:true};},{storageDenied:true}],
  ['Confirmar registro de canje',async ctx=>{
    await prime(ctx);await openConfirm(ctx);await click(ctx.c,'#confirmRedeem');await waitUntil(()=>redeems(ctx).length===1,'redeem request');
    assert.equal(await visible(ctx.c,'#successModal'),false,'No success while waiting for acceptance');
    assert.match(await text(ctx.c,'#confirmStatus'),/Registrando/);ctx.release();await ctx.c.waitFor('!document.querySelector("#successModal").hidden');
    await checkProps(redeems(ctx)[0],item,true);assert.match((await text(ctx.c,'#successModal')).toLowerCase(),/registr/);assert.match(await text(ctx.c,'#redemptionFeedback'),/se registró/);
    const r=await ctx.c.evaluate('(()=>{const r=document.querySelector("#successModal .dialog").getBoundingClientRect();return {top:r.top,bottom:r.bottom,h:innerHeight}})()');assert.ok(r.top>=0&&r.bottom<=r.h);
    return {redeems:1,successOnlyAfterAcceptance:true,mobileDialogBounded:true};
  },{redeemDelayed:true,mobile:true}],
  ...[['cancelar','#cancelRedeem'],['cerrar el diálogo','#closeConfirm'],['la tecla de escape',null]].map(([exit,selector])=>[`Abandonar confirmación: ${exit}`,async ctx=>{
    await prime(ctx);await openConfirm(ctx);if(selector)await click(ctx.c,selector);else await key(ctx.c,'Escape');await delay(160);assert.equal(await visible(ctx.c,'#confirmModal'),false);assert.equal(redeems(ctx).length,0);assert.equal(ctx.calls.length,2);return {exit,redeems:0};
  }]),
  ['Evitar duplicados pendientes y no interrumpir con respuesta tardía',async ctx=>{
    await prime(ctx);await openConfirm(ctx);await click(ctx.c,'#confirmRedeem');await waitUntil(()=>redeems(ctx).length===1,'first pending redeem');
    await click(ctx.c,'#confirmRedeem');assert.equal(await ctx.c.evaluate('document.querySelector("#confirmRedeem").disabled'),true);assert.equal(await visible(ctx.c,'#successModal'),false);await delay(120);assert.equal(redeems(ctx).length,1);
    await key(ctx.c,'Escape');await click(ctx.c,'#backToCatalog');await detail(ctx,2);assert.equal(await text(ctx.c,'#detailTitle'),'QA beneficio SEGUNDA');ctx.release();await waitCalls(ctx,4);await delay(120);
    assert.equal(await visible(ctx.c,'#successModal'),false);assert.equal(await text(ctx.c,'#detailTitle'),'QA beneficio SEGUNDA');assert.equal(redeems(ctx).length,1);assert.equal(await text(ctx.c,'#redemptionFeedback'),'');assert.equal(await ctx.c.evaluate('document.querySelector("#redeemButton").disabled'),false);await openConfirm(ctx);assert.equal(await text(ctx.c,'#confirmOfferName'),'QA beneficio SEGUNDA');assert.equal(await text(ctx.c,'#confirmStatus'),'');await click(ctx.c,'#cancelRedeem');assert.equal(await visible(ctx.c,'#confirmModal'),false);return {redeems:1,newDetailUnaffectedByLateAcceptance:true,stalePendingMessageCleared:true,secondOfferCanConfirm:true};
  },{redeemDelayed:true}],
  ...[['rechazo del registro','reject'],['respuesta sin aceptación válida','invalid'],['fallo de comunicación','network']].map(([result,mode])=>[`Informar canje no confirmado: ${result}`,async ctx=>{
    await prime(ctx);const initial=await saved(ctx.c);await openConfirm(ctx);await click(ctx.c,'#confirmRedeem');await ctx.c.waitFor('document.querySelector("#confirmStatus").textContent.includes("No pudo confirmarse")');
    assert.equal(await visible(ctx.c,'#successModal'),false);assert.deepEqual(await saved(ctx.c),initial);assert.equal(redeems(ctx).length,1);assert.equal(await ctx.c.evaluate('document.querySelector("#confirmRedeem").disabled'),false);
    if(mode==='invalid'){
      ctx.mode='invalidJSON';await click(ctx.c,'#confirmRedeem');await waitUntil(()=>redeems(ctx).length===2,'invalid JSON attempt');await ctx.c.waitFor('document.querySelector("#confirmStatus").textContent.includes("No pudo confirmarse")');assert.equal(await visible(ctx.c,'#successModal'),false);assert.deepEqual(await saved(ctx.c),initial);
    }
    return {result,registeredMessageShown:false,identityUnchanged:true,invalidJSONAlsoCovered:mode==='invalid'};
  },{mode}]),
  ['Continuar consultando si falla medición',async ctx=>{
    await select(ctx);await detail(ctx);assert.equal(await text(ctx.c,'#detailTitle'),item.titulo);await ctx.c.send('Browser.grantPermissions',{origin:host.origin,permissions:['clipboardReadWrite','clipboardSanitizedWrite']});await ctx.c.send('Page.bringToFront');await click(ctx.c,'#copyCode');await ctx.c.waitFor('document.querySelector("#copyFeedback").textContent.includes("Código copiado")');assert.equal(await ctx.c.evaluate('navigator.clipboard.readText()'),item.codigo_cupon);return {detailAvailable:true,realClipboardMatches:true};
  },{allFail:true}],
  ['Actualizar catálogo sin interacción extra',async ctx=>{
    await ctx.c.evaluate('window.qaRenderCount=0;window.qaObserver=new MutationObserver(m=>{if(m.some(x=>x.type==="childList"))window.qaRenderCount++});window.qaObserver.observe(document.querySelector("#offerList"),{childList:true});true');
    await select(ctx);await waitCalls(ctx,1);await delay(60);const before=await ctx.c.evaluate('window.qaRenderCount');ctx.release();await profileSaved(ctx.c);
    await ctx.c.waitFor(`window.qaRenderCount>${before}`);await delay(160);assert.equal(ctx.calls.length,1);assert.deepEqual(events(ctx).map(e=>e.type),['comida-seg']);return {responseTriggeredActualDomRefresh:true,extraInteractions:0};
  },{personalization:true}]
);
assert.equal(cases.length,21);
try{
  for(const [name,test,options={}]of cases.filter((_,index)=>[11,15,16].includes(index))){let ctx;const id=String(results.length+1).padStart(2,'0');try{
    ctx=await setup(options);const observed=await test(ctx);assert.deepEqual(ctx.errors,[]);await screenshot(ctx.c,id);results.push({id,name,status:'PASS',observed,calls:ctx.calls,uncaughtErrors:ctx.errors});
  }catch(error){if(ctx)try{await screenshot(ctx.c,id+'-failure');}catch{}results.push({id,name,status:'FAIL',error:error.stack,calls:ctx?.calls,uncaughtErrors:ctx?.errors});}finally{if(ctx){ctx.release();await ctx.c.close();openClients.delete(ctx.c);}}
  await writeFile(out+'/results.json',JSON.stringify({scope:'US002 revision2 focal: pending state and same-offer success/rejection',date:new Date().toISOString(),results},null,2));console.log(JSON.stringify({id,name,status:results.at(-1).status,error:results.at(-1).error?.split('\n')[0]}));}
  const hashes={};for(const f of ['index.html','css/styles.css','js/app.js','js/catalog.js','js/config.js','js/tracking.js'])hashes[f]=createHash('sha256').update(await readFile(projectRoot+'/'+f)).digest('hex');await writeFile(out+'/source-hashes.json',JSON.stringify(hashes,null,2));
  const failed=results.filter(r=>r.status==='FAIL').length;console.log(JSON.stringify({total:results.length,passed:results.length-failed,failed}));process.exitCode=failed?1:0;
}finally{for(const c of openClients)await c.close();await host.close();}
