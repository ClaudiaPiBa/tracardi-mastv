import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {browser,staticServer,intercept,qaRoot,delay} from './cdp.mjs';

// Prepared read-only integration probe. Do not run before En Review authorization.
// It stores schema/counts/status only; never response values, DOM, screenshots or profiles.
const host=await staticServer();let c;
const responses=[];const blocked=[];
const isOffers=url=>{const u=new URL(url);return u.hostname==='localhost'&&u.port==='1337'&&u.pathname==='/api/offers';};
try {
  c=await browser();
  await intercept(c,p=>{
    const u=new URL(p.request.url);
    if(u.origin===host.origin&&p.request.method==='GET')return null;
    if(isOffers(u)&&p.request.method==='GET')return null;
    blocked.push({origin:u.origin,path:u.pathname,method:p.request.method});
    return {error:'BlockedByClient'};
  });
  c.on('Network.responseReceived',p=>{if(isOffers(p.response.url))responses.push({requestId:p.requestId,status:p.response.status,headers:p.response.headers});});
  await c.send('Page.navigate',{url:host.origin+'/'});
  await c.waitFor('!!document.querySelector("#locationModal")&&!document.querySelector("#locationModal").hidden',10000);
  await c.waitFor('document.querySelector("#offerList")?.getAttribute("aria-busy")==="false"',30000);
  const summaries=[];
  for(const response of responses){
    const received=await c.send('Network.getResponseBody',{requestId:response.requestId});
    const payload=JSON.parse(received.base64Encoded?Buffer.from(received.body,'base64').toString('utf8'):received.body);
    const rows=Array.isArray(payload)?payload:payload?.data??payload?.ofertas;
    const fields={};
    if(Array.isArray(rows))for(const item of rows){
      const flat=item&&typeof item==='object'?{...item,...(item.attributes||{})}:{};
      for(const [key,value] of Object.entries(flat)){
        const type=value===null?'null':Array.isArray(value)?'array':typeof value;
        fields[key]=[...new Set([...(fields[key]||[]),type])];
      }
    }
    summaries.push({httpStatus:response.status,rootType:Array.isArray(payload)?'array':typeof payload,rootKeys:Array.isArray(payload)?[]:Object.keys(payload||{}),recordCount:Array.isArray(rows)?rows.length:null,recordFieldTypes:fields,corsAllowOrigin:response.headers['Access-Control-Allow-Origin']||response.headers['access-control-allow-origin']||null});
  }
  const ui=await c.evaluate('({loaded:document.querySelector("#offerList").getAttribute("aria-busy")==="false",error:!document.querySelector("#retryCatalog").hidden,normalizedOfferCount:document.querySelectorAll("#offerList article").length,warningVisible:!document.querySelector("#catalogWarning").hidden})');
  const result={scope:'READ ONLY real Strapi from browser; schema/counts only; no actual offer values or profile data',date:new Date().toISOString(),origin:host.origin,endpoint:'http://localhost:1337/api/offers',responses:summaries,ui,blockedExternalRequests:blocked};
  await writeFile(qaRoot+'/us001-real-read.json',JSON.stringify(result,null,2));
  console.log(JSON.stringify(result,null,2));
  assert.ok(summaries.length>0,'No real offer responses observed');
  assert.ok(summaries.every(r=>r.httpStatus===200),'Real offer HTTP error');
  assert.equal(ui.error,false,'Application reported real catalog load error');
}finally{if(c)await c.close();await host.close();}
