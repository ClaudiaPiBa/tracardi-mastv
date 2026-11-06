import assert from 'node:assert/strict';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {browser,staticServer,controlledNetwork,qaRoot,projectRoot,delay} from './cdp.mjs';
import {offer} from './fixtures.mjs';

// Prepared focal runner: execute only after the coordinator puts corrected US-001 En Review.
const output=qaRoot+'/us001-r2-evidence';await mkdir(output,{recursive:true});
const host=await staticServer();const results=[];
const normal=offer('RESPONSIVE');
const long=offer('LONG','Comida',{titulo:'QA título '.repeat(20),descripcion:'QA descripción extensa '.repeat(20),codigo_cupon:'QA-CUPON-LARGO-'.repeat(10)});
async function click(c,selector){const p=await c.evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});if(!e||e.closest('[hidden]'))throw Error('Missing visible control '+${JSON.stringify(selector)});e.scrollIntoView({block:'center',behavior:'instant'});const r=e.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()`);for(const type of ['mousePressed','mouseReleased'])await c.send('Input.dispatchMouseEvent',{type,button:'left',clickCount:1,...p});}
async function rawClick(c,selector){const p=await c.evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});const r=e.getBoundingClientRect();const d=e.closest('.dialog')?.getBoundingClientRect();if(r.top<0||r.bottom>innerHeight||d&&(r.top<d.top||r.bottom>d.bottom))throw Error('Control not reached by user scroll');return {x:r.x+r.width/2,y:r.y+r.height/2}})()`);for(const type of ['mousePressed','mouseReleased'])await c.send('Input.dispatchMouseEvent',{type,button:'left',clickCount:1,...p});}
async function key(c,key,modifiers=0){for(const type of ['keyDown','keyUp'])await c.send('Input.dispatchKeyEvent',{type,key,code:key,modifiers,...(key==='Enter'?{windowsVirtualKeyCode:13,nativeVirtualKeyCode:13,...(type==='keyDown'?{text:'\r',unmodifiedText:'\r'}:{})}:{})});await delay(30);}
const visible=(c,s)=>c.evaluate(`!document.querySelector(${JSON.stringify(s)}).closest('[hidden]')`);
async function rect(c,s){return c.evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(s)}),r=e.getBoundingClientRect();return {top:r.top,bottom:r.bottom,height:r.height,viewport:innerHeight,scrollTop:e.scrollTop,scrollHeight:e.scrollHeight,clientHeight:e.clientHeight,overflowY:getComputedStyle(e).overflowY}})()`);}
async function bounded(c,s){const r=await rect(c,s);assert.ok(r.top>=0&&r.bottom<=r.viewport,JSON.stringify(r));return r;}
async function wheel(c,selector,deltaY){const p=await c.evaluate(`(()=>{const r=document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect();return {x:r.x+r.width/2,y:Math.min(innerHeight-10,Math.max(10,r.y+r.height/2))}})()`);await c.send('Input.dispatchMouseEvent',{type:'mouseWheel',deltaX:0,deltaY,...p});await delay(160);}
async function reached(c,selector){return c.evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(selector)}),r=e.getBoundingClientRect(),d=e.closest('.dialog').getBoundingClientRect();return r.top>=Math.max(0,d.top)&&r.bottom<=Math.min(innerHeight,d.bottom)})()`);}
async function wheelTo(c,selector,direction){for(let n=0;n<15;n++){if(await reached(c,selector))return;await wheel(c,'#confirmModal .dialog',direction*250);}throw Error('Wheel cannot reach '+selector);}
async function shot(c,name){const r=await c.send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});await writeFile(output+'/'+name+'.png',Buffer.from(r.data,'base64'));}
async function begin(c,payload,width,height){
  await c.send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width<600});
  if(!c.qaRouting)c.qaRouting=await controlledNetwork(c,host.origin,p=>new URL(p.request.url).pathname==='/api/offers'?{body:{data:[payload]}}:null);
  await c.send('Page.navigate',{url:host.origin+'/'});await c.waitFor('!!document.querySelector("#locationModal")&&!document.querySelector("#locationModal").hidden');
  return c.qaRouting;
}
async function catalog(c){await click(c,'#declineLocation');await c.waitFor('document.querySelector("#offerList").getAttribute("aria-busy")==="false"');await click(c,'#categoryFilters [data-category-key="comida"]');await click(c,'#offerList article button');}

const tests=[
  ['LONG320: bounded dialog, actual wheel, cancel and close',async c=>{
    await begin(c,long,320,568);await catalog(c);await click(c,'#redeemButton');
    const initial=await bounded(c,'#confirmModal .dialog');assert.ok(initial.scrollHeight>initial.clientHeight);
    assert.equal(await c.evaluate('document.querySelector("#confirmOfferName").textContent'),long.titulo.trim());
    assert.equal(await c.evaluate('document.querySelector("#confirmOfferDescription").textContent'),long.descripcion.trim());
    await shot(c,'long-top-320');
    await wheelTo(c,'#cancelRedeem',1);
    const afterWheel=await rect(c,'#confirmModal .dialog');assert.ok(afterWheel.scrollTop>initial.scrollTop,'Actual wheel scroll must move dialog');
    await shot(c,'long-actions-320');await rawClick(c,'#cancelRedeem');assert.equal(await visible(c,'#confirmModal'),false);
    assert.equal(await c.evaluate('document.activeElement.id'),'redeemButton');
    await click(c,'#redeemButton');await wheelTo(c,'#closeConfirm',-1);await rawClick(c,'#closeConfirm');assert.equal(await visible(c,'#confirmModal'),false);
    return {initial,afterWheel,cancelByPointer:true,closeByPointer:true,contentComplete:true};
  }],
  ['LONG320: Tab reaches close/confirm/cancel, Enter confirms, Escape restores focus',async c=>{
    await begin(c,long,320,568);await catalog(c);await click(c,'#redeemButton');
    const focus=[];
    for(const id of ['closeConfirm','confirmRedeem','cancelRedeem']){
      await key(c,'Tab');assert.equal(await c.evaluate('document.activeElement.id'),id);assert.equal(await reached(c,'#'+id),true,'Focused control visible');focus.push({id,bounds:await rect(c,'#'+id)});
    }
    await key(c,'Tab',8);assert.equal(await c.evaluate('document.activeElement.id'),'confirmRedeem');assert.equal(await reached(c,'#confirmRedeem'),true);
    await key(c,'Enter');assert.equal(await visible(c,'#successModal'),true);await bounded(c,'#successModal .dialog');await shot(c,'long-confirmed-320');
    await key(c,'Escape');assert.equal(await visible(c,'#successModal'),false);assert.equal(await visible(c,'#catalogView'),true);
    await click(c,'#offerList article button');await click(c,'#redeemButton');await key(c,'Escape');assert.equal(await visible(c,'#confirmModal'),false);assert.equal(await c.evaluate('document.activeElement.id'),'redeemButton');
    return {focus,confirmedByEnter:true,escapeConfirmation:true,focusRestored:true};
  }],
  ['Normal dialogs320/430/1024: location, confirm, success and keyboard',async c=>{
    const sizes=[];
    for(const [width,height] of [[320,568],[430,932],[1024,768]]){
      await begin(c,normal,width,height);
      const location=await bounded(c,'#locationModal .dialog');await key(c,'Tab');assert.equal(await c.evaluate('document.activeElement.id'),'closeLocation');
      await key(c,'Tab',8);assert.equal(await c.evaluate('document.activeElement.id'),'declineLocation');
      await key(c,'Escape');assert.equal(await visible(c,'#locationModal'),false);assert.equal(await visible(c,'#catalogView'),true);
      await c.waitFor('document.querySelector("#offerList").getAttribute("aria-busy")==="false"');await click(c,'#categoryFilters [data-category-key="comida"]');await click(c,'#offerList article button');
      await click(c,'#redeemButton');const confirmation=await bounded(c,'#confirmModal .dialog');
      await key(c,'Escape');assert.equal(await c.evaluate('document.activeElement.id'),'redeemButton');
      await click(c,'#redeemButton');await click(c,'#confirmRedeem');const success=await bounded(c,'#successModal .dialog');
      await click(c,'#successDone');assert.equal(await visible(c,'#catalogView'),true);await shot(c,'normal-catalog-'+width);sizes.push({width,height,location,confirmation,success});
    }
    return {sizes};
  }]
];

try{
  for(const [name,test] of tests){let c;const errors=[];try{c=await browser();c.on('Runtime.exceptionThrown',e=>errors.push(e.exceptionDetails.text));const observed=await test(c);assert.deepEqual(errors,[]);results.push({name,status:'PASS',observed,uncaughtErrors:errors});}catch(error){results.push({name,status:'FAIL',error:error.stack,uncaughtErrors:errors});if(c)try{await shot(c,'failure-'+results.length);}catch{}}finally{if(c)await c.close();}console.log(JSON.stringify({name,status:results.at(-1).status,error:results.at(-1).error}));}
  const sourceHashes={};for(const file of ['index.html','css/styles.css','js/app.js','js/catalog.js','js/config.js'])sourceHashes[file]=createHash('sha256').update(await readFile(projectRoot+'/'+file)).digest('hex');
  const baseline=JSON.parse(await readFile(qaRoot+'/us001-evidence/source-hashes.json','utf8'));
  const delta=Object.keys(sourceHashes).filter(f=>sourceHashes[f]!==baseline[f]);
  await writeFile(output+'/results.json',JSON.stringify({date:new Date().toISOString(),scope:'US001 revision2 focal CSS correction; base evidence reused',results,sourceHashes,changedSinceBase:delta},null,2));
  process.exitCode=results.some(r=>r.status==='FAIL')?1:0;
}finally{await host.close();}
