import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {browser,staticServer,controlledNetwork,qaRoot,delay} from './cdp.mjs';
import {offer,strapiAttributes,missingIdentity,malformedEconomics} from './fixtures.mjs';
const host=await staticServer();const results=[];
const out=qaRoot+'/us001-evidence';
async function click(c,s){const p=await c.evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(s)});if(!e||e.closest('[hidden]'))throw Error('Missing visible control');e.scrollIntoView({block:'center',behavior:'instant'});const r=e.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()`);for(const type of ['mousePressed','mouseReleased'])await c.send('Input.dispatchMouseEvent',{type,button:'left',clickCount:1,...p});}
const text=(c,s)=>c.evaluate(`document.querySelector(${JSON.stringify(s)}).textContent.trim()`);
async function shot(c,n){const r=await c.send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});await writeFile(`${out}/${n}.png`,Buffer.from(r.data,'base64'));}
const tests=[
  ['lista raíz', [offer('ROOT')],async c=>assert.equal(await text(c,'#offerList h3'),'QA beneficio ROOT')],
  ['contenedor ofertas', {ofertas:[offer('OFERTAS')]},async c=>assert.equal(await text(c,'#offerList h3'),'QA beneficio OFERTAS')],
  ['attributes y contenido tratado como texto',strapiAttributes([offer('SAFE',' Comida ',{titulo:'QA <img src=x onerror="window.qaInjected=true">',descripcion:'QA texto <script>window.qaInjected=true</script>'}),offer('CASE','comida')]),async c=>{
    assert.deepEqual(await c.evaluate('[...document.querySelectorAll("#categoryFilters button")].map(e=>e.textContent)'),['Todos','Comida']);
    assert.equal(await c.evaluate('document.querySelectorAll("#offerList article").length'),2);
    assert.equal(await c.evaluate('window.qaInjected === true'),false);
    assert.equal(await c.evaluate('document.querySelectorAll("#offerList img,#offerList script").length'),0);
    await click(c,'#offerList article button');assert.ok((await text(c,'#detailTitle')).includes('<img'));
  }],
  ['todos los registros omitidos', {data:[missingIdentity,{id:'QA-NO-TITLE',categoria:'Comida'},{id:'QA-NO-CATEGORY',titulo:'QA sin categoría'}]},async c=>{
    assert.equal(await c.evaluate('document.querySelectorAll("#offerList article").length'),0);
    assert.equal(await c.evaluate('document.querySelector("#catalogWarning").hidden'),false);
    assert.equal(await text(c,'#emptyState'),'No hay promociones utilizables disponibles.');
  }],
  ['opcionales inválidos sin valores inventados', {data:[{...malformedEconomics,establecimiento:null,descripcion:null}]},async c=>{
    assert.ok((await text(c,'#offerList')).includes('Comercio no disponible'));
    assert.ok((await text(c,'#offerList')).includes('Descripción no disponible'));
    assert.equal(await c.evaluate('document.querySelectorAll(".tag--discount,.offer-card__discount").length'),0);
    await click(c,'#offerList article button');
    assert.deepEqual(await c.evaluate('[...document.querySelectorAll("#detailConditions dt")].map(e=>e.textContent)'),['Categoría','Tipo de oferta']);
    assert.equal(await c.evaluate('document.querySelector("#detailDiscountSection").hidden'),true);
  }],
  ['navegación y tamaños 320/430/1024', {data:[offer('RESPONSIVE')]},async c=>{
    for(const [width,height] of [[320,568],[430,932],[1024,768]]){
      await c.send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width<600});
      await click(c,'#menuToggle');assert.equal(await c.evaluate('document.querySelector("#menuToggle").getAttribute("aria-expanded")'),'true');
      await click(c,'#siteMenu [data-go="home"]');assert.equal(await c.evaluate('document.querySelector("#homeView").hidden'),false);
      await click(c,'.hero-home [data-go="catalog"]');
      assert.equal(await c.evaluate('document.documentElement.scrollWidth<=innerWidth'),true);
      await click(c,'#offerList article button');assert.equal(await c.evaluate('document.documentElement.scrollWidth<=innerWidth'),true);
      await shot(c,`responsive-detail-${width}`);
      await click(c,'#redeemButton');
      assert.equal(await c.evaluate('document.querySelector("#confirmModal").hidden'),false);
      assert.equal(await c.evaluate('(()=>{const r=document.querySelector("#confirmRedeem").getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight})()'),true);
      await click(c,'#cancelRedeem');assert.equal(await c.evaluate('document.querySelector("#confirmModal").hidden'),true);
      await click(c,'#redeemButton');await click(c,'#closeConfirm');assert.equal(await c.evaluate('document.querySelector("#confirmModal").hidden'),true);
      await click(c,'#redeemButton');await click(c,'#confirmRedeem');assert.equal(await c.evaluate('document.querySelector("#successModal").hidden'),false);
      assert.ok((await text(c,'#successModal')).includes('en este dispositivo'));
      await click(c,'#successDone');assert.equal(await c.evaluate('document.querySelector("#catalogView").hidden'),false);
    }
  }],
  ['texto remoto extenso en móvil', {data:[offer('LONG','Comida',{titulo:'QA título '.repeat(20),descripcion:'QA descripción extensa '.repeat(20),codigo_cupon:'QA-CUPON-LARGO-'.repeat(10)})]},async c=>{
    await c.send('Emulation.setDeviceMetricsOverride',{width:320,height:568,deviceScaleFactor:1,mobile:true});
    assert.equal(await c.evaluate('document.documentElement.scrollWidth<=innerWidth'),true);
    await click(c,'#offerList article button');assert.equal(await c.evaluate('document.documentElement.scrollWidth<=innerWidth'),true);
    await shot(c,'long-detail-320');
    await click(c,'#redeemButton');await shot(c,'long-confirm-320');
    const bounds=await c.evaluate('(()=>{const r=document.querySelector("#confirmRedeem").getBoundingClientRect();return {top:r.top,bottom:r.bottom,viewport:innerHeight,documentHeight:document.documentElement.scrollHeight,bodyOverflow:getComputedStyle(document.body).overflow}})()');
    await c.send('Input.dispatchMouseEvent',{type:'mouseWheel',x:160,y:284,deltaX:0,deltaY:600});await delay(150);
    const afterWheel=await c.evaluate('(()=>{const r=document.querySelector("#confirmRedeem").getBoundingClientRect();return {top:r.top,bottom:r.bottom,dialogScrollTop:document.querySelector("#confirmModal .dialog").scrollTop}})()');
    await writeFile(out+'/long-confirm-bounds.json',JSON.stringify({viewport:{width:320,height:568},beforeWheel:bounds,afterWheel},null,2));
    assert.equal(bounds.top>=0&&bounds.bottom<=bounds.viewport,true,'Confirmation action reachable with long remote content: '+JSON.stringify(bounds));
  }]
];
try {
  for(const [name,payload,check] of tests.filter(t=>!process.argv.includes('--only-long')||t[0]==='texto remoto extenso en móvil')){let c;const errors=[];try{
    c=await browser();await c.send('Emulation.setDeviceMetricsOverride',{width:430,height:932,deviceScaleFactor:1,mobile:true});
    c.on('Runtime.exceptionThrown',e=>errors.push(e.exceptionDetails.text));
    await controlledNetwork(c,host.origin,p=>new URL(p.request.url).pathname==='/api/offers'?{body:payload}:null);
    await c.send('Page.navigate',{url:host.origin+'/'});await c.waitFor('!!document.querySelector("#locationModal")&&!document.querySelector("#locationModal").hidden');
    await click(c,'#declineLocation');await c.waitFor('document.querySelector("#offerList").getAttribute("aria-busy")==="false"');
    if(await c.evaluate('!!document.querySelector("#categoryFilters [data-category-key="+JSON.stringify("comida")+"]")'))await click(c,'#categoryFilters [data-category-key="comida"]');
    await check(c);assert.deepEqual(errors,[]);results.push({name,status:'PASS'});
  }catch(error){results.push({name,status:'FAIL',error:error.stack,uncaughtErrors:errors});}finally{if(c)await c.close();}
  console.log(JSON.stringify(results.at(-1)));}
  await writeFile(out+(process.argv.includes('--only-long')?'/long-content-reproduction.json':'/regression.json'),JSON.stringify({date:new Date().toISOString(),results},null,2));
  process.exitCode=results.some(r=>r.status==='FAIL')?1:0;
}finally{await host.close();}
