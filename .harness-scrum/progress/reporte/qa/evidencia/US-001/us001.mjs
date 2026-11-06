import assert from 'node:assert/strict';
import {writeFile,mkdir,readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {browser,staticServer,controlledNetwork,qaRoot,projectRoot,delay} from './cdp.mjs';
import {offer,strapiPage,noCoupon,missingIdentity} from './fixtures.mjs';

// Prepared runner. Run only after the coordinator confirms implementation report + En Review.
const output=qaRoot+'/us001-evidence';
await mkdir(output,{recursive:true});
const host=await staticServer();
const results=[];
const endpoint=url=>{const u=new URL(url);return u.hostname==='localhost'&&u.port==='1337'&&u.pathname==='/api/offers';};
const text=(c,selector)=>c.evaluate(`document.querySelector(${JSON.stringify(selector)})?.textContent.trim()`);
const isVisible=(c,selector)=>c.evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});return !!e&&!e.closest('[hidden]')&&!!e.getClientRects().length})()`);
async function click(c,selector) {
  const p=await c.evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});if(!e||e.closest('[hidden]'))throw Error('Control absent or hidden: '+${JSON.stringify(selector)});e.scrollIntoView({block:'center'});const r=e.getBoundingClientRect();if(!r.width||!r.height)throw Error('Control has no rectangle');return {x:r.left+r.width/2,y:r.top+r.height/2}})()`);
  await c.send('Input.dispatchMouseEvent',{type:'mousePressed',button:'left',clickCount:1,...p});
  await c.send('Input.dispatchMouseEvent',{type:'mouseReleased',button:'left',clickCount:1,...p});
}
async function key(c,key,code=key,modifiers=0) {
  await c.send('Input.dispatchKeyEvent',{type:'keyDown',key,code,modifiers});
  await c.send('Input.dispatchKeyEvent',{type:'keyUp',key,code,modifiers});
}
async function ready(c) {await c.waitFor('document.querySelector("#offerList")?.getAttribute("aria-busy")==="false"');}
async function category(c,name='Comida') {await click(c,`#categoryFilters button[data-filter="${name}"]`);}
async function titles(c) {return c.evaluate('[...document.querySelectorAll("#offerList h3")].map(e=>e.textContent)');}
async function detail(c,index=0) {await click(c,`#offerList article:nth-child(${index+1}) button`);await c.waitFor('!document.querySelector("#detailView").hidden');}
async function screenshot(c,file) {const r=await c.send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});await writeFile(file,Buffer.from(r.data,'base64'));}
const fixture=offer('CATALOGO');
const cases=[
  ['Consultar la categoría con datos remotos',async ({c})=>{
    await ready(c);await category(c);
    assert.deepEqual(await titles(c),[fixture.titulo]);
    const card=await text(c,'#offerList article');
    for(const value of [fixture.titulo,fixture.establecimiento,fixture.descripcion,`${fixture.descuento_porcentaje}% de descuento`])assert.ok(card.includes(value),value);
    assert.equal(await c.evaluate('document.querySelectorAll("#offerList article").length'),1);
    assert.deepEqual(await c.evaluate('[...document.querySelectorAll("#categoryFilters button")].map(e=>e.textContent)'),['Todos','Comida']);
    return {cards:1,source:'single synthetic published offer; original embedded offers absent'};
  }],
  ['Reconocer una carga de catálogo en curso',async ({c,release})=>{
    assert.equal(await text(c,'#catalogStatus'),'Cargando ofertas…');
    assert.equal(await c.evaluate('document.querySelector("#offerList").getAttribute("aria-busy")'),'true');
    assert.equal(await isVisible(c,'#emptyState'),false);assert.deepEqual(await titles(c),[]);
    release();await ready(c);return {loadingStatus:'Cargando ofertas…',emptyStateDuringWait:false};
  },{delayed:true}],
  ['Consultar todas las páginas publicadas',async ({c,requests})=>{
    await ready(c);await category(c);
    const actual=await titles(c);
    const expected=Array.from({length:101},(_,i)=>`QA beneficio PAGE-${String(i+1).padStart(3,'0')}`);
    assert.deepEqual(actual,expected);
    const apiRequests=requests.filter(r=>endpoint(r.url));
    assert.deepEqual(apiRequests.map(r=>new URL(r.url).searchParams.get('pagination[page]')),['1','2']);
    assert.equal(new URL(apiRequests[0].url).searchParams.get('pagination[pageSize]'),'100');
    return {cards:actual.length,pages:[1,2],initialPageSize:100};
  },{paged:true}],
  ['Abrir un detalle coherente con la tarjeta',async ({c})=>{
    await ready(c);await category(c);await detail(c,1);
    const selected=offer('DETALLE-2');
    for(const [selector,value] of [['#detailTitle',selected.titulo],['#detailSubtitle',selected.establecimiento],['#detailDescription',selected.descripcion],['#promoCode',selected.codigo_cupon],['#detailDiscount','15% de descuento']])assert.equal(await text(c,selector),value);
    const conditions=await text(c,'#detailConditions');
    for(const value of ['Comida','200 MXN','170 MXN','2030-12-31','descuento'])assert.ok(conditions.includes(value),value);
    await click(c,'#redeemButton');assert.equal(await isVisible(c,'#confirmModal'),true);
    assert.equal(await text(c,'#confirmOfferName'),selected.titulo);assert.equal(await text(c,'#confirmOfferDescription'),selected.descripcion);
    // Required existing keyboard/dialog behavior: Tab stays in dialog, Escape cancels.
    await key(c,'Tab');assert.equal(await c.evaluate('document.activeElement.id'),'closeConfirm');
    await key(c,'Tab','Tab',8);assert.equal(await c.evaluate('document.activeElement.id'),'cancelRedeem');
    await key(c,'Escape');assert.equal(await isVisible(c,'#confirmModal'),false);
    assert.equal(await c.evaluate('document.activeElement.id'),'redeemButton');
    await click(c,'#backToCatalog');assert.equal(await isVisible(c,'#catalogView'),true);
    return {selected:'QA-DETALLE-2',conditions:'published synthetic economics/currency/expiry/type',confirmationMatches:true,keyboard:'Tab / Shift+Tab / Escape / focus restoration'};
  },{detail:true}],
  ['Copiar el cupón publicado',async ({c})=>{
    await ready(c);await category(c);await detail(c);
    await c.send('Browser.grantPermissions',{origin:host.origin,permissions:['clipboardReadWrite','clipboardSanitizedWrite']});
    await c.send('Page.bringToFront');await click(c,'#copyCode');
    await c.waitFor('document.querySelector("#copyFeedback").textContent.includes("Código copiado")');
    assert.equal(await c.evaluate('navigator.clipboard.readText()'),fixture.codigo_cupon);
    return {clipboard:fixture.codigo_cupon,feedback:await text(c,'#copyFeedback')};
  }],
  ['Reconocer un catálogo publicado sin ofertas',async ({c})=>{
    await ready(c);assert.deepEqual(await titles(c),[]);
    assert.equal(await isVisible(c,'#emptyState'),true);assert.equal(await text(c,'#emptyState'),'No hay promociones disponibles.');
    assert.equal(await isVisible(c,'#retryCatalog'),false);assert.equal(await isVisible(c,'#catalogWarning'),false);
    return {state:'No hay promociones disponibles.'};
  },{empty:true}],
  ['Recuperar una carga fallida',async ({c,requests})=>{
    await ready(c);assert.deepEqual(await titles(c),[]);
    assert.equal(await text(c,'#catalogStatus'),'No se pudieron cargar las ofertas. Vuelve a intentarlo.');
    assert.equal(await isVisible(c,'#retryCatalog'),true);assert.equal(await isVisible(c,'#emptyState'),false);
    assert.equal(requests.filter(r=>endpoint(r.url)).length,2);
    return {failedPage:2,partialCards:0,retryVisible:true};
  },{partialFailure:true}],
  ['Volver a intentar la carga',async ({c,requests})=>{
    await ready(c);assert.equal(await isVisible(c,'#retryCatalog'),true);
    await click(c,'#retryCatalog');await ready(c);await category(c);
    assert.deepEqual(await titles(c),[fixture.titulo]);assert.equal(requests.filter(r=>endpoint(r.url)).length,2);
    assert.equal(await isVisible(c,'#retryCatalog'),false);
    return {attempts:requests.filter(r=>endpoint(r.url)).length,recoveredCards:1};
  },{retry:true}],
  ['Separar ofertas incompletas de ofertas utilizables',async ({c})=>{
    await ready(c);await category(c);assert.deepEqual(await titles(c),[fixture.titulo]);
    assert.equal(await isVisible(c,'#catalogWarning'),true);
    assert.match(await text(c,'#catalogWarning'),/Algunas ofertas no están disponibles/);
    assert.equal(await c.evaluate('document.querySelectorAll("#offerList button").length'),1);
    await detail(c);assert.equal(await text(c,'#detailTitle'),fixture.titulo);
    return {validCards:1,omittedCards:1,warningVisible:true};
  },{incomplete:true}],
  ['Consultar una oferta sin cupón',async ({c})=>{
    await ready(c);await category(c);await detail(c);
    assert.equal(await text(c,'#promoCode'),'Cupón no disponible');
    assert.equal(await c.evaluate('document.querySelector("#copyCode").disabled&&document.querySelector("#redeemButton").disabled'),true);
    await c.send('Browser.grantPermissions',{origin:host.origin,permissions:['clipboardReadWrite','clipboardSanitizedWrite']});await c.send('Page.bringToFront');
    await c.evaluate('navigator.clipboard.writeText("QA-SENTINEL")');
    await click(c,'#copyCode');await click(c,'#redeemButton');
    assert.equal(await c.evaluate('navigator.clipboard.readText()'),'QA-SENTINEL');assert.equal(await isVisible(c,'#confirmModal'),false);
    return {coupon:'unavailable',copyDisabled:true,redeemDisabled:true,clipboardUnchanged:true};
  },{noCoupon:true}],
  ['Acceder al catálogo desde Inicio',async ({c})=>{
    await ready(c);
    for(let index=1;index<=3;index++){
      await click(c,'a[data-go="home"]');assert.equal(await isVisible(c,'#homeView'),true);
      await click(c,`.featured-card:nth-child(${index}) button`);
      assert.equal(await isVisible(c,'#catalogView'),true);assert.equal(await isVisible(c,'#detailView'),false);
      await category(c);assert.deepEqual(await titles(c),[fixture.titulo]);
    }
    return {featuredAccesses:3,fixedOfferDetailOpened:false};
  }]
];

try {
  for(const [name,test,options={}] of cases){
    let c;let release=()=>{};
    const errors=[],consoleErrors=[];const started=new Date().toISOString();
    const id=String(results.length+1).padStart(2,'0');
    try {
      c=await browser();
      await c.send('Emulation.setDeviceMetricsOverride',{width:430,height:932,deviceScaleFactor:1,mobile:true});
      c.on('Runtime.exceptionThrown',e=>errors.push(e.exceptionDetails.exception?.description||e.exceptionDetails.text));
      c.on('Runtime.consoleAPICalled',e=>{if(e.type==='error')consoleErrors.push(e.args.map(a=>a.value||a.description).join(' '));});
      let attempt=0;let unblock;
      const pending=new Promise(resolve=>{unblock=resolve;});release=unblock;
      const requests=await controlledNetwork(c,host.origin,async p=>{
        if(!endpoint(p.request.url))return null;
        assert.equal(p.request.method,'GET');attempt++;
        const page=Number(new URL(p.request.url).searchParams.get('pagination[page]'));
        if(options.partialFailure&&page===2)return {status:503,body:{error:'QA unavailable'}};
        if(options.retry&&attempt===1)return {error:'ConnectionFailed'};
        if(options.paged){const start=page===1?0:100,length=page===1?100:1;return {body:strapiPage(Array.from({length},(_,i)=>offer(`PAGE-${String(start+i+1).padStart(3,'0')}`)),page,2)};}
        if(options.partialFailure)return {body:strapiPage([offer('PARTIAL-MUST-NOT-SHOW')],1,2)};
        const rows=options.empty?[]:options.incomplete?[missingIdentity,fixture]:options.noCoupon?[noCoupon]:options.detail?[offer('DETALLE-1'),offer('DETALLE-2')]:[fixture];
        return {body:strapiPage(rows),...(options.delayed?{wait:pending}:{})};
      });
      await c.send('Page.navigate',{url:host.origin+'/'});
      await c.waitFor('!!document.querySelector("#declineLocation")&&!document.querySelector("#locationModal").hidden');
      await click(c,'#declineLocation');
      const observed=await test({c,requests,release});
      assert.deepEqual(errors,[],'Unexpected uncaught errors');
      await screenshot(c,`${output}/${id}.png`);
      results.push({id,name,status:'PASS',started,observed,requests,uncaughtErrors:errors,consoleErrors,screenshot:`${id}.png`});
    }catch(error){
      if(c)try{await screenshot(c,`${output}/${id}-failure.png`);}catch{}
      results.push({id,name,status:'FAIL',started,error:error.stack,uncaughtErrors:errors,consoleErrors,screenshot:`${id}-failure.png`});
    }finally{release();if(c)await c.close();}
    await writeFile(output+'/results.json',JSON.stringify({scope:'US-001 controlled browser functional scenarios',date:new Date().toISOString(),results},null,2));
    console.log(JSON.stringify({id,name,status:results.at(-1).status,error:results.at(-1).error?.split('\n')[0]}));
  }
  const hashes={};for(const file of ['index.html','css/styles.css','js/app.js','js/catalog.js','js/config.js'])hashes[file]=createHash('sha256').update(await readFile(projectRoot+'/'+file)).digest('hex');
  await writeFile(output+'/source-hashes.json',JSON.stringify(hashes,null,2));
  const failures=results.filter(r=>r.status==='FAIL').length;
  console.log(JSON.stringify({total:results.length,passed:results.length-failures,failed:failures,output}));
  process.exitCode=failures?1:0;
}finally{await host.close();}
