import assert from 'node:assert/strict';
import {mkdir, writeFile, readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {browser, staticServer, controlledNetwork, qaRoot, projectRoot, delay} from './cdp.mjs';
import {offer} from './fixtures.mjs';

const out=qaRoot+(process.argv.includes('--keyboard')?'/keyboard-evidence':process.argv.includes('--diagnose')?'/diagnostic-evidence':'/evidence-final');
const profile='00000000-0000-4000-8000-000000000005';
const session='00000000-0000-4000-8000-000000000050';
const files=['index.html','css/styles.css','js/app.js','js/catalog.js','js/config.js','js/tracking.js','js/interests.js','js/location.js'];
async function hashes(){const r={};for(const f of files)r[f]=createHash('sha256').update(await readFile(projectRoot+'/'+f)).digest('hex');return r;}
const flat=offer('HORIZONTAL','Comida',{imagen_promo:{url:'http://localhost:1337/uploads/qa-horizontal.svg'}});
const portraitFields=offer('VERTICAL-V4','Comida',{imagen_promo:{data:{attributes:{url:'/uploads/qa-vertical.svg'}}}});
const {id,...attributes}=portraitFields;
const portrait={id,attributes};
const national=offer('NATIONAL','Comida',{imagen_promo:{url:'/uploads/qa-horizontal.svg'}});
const cmx=offer('CMX','Cine',{entidad_federativa:'MX-CMX',imagen_promo:{url:'/uploads/qa-vertical.svg'}});
const jal=offer('JAL','Cine',{entidad_federativa:'MX-JAL',imagen_promo:{url:'/uploads/qa-horizontal.svg'}});
const ropa=offer('ROPA','Ropa',{imagen_promo:{url:'/uploads/qa-horizontal.svg'}});
const savedRegion={sessionId:session,profileId:profile,region:{isoRegion:'MX-CMX',country:'QA país',countryCode:'mx',state:'QA región',consentedAt:'2026-11-05T12:00:00.000Z'}};
const svg=(vertical=false)=>{const w=vertical?120:480,h=vertical?320:120;return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><rect width="${w}" height="${h}" fill="#54c8ef"/><rect x="2" y="2" width="${w-4}" height="${h-4}" fill="none" stroke="#db102b" stroke-width="4"/><circle cx="16" cy="16" r="8" fill="#111"/><circle cx="${w-16}" cy="${h-16}" r="8" fill="#111"/><text x="10" y="${h/2}" font-size="16">${vertical?'VERTICAL':'COMPLETA HORIZONTAL'}</text></svg>`;};
const events=ctx=>ctx.calls.flatMap(x=>x.events||[]);
const queryEvents=ctx=>events(ctx).filter(e=>['offer-click','offer-view'].includes(e.type));
async function key(c,key){const extra=key===' '?{code:'Space',windowsVirtualKeyCode:32,nativeVirtualKeyCode:32}:key==='Enter'?{code:'Enter',windowsVirtualKeyCode:13,nativeVirtualKeyCode:13}:key==='Tab'?{code:'Tab',windowsVirtualKeyCode:9}:{code:key};for(const type of ['keyDown','keyUp'])await c.send('Input.dispatchKeyEvent',{type,key,...extra,...(type==='keyDown'&&['Enter',' '].includes(key)?{text:key==='Enter'?'\r':' ',unmodifiedText:key==='Enter'?'\r':' '}:{})});await delay(25);c.keyboardEvents=await c.evaluate('window.qaKeyboardEvents||[]');}
async function click(c,selector){const p=await c.evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});if(!e||e.closest('[hidden]'))throw Error('Control invisible');e.scrollIntoView({block:'center',behavior:'instant'});const r=e.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()`);const hit=await c.evaluate(`document.elementFromPoint(${p.x},${p.y})?.outerHTML`);c.lastClick={selector,point:p,hit};for(const type of ['mousePressed','mouseReleased'])await c.send('Input.dispatchMouseEvent',{type,button:'left',clickCount:1,...p});}
async function titles(ctx){return ctx.c.evaluate('[...document.querySelectorAll("#offerList h3")].map(e=>e.textContent)');}
async function capture(ctx,name){await ctx.c.evaluate('window.scrollTo({top:0,behavior:"instant"});true');const r=await ctx.c.send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});await writeFile(out+'/'+name+'.png',Buffer.from(r.data,'base64'));}
async function loaded(ctx,count){await ctx.c.waitFor(`document.querySelectorAll('.offer-card__logo--promo img').length===${count}&&[...document.querySelectorAll('.offer-card__logo--promo img')].every(i=>i.complete&&i.naturalWidth>0&&!i.hidden)`);}
async function geometry(ctx){return ctx.c.evaluate(`(()=>{const rect=e=>{const r=e.getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom}};return{viewport:innerWidth,scrollWidth:document.documentElement.scrollWidth,cards:[...document.querySelectorAll('.offer-card')].map(a=>{const i=a.querySelector('img'),v=a.querySelector('.offer-card__logo'),h=a.querySelector('h3'),b=a.querySelector('button');return{title:h.textContent,card:rect(a),image:i?rect(i):null,natural:i?[i.naturalWidth,i.naturalHeight]:null,fit:i?getComputedStyle(i).objectFit:null,src:i?.src,alt:i?.alt,ariaHidden:v.getAttribute('aria-hidden'),icon:v.querySelector('span').textContent,iconHidden:v.querySelector('span').hidden,promo:v.classList.contains('offer-card__logo--promo'),heading:rect(h),button:rect(b),buttonText:b.textContent,tabIndex:b.tabIndex,fontSize:getComputedStyle(h).fontSize}})}})()`);}
function inside(a,b){return a.x>=b.x-0.5&&a.y>=b.y-0.5&&a.right<=b.right+0.5&&a.bottom<=b.bottom+0.5;}
async function checkImage(ctx,count){await loaded(ctx,count);const g=await geometry(ctx);assert.equal(g.scrollWidth,g.viewport,'No page horizontal overflow');for(const a of g.cards){assert.ok(a.promo);assert.ok(inside(a.image,a.card));assert.ok(inside(a.heading,a.card));assert.ok(inside(a.button,a.card));assert.ok(a.heading.width>0&&a.heading.height>0);assert.equal(a.fit,'contain');assert.equal(a.alt,'');assert.equal(a.ariaHidden,'true');assert.equal(a.iconHidden,true);assert.equal(a.buttonText,'Ver beneficio');assert.equal(a.tabIndex,0);const scale=Math.min(a.image.width/a.natural[0],a.image.height/a.natural[1]);a.paintedSize=[a.natural[0]*scale,a.natural[1]*scale];assert.ok(a.paintedSize[0]<=a.image.width+0.01&&a.paintedSize[1]<=a.image.height+0.01);}
 const ax=await ctx.c.send('Accessibility.getFullAXTree');const named=ax.nodes.filter(n=>!n.ignored).map(n=>({role:n.role?.value,name:n.name?.value}));for(const a of g.cards)assert.ok(named.some(n=>n.role==='heading'&&n.name===a.title));assert.equal(named.filter(n=>n.role==='button'&&n.name==='Ver beneficio').length,count);assert.ok(!named.some(n=>/qa-horizontal|qa-vertical|uploads\//.test(n.name||'')));g.accessibility=named.filter(n=>['heading','button','image'].includes(n.role));assert.equal(queryEvents(ctx).length,0,'Image loading must not produce consultation events');return g;}

await mkdir(out,{recursive:true});
const before=await hashes();await writeFile(out+'/source-hashes-before.json',JSON.stringify(before,null,2));
const host=await staticServer();const live=new Set(),results=[];
async function setup({width=480,rows=[flat,portrait],map={Comida:3},region=false}={}){
 const c=await browser();live.add(c);const ctx={c,calls:[],errors:[],consoleErrors:[],network:[]};
 c.on('Runtime.exceptionThrown',p=>ctx.errors.push(p.exceptionDetails.exception?.description||p.exceptionDetails.text));
 c.on('Runtime.consoleAPICalled',p=>{if(p.type==='error')ctx.consoleErrors.push(p.args.map(x=>x.value??x.description).join(' '));});
 await c.send('Emulation.setDeviceMetricsOverride',{width,height:1000,deviceScaleFactor:1,mobile:true});
 const seeds={'mastv.visitor.v1':JSON.stringify({sessionId:session,profileId:profile}),'mastv.interests.v1':JSON.stringify({profileId:profile,interests:map}),...(region?{'mastv.location.v1':JSON.stringify(savedRegion)}:{})};
 await c.send('Page.addScriptToEvaluateOnNewDocument',{source:`for(const [k,v]of Object.entries(${JSON.stringify(seeds)}))localStorage.setItem(k,v);`});
 ctx.network=await controlledNetwork(c,host.origin,p=>{
  const u=new URL(p.request.url);
  if(u.hostname==='localhost'&&u.port==='1337'&&u.pathname==='/api/offers'){assert.equal(p.request.method,'GET');assert.equal(u.searchParams.get('populate[imagen_promo]'),'true');return{body:{data:rows}};}
  if(u.hostname==='localhost'&&u.port==='1337'&&u.pathname.startsWith('/uploads/')){assert.equal(p.request.method,'GET');return u.pathname.endsWith('broken.svg')?{status:404,body:'Fixture missing',contentType:'text/plain'}:{body:svg(u.pathname.includes('vertical')),contentType:'image/svg+xml'};}
  if(u.hostname==='localhost'&&u.port==='8686'&&u.pathname==='/track'){
   if(p.request.method==='OPTIONS')return{status:204,body:'',headers:[{name:'Access-Control-Allow-Headers',value:'Content-Type, Accept'},{name:'Access-Control-Allow-Methods',value:'POST, OPTIONS'}]};
   assert.equal(p.request.method,'POST');ctx.calls.push(JSON.parse(p.request.postData));return{body:{task:'00000000-0000-4000-8000-000000000001',ux:[],response:{},profile:{id:profile}}};
  }
  return null;
 });
 await c.send('Page.navigate',{url:host.origin+'/'});
 await c.waitFor('document.readyState==="complete"&&document.querySelector("#offerList")?.getAttribute("aria-busy")==="false"&&document.querySelectorAll("#categoryFilters button").length>=2');
 if(await c.evaluate('!document.querySelector("#locationModal").hidden')){await click(c,'#declineLocation');await c.waitFor('document.querySelector("#locationModal").hidden');}
 if(await c.evaluate('document.querySelector("#catalogView").hidden'))await click(c,'#homeView [data-go="catalog"]');
 try{await c.waitFor('!document.querySelector("#catalogView").hidden');}catch(error){const debug=await c.evaluate('({url:location.href,width:innerWidth,scrollY,locationHidden:document.querySelector("#locationModal").hidden,homeHidden:document.querySelector("#homeView").hidden,catalogHidden:document.querySelector("#catalogView").hidden,active:document.activeElement?.outerHTML,body:document.body.innerText})');await writeFile(out+'/setup-failure-'+width+'.json',JSON.stringify({debug,lastClick:c.lastClick,errors:ctx.errors},null,2));await capture(ctx,'setup-failure-'+width);await c.close();live.delete(c);throw error;}
 assert.equal(ctx.calls.length,0,'Initial render must not generate events');return ctx;
}
const cases=[
 ...[320,480,1024].map(width=>[`Imagen completa a ${width}px`,async ctx=>{const g=await checkImage(ctx,2);assert.deepEqual(g.cards.map(x=>x.natural),[[480,120],[120,320]]);assert.equal(g.cards[1].src,'http://localhost:1337/uploads/qa-vertical.svg');return g;},{width}]),
 ...[['ausente',undefined,'Comida','🍽️'],['vacía',{url:''},'Cine','🎟️'],['no disponible',{url:'/uploads/broken.svg'},'Ropa','👕']].map(([state,value,category,icon])=>[`Fallback ${state}`,async ctx=>{await ctx.c.waitFor('document.querySelector(".offer-card__logo--generic")&&!document.querySelector(".offer-card__image")');const g=await geometry(ctx);assert.equal(g.cards.length,1);const a=g.cards[0];assert.equal(a.promo,false);assert.equal(a.icon,icon);assert.equal(a.iconHidden,false);assert.equal(a.buttonText,'Ver beneficio');assert.equal(a.title,'QA beneficio FALLBACK');assert.equal(a.tabIndex,0);assert.ok(inside(a.heading,a.card)&&inside(a.button,a.card));assert.equal(ctx.calls.length,0);return g;},{rows:[offer('FALLBACK',category,value===undefined?{}:{imagen_promo:value})],map:{[category]:3}}]),
 ['Abrir misma promoción con teclado Enter y Espacio',async ctx=>{
  await loaded(ctx,2);assert.equal(ctx.calls.length,0);await ctx.c.evaluate(`window.qaKeyboardEvents=[];for(const type of ['keydown','keypress','keyup','click'])document.addEventListener(type,event=>window.qaKeyboardEvents.push({type,key:event.key,code:event.code,keyCode:event.keyCode,isTrusted:event.isTrusted,tag:event.target.tagName,classes:event.target.className,text:event.target.textContent.slice(0,80)}),true);true`);const activations=[];
  for(const value of ['Enter',' ']){
   // Recorre controles con Tab real, sin invocar click() ni el manejador del botón.
   let focused=false;
   for(let n=0;n<25;n++){await key(ctx.c,'Tab');focused=await ctx.c.evaluate('document.activeElement===document.querySelectorAll(".offer-card__button")[1]');if(focused)break;}
   assert.ok(focused,'Second offer keyboard reachable');
   assert.equal(await ctx.c.evaluate('document.activeElement.textContent'),'Ver beneficio');
   await key(ctx.c,value);await ctx.c.waitFor('!document.querySelector("#detailView").hidden');
   assert.equal(await ctx.c.evaluate('document.querySelector("#detailTitle").textContent'),'QA beneficio VERTICAL-V4');
   await ctx.c.waitFor(`true`);for(let n=0;n<100&&queryEvents(ctx).length<activations.length*2+2;n++)await delay(20);
   activations.push(value===' '?'Space':value);
   assert.deepEqual(queryEvents(ctx).map(e=>e.type),activations.flatMap(()=>['offer-click','offer-view']));assert.ok(queryEvents(ctx).every(e=>e.properties.offer_id==='QA-VERTICAL-V4'));
   await capture(ctx,'07-detail-'+activations.at(-1));
   if(value==='Enter'){await click(ctx.c,'#backToCatalog');await loaded(ctx,2);}
  }return{activations,detailTitle:'QA beneficio VERTICAL-V4',consultationEvents:queryEvents(ctx)};
 }],
 ['Regresión recomendaciones con imágenes',async ctx=>{await loaded(ctx,3);assert.deepEqual(await titles(ctx),['QA beneficio CMX','QA beneficio JAL','QA beneficio NATIONAL']);await checkImage(ctx,3);assert.equal(ctx.calls.length,0);return{titles:await titles(ctx),thresholdExcludesRopa:true,noTrackingOnImageLoad:true};},{rows:[national,cmx,jal,ropa],map:{Comida:2,Cine:4,Ropa:1}}],
 ['Regresión región y categoría con imágenes',async ctx=>{await loaded(ctx,2);assert.deepEqual(await titles(ctx),['QA beneficio CMX','QA beneficio NATIONAL']);await checkImage(ctx,2);assert.equal(ctx.calls.length,0);await click(ctx.c,'#categoryFilters [data-category-key="cine"]');for(let n=0;n<100&&events(ctx).length===0;n++)await delay(20);assert.equal(events(ctx).length,1,'One received filter event');await loaded(ctx,1);assert.deepEqual(await titles(ctx),['QA beneficio CMX']);await checkImage(ctx,1);assert.equal(queryEvents(ctx).length,0);assert.ok(events(ctx).every(e=>e.type==='cine-seg'));return{region:'MX-CMX',nationalIncluded:true,jalExcluded:true,explicitCineImages:true,eventTypes:events(ctx).map(e=>e.type)};},{rows:[national,cmx,jal,ropa],map:{Comida:2,Cine:4,Ropa:1},region:true}]
];
try{
 for(const [name,test,options]of (process.argv.includes('--keyboard')?cases.slice(6,7):process.argv.includes('--diagnose')?cases.slice(1,2):cases)){const id=process.argv.includes('--keyboard')?'07':String(results.length+1).padStart(2,'0');let ctx;try{ctx=await setup(options);const observed=await test(ctx);assert.deepEqual(ctx.errors,[]);await capture(ctx,id);results.push({id,name,status:'PASS',observed,calls:ctx.calls,uncaughtErrors:ctx.errors,consoleErrors:ctx.consoleErrors,keyboardEvents:ctx.c.keyboardEvents,network:ctx.network});}catch(error){if(ctx)try{await capture(ctx,id+'-failure');}catch{}results.push({id,name,status:'FAIL',error:error.stack,calls:ctx?.calls,uncaughtErrors:ctx?.errors,consoleErrors:ctx?.consoleErrors,keyboardEvents:ctx?.c.keyboardEvents,network:ctx?.network});}finally{if(ctx){await ctx.c.close();live.delete(ctx.c);}}await writeFile(out+'/results.json',JSON.stringify({date:new Date().toISOString(),projectRoot,scope:'US-005 seven expanded Gherkin cases plus two focused regressions; synthetic external responses',results},null,2));console.log(JSON.stringify({id,name,status:results.at(-1).status,error:results.at(-1).error?.split('\n')[0]}));}
 const after=await hashes();await writeFile(out+'/source-hashes-after.json',JSON.stringify(after,null,2));assert.deepEqual(after,before,'Product sources unchanged');const failed=results.filter(r=>r.status==='FAIL').length;console.log(JSON.stringify({total:results.length,passed:results.length-failed,failed,sourceHashesUnchanged:true}));process.exitCode=failed?1:0;
}finally{for(const c of live)await c.close();await host.close();}
