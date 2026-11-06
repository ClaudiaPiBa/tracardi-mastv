import {spawn} from 'node:child_process';
import {readFile, mkdir, writeFile} from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

export const qaRoot = path.dirname(fileURLToPath(import.meta.url));
export const projectRoot = '/home/swumplurd/Documentos/devsarrollo/repos/tracardi-mastv';
export const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

export async function staticServer({root=projectRoot, probe}={}) {
  const server = http.createServer(async (req, res) => {
    try {
      if (req.url === '/__qa_probe.html' && probe) {
        res.writeHead(200, {'Content-Type':'text/html; charset=utf-8'}); res.end(probe); return;
      }
      const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
      const file = path.resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
      if (!file.startsWith(root + path.sep)) {res.writeHead(403); res.end(); return;}
      const mime = {'.html':'text/html', '.js':'application/javascript', '.css':'text/css', '.svg':'image/svg+xml', '.json':'application/json'};
      const data = await readFile(file);
      res.writeHead(200, {'Content-Type':mime[path.extname(file)] || 'application/octet-stream', 'Cache-Control':'no-store'}); res.end(data);
    } catch {res.writeHead(404); res.end('Not found');}
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  return {server, origin:`http://127.0.0.1:${server.address().port}`, close:() => new Promise(resolve => server.close(resolve))};
}

export async function browser() {
  const profile = path.join(qaRoot, `chrome-${Date.now()}-${process.pid}`);
  await mkdir(profile, {recursive:true});
  const chrome = spawn('/usr/bin/google-chrome', ['--headless=new', '--no-first-run', '--no-default-browser-check', '--disable-background-networking', '--disable-sync', '--disable-component-update', '--remote-debugging-port=0', '--remote-debugging-address=127.0.0.1', `--user-data-dir=${profile}`, 'about:blank'], {stdio:['ignore','ignore','pipe']});
  let stderr = ''; chrome.stderr.on('data', data => {stderr += data;});
  let port;
  for (let i=0; i<100; i++) {
    if(chrome.exitCode !== null) throw new Error(`Chrome exited ${chrome.exitCode}: ${stderr}`);
    try {port = (await readFile(path.join(profile,'DevToolsActivePort'),'utf8')).split('\n')[0]; break;} catch {await delay(100);}
  }
  if(!port) {chrome.kill(); throw new Error('DevToolsActivePort unavailable: ' + stderr);}
  const target = await (await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, {method:'PUT'})).json();
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve,reject) => {ws.addEventListener('open',resolve,{once:true});ws.addEventListener('error',reject,{once:true});});
  let serial = 0;
  const pending = new Map(), listeners = new Map();
  ws.addEventListener('message', ({data}) => {
    const message = JSON.parse(data);
    if(message.id) {const item=pending.get(message.id); if(item) {clearTimeout(item.timeout);pending.delete(message.id); message.error ? item.reject(new Error(JSON.stringify(message.error))) : item.resolve(message.result);}}
    else for(const fn of listeners.get(message.method)||[]) Promise.resolve(fn(message.params)).catch(error => {stderr += '\nCDP listener: ' + error.message;});
  });
  const send = (method,params={}) => new Promise((resolve,reject) => {
    const id = ++serial;
    const timeout = setTimeout(() => {pending.delete(id);reject(new Error(`CDP timeout ${method}`));},15000);
    pending.set(id,{resolve,reject,timeout});ws.send(JSON.stringify({id,method,params}));
  });
  const on = (event,fn) => {listeners.set(event,[...(listeners.get(event)||[]),fn]);};
  const evaluate = async expression => {
    const result = await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true,userGesture:true});
    if(result.exceptionDetails) throw new Error(result.exceptionDetails.text + ': ' + result.exceptionDetails.exception?.description);
    return result.result.value;
  };
  const waitFor = async (expression, timeout=8000) => {
    const end=Date.now()+timeout;
    do {if(await evaluate(expression)) return; await delay(50);} while(Date.now()<end);
    throw new Error('Condition timeout: ' + expression);
  };
  const click = selector => evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});if(!e)throw Error('Missing selector');e.click();return true})()`);
  const screenshot = async filename => {const result=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:true});await writeFile(filename,Buffer.from(result.data,'base64'));};
  await send('Page.enable'); await send('Runtime.enable'); await send('Network.enable');
  return {send,on,evaluate,waitFor,click,screenshot,profile,getDiagnostics:()=>stderr,close:async()=>{try {await send('Browser.close');} catch {} ws.close();chrome.kill();}};
}

export async function intercept(client, handler) {
  const requests=[];
  client.on('Fetch.requestPaused',async p => {
    const route = await handler(p);
    if(!route) {await client.send('Fetch.continueRequest',{requestId:p.requestId});return;}
    const requestUrl = new URL(p.request.url);
    if(requestUrl.hostname === 'nominatim.openstreetmap.org') requestUrl.search = '?[resolution-parameters-omitted]';
    requests.push({url:requestUrl.href,method:p.request.method,body:p.request.postData || null});
    if(route.wait) await route.wait;
    if(route.error) {await client.send('Fetch.failRequest',{requestId:p.requestId,errorReason:route.error});return;}
    const body = typeof route.body === 'string' ? route.body : JSON.stringify(route.body ?? {});
    await client.send('Fetch.fulfillRequest',{requestId:p.requestId,responseCode:route.status||200,responseHeaders:[{name:'Content-Type',value:'application/json'},{name:'Access-Control-Allow-Origin',value:'*'},...(route.headers||[])],body:Buffer.from(body).toString('base64')});
  });
  await client.send('Fetch.enable',{patterns:[{urlPattern:'*',requestStage:'Request'}]});
  return requests;
}

export async function controlledNetwork(client, origin, handler) {
  return intercept(client, async p => {
    const route = await handler(p);
    if(route) return route;
    if(new URL(p.request.url).origin === origin) return null;
    return {error:'BlockedByClient'};
  });
}
