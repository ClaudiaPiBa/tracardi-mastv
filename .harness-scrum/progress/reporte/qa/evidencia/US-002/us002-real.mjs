import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {browser,staticServer,intercept,qaRoot,delay} from './cdp.mjs';
import {offer} from './fixtures.mjs';

// Prepared real synthetic receipt probe. Run only in the authorized US002 QA phase.
// Strapi is fully stubbed; only synthetic POST/OPTIONS to the configured local collector are allowed.
const host=await staticServer();let c;const calls=[],receipts=[],errors=[],responses=new Map();
const isTrack=url=>{const u=new URL(url);return u.hostname==='localhost'&&u.port==='8686'&&u.pathname==='/track';};
async function click(s){const p=await c.evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(s)});e.scrollIntoView({behavior:'instant',block:'center'});const r=e.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2}})()`);for(const type of ['mousePressed','mouseReleased'])await c.send('Input.dispatchMouseEvent',{type,button:'left',clickCount:1,...p});}
async function until(fn,label){const end=Date.now()+15000;do{if(fn())return;await delay(40);}while(Date.now()<end);throw Error('Timeout '+label);}
try{
  c=await browser();c.on('Runtime.exceptionThrown',e=>errors.push(e.exceptionDetails.text));
  await intercept(c,p=>{
    const u=new URL(p.request.url);
    if(u.origin===host.origin&&p.request.method==='GET')return null;
    if(u.hostname==='localhost'&&u.port==='1337'&&u.pathname==='/api/offers')return{body:{data:[offer('REAL-QA-SYNTHETIC')]}};
    if(isTrack(u)&&['POST','OPTIONS'].includes(p.request.method))return null;
    return{error:'BlockedByClient'};
  });
  c.on('Network.requestWillBeSent',p=>{if(isTrack(p.request.url)&&p.request.method==='POST')calls.push(JSON.parse(p.request.postData));});
  c.on('Network.responseReceived',p=>{if(isTrack(p.response.url)&&p.type!=='Preflight')responses.set(p.requestId,{status:p.response.status,headers:p.response.headers});});
  c.on('Network.loadingFinished',async p=>{
    const response=responses.get(p.requestId);if(!response)return;
    try{
      const data=await c.send('Network.getResponseBody',{requestId:p.requestId});const body=JSON.parse(data.base64Encoded?Buffer.from(data.body,'base64').toString('utf8'):data.body);
      receipts.push({...response,body});
    }catch{receipts.push({...response,body:null});}
  });
  await c.send('Page.navigate',{url:host.origin+'/'});await c.waitFor('!!document.querySelector("#locationModal")&&!document.querySelector("#locationModal").hidden');await click('#declineLocation');await c.waitFor('document.querySelector("#offerList").getAttribute("aria-busy")==="false"');
  assert.equal(calls.length,0);
  await click('#categoryFilters [data-filter="Comida"]');await until(()=>receipts.length>=1,'first real receipt');
  await c.waitFor('!!JSON.parse(localStorage.getItem("mastv.visitor.v1"))?.profileId');
  await click('#offerList article button');await until(()=>receipts.length>=2,'second real receipt');
  assert.equal(calls.length,2);assert.equal(calls[0].source.id,'demo-source');assert.equal(calls[0].profile,null);
  const sameSession=calls[0].session.id===calls[1].session.id;
  const knownProfile=calls[1].profile?.id===receipts[0].body?.profile?.id;
  const accepted=receipts.map(r=>r.status===200&&typeof r.body?.task==='string'&&r.body.task.trim().length>0&&typeof r.body?.profile?.id==='string'&&r.body.profile.id.trim().length>0&&!r.body.error&&!r.body.response?.error&&!r.body.response?.errors?.length&&r.body.accepted!==false&&r.body.response?.success!==false);
  const result={date:new Date().toISOString(),scope:'Real collector receipt only; synthetic offers and fresh anonymous session; no administrative reads or workflow claims',origin:host.origin,collector:'http://localhost:8686/track',source:'demo-source',requests:calls.map(call=>({types:call.events.map(e=>e.type),syntheticOfferIds:call.events.map(e=>e.properties.offer_id).filter(Boolean),initialProfileNull:call.profile===null})),receipts:receipts.map((r,i)=>({httpStatus:r.status,acceptedSemantically:accepted[i],rootKeys:r.body?Object.keys(r.body):[],taskPresent:!!r.body?.task,profilePresent:!!r.body?.profile?.id,interestsType:typeof r.body?.profile?.interests,corsAllowOrigin:r.headers['Access-Control-Allow-Origin']||r.headers['access-control-allow-origin']||null})),sameSession,knownProfileReused:knownProfile,uncaughtErrors:errors};
  await writeFile(qaRoot+'/us002-real.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
  assert.ok(accepted.every(Boolean));assert.equal(sameSession,true);assert.equal(knownProfile,true);assert.deepEqual(errors,[]);
}finally{if(c)await c.close();await host.close();}
