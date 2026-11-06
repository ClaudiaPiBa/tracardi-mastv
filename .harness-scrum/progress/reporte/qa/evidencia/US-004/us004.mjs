import assert from 'node:assert/strict';
import {mkdir, writeFile, readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {browser, staticServer, controlledNetwork, qaRoot, projectRoot, delay} from './cdp.mjs';
import {offer} from './fixtures.mjs';

// PREPARACIÓN: no ejecutar hasta informe developer final y transición En Review.
const out = qaRoot + '/us004-evidence';
const profile = '00000000-0000-4000-8000-000000000004';
const session = '00000000-0000-4000-8000-000000000040';
const consentedAt = '2026-11-05T12:00:00.000Z';
const rows = [
  offer('FOOD-NONE', 'Comida'),
  offer('FOOD-NULL', 'Comida', {entidad_federativa: null}),
  offer('FOOD-EMPTY', 'Comida', {entidad_federativa: '  '}),
  offer('FOOD-CMX', 'Comida', {entidad_federativa: ' mx-cmx '}),
  offer('FOOD-JAL', 'Comida', {entidad_federativa: 'MX-JAL'}),
  offer('CINE-JAL', 'Cine', {entidad_federativa: 'MX-JAL'}),
  offer('CINE-CMX', 'Cine', {entidad_federativa: 'MX-CMX'}),
  offer('CINE-NATIONAL', 'Cine', {entidad_federativa: ''}),
  offer('ROPA-CMX', 'Ropa', {entidad_federativa: 'MX-CMX'})
];
const foodNational = ['FOOD-NONE', 'FOOD-NULL', 'FOOD-EMPTY'];
const foodCmx = [...foodNational, 'FOOD-CMX'];
const foodJal = [...foodNational, 'FOOD-JAL'];
const foodAll = [...foodCmx, 'FOOD-JAL'];
const address = (iso = 'MX-CMX', level = 'ISO3166-2-lvl4') => ({address: {
  [level]: iso, country: 'QA país', country_code: 'mx', state: 'QA región'
}});
const accepted = (map, id = profile) => ({task: '00000000-0000-4000-8000-000000000001', ux: [], response: {}, profile: {
  id, ...(map === undefined ? {} : {interests: map})
}});
const savedRegion = iso => ({sessionId: session, profileId: profile, region: {
  isoRegion: iso, country: 'QA país', countryCode: 'mx', state: 'QA región', consentedAt
}});
const names = ids => ids.map(id => 'QA beneficio ' + id);
const events = ctx => ctx.calls.flatMap(call => call.events);
const geoEvents = ctx => events(ctx).filter(event => event.type === 'geo-location');
const text = (c, selector) => c.evaluate(`document.querySelector(${JSON.stringify(selector)}).textContent.trim()`);
const visible = (c, selector) => c.evaluate(`!!document.querySelector(${JSON.stringify(selector)})&&!document.querySelector(${JSON.stringify(selector)}).closest('[hidden]')`);
const geoCalls = ctx => ctx.c.evaluate('window.qaGeoCalls');
async function click(c, selector) {
  const point = await c.evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});if(!e||e.closest('[hidden]'))throw Error('Missing visible control '+${JSON.stringify(selector)});e.scrollIntoView({block:'center',behavior:'instant'});const r=e.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2}})()`);
  for (const type of ['mousePressed', 'mouseReleased']) await c.send('Input.dispatchMouseEvent', {type, button: 'left', clickCount: 1, ...point});
}
async function key(c, value) {
  for (const type of ['keyDown', 'keyUp']) await c.send('Input.dispatchKeyEvent', {type, key: value, code: value});
  await delay(25);
}
async function waitUntil(check, description, timeout = 8000) {
  const end = Date.now() + timeout;
  do {if (await check()) return; await delay(35);} while (Date.now() < end);
  throw Error('Timeout: ' + description);
}
async function waitTitles(ctx, ids) {
  const expected = names(ids);
  await ctx.c.waitFor(`JSON.stringify([...document.querySelectorAll('#offerList h3')].map(e=>e.textContent))===${JSON.stringify(JSON.stringify(expected))}`);
  assert.deepEqual(await ctx.c.evaluate('[...document.querySelectorAll("#offerList h3")].map(e=>e.textContent)'), expected);
}
async function ready(ctx) {
  await ctx.c.waitFor('document.querySelector("#offerList")?.getAttribute("aria-busy")==="false"&&document.querySelectorAll("#categoryFilters button").length===4');
}
async function enterCatalog(ctx) {
  if (!await visible(ctx.c, '#catalogView')) await click(ctx.c, '#homeView [data-go="catalog"]');
  assert.equal(await visible(ctx.c, '#catalogView'), true);
}
async function choose(ctx, category = 'Comida') {
  await enterCatalog(ctx);
  await click(ctx.c, '#categoryFilters [data-category-key="' + (category === 'Todos' ? '' : category.toLowerCase()) + '"]');
}
async function change(ctx) {
  await enterCatalog(ctx);
  await click(ctx.c, '#changeLocation');
  await ctx.c.waitFor('!document.querySelector("#locationModal").hidden');
}
async function waitSettled(ctx, pattern = /^Región .* aplicada\.$/i) {
  await ctx.c.waitFor('document.querySelector("#locationModal").hidden');
  await waitUntil(async () => pattern.test(await text(ctx.c, '#locationFeedback')), 'location feedback ' + pattern);
  await ready(ctx);
}
async function allow(ctx, pattern = /^Región .* aplicada\.$/i) {
  await click(ctx.c, '#allowLocation');
  await waitSettled(ctx, pattern);
}
async function noRegion(ctx) {
  assert.doesNotMatch(await text(ctx.c, '#regionStatus'), /MX-(CMX|JAL)/);
  assert.equal(await ctx.c.evaluate('localStorage.getItem("mastv.location.v1")'), null);
}
async function noCoordinateLeaks(ctx) {
  const forbidden = /latitude|longitude|coordinates|coords|\blat\b|\blon\b|19\.4326|-99\.1332/i;
  const stored = await ctx.c.evaluate('JSON.stringify({local:Object.fromEntries(Object.entries(localStorage)),session:Object.fromEntries(Object.entries(sessionStorage))})');
  assert.doesNotMatch(stored, forbidden, 'Storage must not retain coordinates');
  assert.doesNotMatch(JSON.stringify(ctx.calls), forbidden, 'Tracking must not send coordinates');
  assert.equal(ctx.consoleCoordinateLeak, false, 'Console must not log coordinates');
  return true;
}
async function screenshot(c, id) {
  const result = await c.send('Page.captureScreenshot', {format: 'png', captureBeyondViewport: false});
  await writeFile(out + '/' + id + '.png', Buffer.from(result.data, 'base64'));
}

await mkdir(out, {recursive: true});
const host = await staticServer();
const live = new Set();
const results = [];
async function setup(options = {}) {
  const c = await browser(); live.add(c);
  const ctx = {c, calls: [], resolutions: [], responses: [], resolverResponses: [], errors: [], consoleCoordinateLeak: false, releases: []};
  c.on('Runtime.exceptionThrown', p => ctx.errors.push(p.exceptionDetails.exception?.description || p.exceptionDetails.text));
  c.on('Runtime.consoleAPICalled', p => {
    const message = JSON.stringify(p.args.map(arg => arg.value ?? arg.description ?? ''));
    if (/latitude|longitude|coordinates|coords|\blat\b|\blon\b|19\.4326|-99\.1332/i.test(message)) ctx.consoleCoordinateLeak = true;
  });
  await c.send('Emulation.setDeviceMetricsOverride', {width: 430, height: 932, deviceScaleFactor: 1, mobile: true});
  await c.send('Browser.setPermission', {permission: {name: 'geolocation'}, setting: options.geo === 'denied' ? 'denied' : 'granted', origin: host.origin});
  await c.send('Emulation.setGeolocationOverride', {latitude: 19.4326, longitude: -99.1332, accuracy: 10});
  const seeds = {
    'mastv.visitor.v1': JSON.stringify({sessionId: session, profileId: profile}),
    ...(options.map === undefined ? {} : {'mastv.interests.v1': JSON.stringify({profileId: profile, interests: options.map})}),
    ...(options.region ? {'mastv.location.v1': JSON.stringify(savedRegion(options.region))} : {})
  };
  const injection = `
    if(!sessionStorage.getItem('qa.us004.seeded')){for(const [key,value]of Object.entries(${JSON.stringify(seeds)}))localStorage.setItem(key,value);sessionStorage.setItem('qa.us004.seeded','1');}
    window.qaGeoCalls=0;
    const qaMode=${JSON.stringify(options.geo || 'native')};
    if(qaMode==='unsupported')Object.defineProperty(navigator,'geolocation',{configurable:true,value:undefined});
    else if(qaMode==='timeout'||qaMode==='delayed')Object.defineProperty(navigator,'geolocation',{configurable:true,value:{getCurrentPosition(success,failure){window.qaGeoCalls++;if(qaMode==='timeout')setTimeout(()=>failure({code:3}),10);else window.qaCompletePosition=()=>success({coords:{latitude:19.4326,longitude:-99.1332}});}}});
    else {const nativeGet=navigator.geolocation.getCurrentPosition.bind(navigator.geolocation);Object.defineProperty(navigator.geolocation,'getCurrentPosition',{configurable:true,value:function(success,failure,options){window.qaGeoCalls++;return nativeGet(success,failure,options);}});}
  `;
  await c.send('Page.addScriptToEvaluateOnNewDocument', {source: injection});
  await controlledNetwork(c, host.origin, p => {
    const url = new URL(p.request.url);
    if (url.hostname === 'localhost' && url.port === '1337' && url.pathname === '/api/offers') return {body: {data: rows}};
    if (url.hostname === 'nominatim.openstreetmap.org' && url.pathname === '/reverse') {
      // Nunca guardar URL completa, valores de consulta ni coordenadas en evidencia.
      ctx.resolutions.push({method: p.request.method, queryKeys: [...url.searchParams.keys()].sort(), hasReferer: !!(p.request.headers.Referer || p.request.headers.referer)});
      return ctx.resolverResponses.shift() ?? {body: address()};
    }
    if (url.hostname !== 'localhost' || url.port !== '8686' || url.pathname !== '/track') return null;
    if (p.request.method === 'OPTIONS') return {status: 204, body: '', headers: [
      {name: 'Access-Control-Allow-Headers', value: 'Content-Type, Accept'},
      {name: 'Access-Control-Allow-Methods', value: 'POST, OPTIONS'}
    ]};
    assert.equal(p.request.method, 'POST');
    const payload = JSON.parse(p.request.postData);
    ctx.calls.push(payload);
    return payload.events.some(event => event.type === 'geo-location') ? (ctx.responses.shift() ?? {body: accepted()}) : {body: accepted()};
  });
  await c.send('Page.navigate', {url: host.origin + '/'});
  await ready(ctx);
  assert.equal(await geoCalls(ctx), 0, 'No coordinates before consent');
  assert.equal(ctx.resolutions.length, 0);
  assert.equal(ctx.calls.length, 0, 'No tracking on initial render or restore');
  if (!options.region) assert.equal(await visible(c, '#locationModal'), true);
  return ctx;
}
function gate(ctx) {
  let release;
  const wait = new Promise(resolve => {release = resolve;});
  ctx.releases.push(release);
  return {wait, release};
}

const cases = [
  ['Esperar una decisión antes de solicitar ubicación', async ctx => {
    assert.equal(await visible(ctx.c, '#allowLocation'), true);
    assert.equal(await visible(ctx.c, '#declineLocation'), true);
    assert.equal(await visible(ctx.c, '#closeLocation'), true);
    await delay(100); assert.equal(await geoCalls(ctx), 0);
    const exits = ['#closeLocation', '#declineLocation', 'Escape'];
    for (let i = 0; i < exits.length; i++) {
      if (i) await change(ctx);
      await click(ctx.c, '#allowLocation');
      await waitUntil(async () => await geoCalls(ctx) === i + 1, 'geolocation only after allow');
      assert.equal(await ctx.c.evaluate('document.querySelector("#allowLocation").disabled'), true);
      if (exits[i] === 'Escape') await key(ctx.c, 'Escape'); else await click(ctx.c, exits[i]);
      await ctx.c.waitFor('document.querySelector("#locationModal").hidden');
      await ctx.c.evaluate('window.qaCompletePosition();true');
      await delay(80); await noRegion(ctx);
      assert.equal(ctx.resolutions.length, 0); assert.equal(geoEvents(ctx).length, 0);
    }
    return {noCoordinatesBeforeAllow: true,allowDisabledWhilePending: true,lateCoordinatesIgnoredAfterCloseRejectEscape: true};
  }, {geo: 'delayed'}],
  ['Aplicar una región resuelta con consentimiento', async ctx => {
    await allow(ctx); await choose(ctx); await waitTitles(ctx, foodCmx);
    assert.match(await text(ctx.c, '#regionStatus'), /MX-CMX/);
    assert.equal(await geoCalls(ctx), 1); assert.equal(ctx.resolutions.length, 1);
    return {region: 'MX-CMX', nationalMissingNullAndBlankIncluded: true,caseAndWhitespaceNormalized: true, otherRegionExcluded: true};
  }],
  ['Asociar región al visitante sin coordenadas', async ctx => {
    await allow(ctx);
    assert.equal(geoEvents(ctx).length, 1); assert.equal(ctx.calls.length, 1);
    const body = ctx.calls[0], properties = geoEvents(ctx)[0].properties;
    assert.equal(body.session.id, session); assert.equal(body.profile.id, profile); assert.ok(body.source.id);
    assert.deepEqual(Object.keys(properties).sort(), ['ISO3166-2-lvl4','action','consented_at','country','country_code','iso_region','state'].sort());
    assert.equal(properties.iso_region, 'MX-CMX'); assert.equal(properties['ISO3166-2-lvl4'], 'MX-CMX');
    assert.equal(properties.action, 'geo_consent_granted'); assert.ok(Number.isFinite(Date.parse(properties.consented_at)));
    assert.equal(properties.country, 'QA país'); assert.equal(properties.country_code, 'mx'); assert.equal(properties.state, 'QA región');
    const saved = await ctx.c.evaluate('JSON.parse(localStorage.getItem("mastv.location.v1"))');
    assert.equal(saved.sessionId, session); assert.equal(saved.profileId, profile); assert.equal(saved.region.isoRegion, 'MX-CMX');
    await noCoordinateLeaks(ctx);
    return {singleGeoEvent: true,identityAndConsentAssociated: true,onlyExplicitRegionFields: true,noCoordinatePersistenceTrackingOrConsole: true};
  }],
  ...[['rechazar', '#declineLocation'], ['cerrar el diálogo', '#closeLocation'], ['salir mediante Escape', 'Escape']].map(([decision, control]) => [
    'Continuar sin compartir ubicación: ' + decision, async ctx => {
      if (control === 'Escape') await key(ctx.c, 'Escape'); else await click(ctx.c, control);
      await ctx.c.waitFor('document.querySelector("#locationModal").hidden');
      await choose(ctx); await waitTitles(ctx, foodAll); await noRegion(ctx);
      assert.equal(await geoCalls(ctx), 0); assert.equal(ctx.resolutions.length, 0); assert.equal(geoEvents(ctx).length, 0);
      return {decision, allNationalAndRegionalOffers: true,noCoordinatesOrGeoEvent: true};
    }
  ]),
  ...[
    ['permiso del navegador denegado', 'denied', /permiso|conced/i],
    ['ubicación no soportada', 'unsupported', /disponible|soportad/i],
    ['tiempo de espera agotado', 'timeout', /tiempo|agot/i],
    ['resolución sin código regional', 'no-region', /región válida|regional/i],
    ['servicio de resolución fallido', 'resolver-failed', /servicio|consultar/i]
  ].map(([result, mode, pattern]) => ['Continuar sin región: ' + result, async ctx => {
    if (mode === 'no-region') ctx.resolverResponses.push({body: {address: {country: 'QA país', country_code: 'mx'}}});
    if (mode === 'resolver-failed') ctx.resolverResponses.push({status: 503, body: {error: 'QA resolver unavailable'}});
    await allow(ctx, pattern); await choose(ctx); await waitTitles(ctx, foodAll); await noRegion(ctx);
    assert.equal(geoEvents(ctx).length, 0);
    assert.equal(ctx.resolutions.length, ['no-region', 'resolver-failed'].includes(mode) ? 1 : 0);
    if (mode === 'resolver-failed') {
      await change(ctx); const pending = gate(ctx);
      ctx.resolverResponses.push({body: address(), wait: pending.wait});
      await click(ctx.c, '#allowLocation');
      await waitUntil(() => ctx.resolutions.length === 2, 'pending resolver');
      await click(ctx.c, '#closeLocation');
      await ctx.c.waitFor('document.querySelector("#locationModal").hidden');
      pending.release(); await delay(150); await noRegion(ctx); await waitTitles(ctx, foodAll);
      assert.equal(geoEvents(ctx).length, 0);
    }
    return {result,impedimentExplainedInCatalog: true,allRegionsExplorable: true,noUnresolvedGeoEvent: true,lateResolverIgnoredAfterClose: mode === 'resolver-failed' ? true : undefined};
  }, {geo: ['denied','unsupported','timeout'].includes(mode) ? mode : 'native'}]),
  ['Restaurar una región consentida', async ctx => {
    assert.equal(await visible(ctx.c, '#locationModal'), false);
    await choose(ctx); await waitTitles(ctx, foodCmx);
    await ctx.c.send('Page.reload'); await ready(ctx);
    assert.equal(await visible(ctx.c, '#locationModal'), false);
    assert.equal(await geoCalls(ctx), 0); assert.equal(ctx.resolutions.length, 0); assert.equal(geoEvents(ctx).length, 0);
    await choose(ctx); await waitTitles(ctx, foodCmx);
    assert.match(await text(ctx.c, '#regionStatus'), /MX-CMX/); assert.equal(await visible(ctx.c, '#changeLocation'), true);
    return {region: 'MX-CMX',restoredAfterActualReload: true,noNewCoordinatesResolverOrGeoEvent: true};
  }, {region: 'MX-CMX'}],
  ['Sustituir la región por una nueva decisión', async ctx => {
    await choose(ctx); await waitTitles(ctx, foodCmx);
    await change(ctx); ctx.resolverResponses.push({body: address(' mx-jal ', 'ISO3166-2-lvl3')});
    await allow(ctx); await waitTitles(ctx, foodJal);
    assert.match(await text(ctx.c, '#regionStatus'), /MX-JAL/);
    assert.equal(geoEvents(ctx).length, 1); assert.equal(geoEvents(ctx)[0].properties.iso_region, 'MX-JAL');
    assert.equal(ctx.calls.at(-1).profile.id, profile); assert.equal(ctx.calls.at(-1).session.id, session);
    assert.equal(await ctx.c.evaluate('JSON.parse(localStorage.getItem("mastv.location.v1")).region.isoRegion'), 'MX-JAL');
    return {oldRegionReplaced: true,lvl3FallbackAndNormalization: true,sameVisitorIdentity: true};
  }, {region: 'MX-CMX', map: {Comida: 2, Cine: 4}}],
  ['Retirar una región conservada', async ctx => {
    await enterCatalog(ctx); await waitTitles(ctx, ['CINE-CMX','CINE-NATIONAL',...foodCmx]);
    const before = await ctx.c.evaluate('localStorage.getItem("mastv.interests.v1")');
    await change(ctx); await click(ctx.c, '#declineLocation');
    await ctx.c.waitFor('document.querySelector("#locationModal").hidden'); await noRegion(ctx);
    await waitTitles(ctx, ['CINE-JAL','CINE-CMX','CINE-NATIONAL',...foodAll]);
    assert.equal(await ctx.c.evaluate('localStorage.getItem("mastv.interests.v1")'), before);
    assert.equal(await geoCalls(ctx), 0); assert.equal(geoEvents(ctx).length, 0);
    return {regionRemovedFromUiAndStorage: true,allRegionsRestored: true,affinitiesUnchanged: true};
  }, {region: 'MX-CMX', map: {Cine: 4, Comida: 2}}],
  ['Conservar la región anterior si falla su actualización', async ctx => {
    await choose(ctx); await change(ctx);
    ctx.resolverResponses.push({body: {address: {country: 'QA país'}}});
    await allow(ctx, /No pudo actualizarse/); await waitTitles(ctx, foodCmx);
    assert.match(await text(ctx.c, '#locationFeedback'), /se conserva MX-CMX/);
    assert.match(await text(ctx.c, '#regionStatus'), /MX-CMX/);
    assert.equal(await ctx.c.evaluate('JSON.parse(localStorage.getItem("mastv.location.v1")).region.isoRegion'), 'MX-CMX');
    assert.equal(geoEvents(ctx).length, 0);
    return {previousRegionPreserved: true,updateFailureExplained: true,noUnresolvedEvent: true};
  }, {region: 'MX-CMX'}],
  ['Aplicar región aunque no pueda sincronizarse su evento', async ctx => {
    const failures = [
      {status: 503, body: {error: 'QA track unavailable'}},
      {body: {...accepted(), response: {errors: ['QA rejected']}}},
      {error: 'ConnectionFailed'}
    ];
    for (let i = 0; i < failures.length; i++) {
      if (i) await change(ctx);
      ctx.responses.push(failures[i]); await allow(ctx, /No pudo confirmarse.*sincroniz/i);
      assert.match(await text(ctx.c, '#regionStatus'), /MX-CMX/);
      assert.doesNotMatch(await text(ctx.c, '#locationFeedback'), /se registró|registrada|registrado|sincronizada/i);
      assert.equal(await visible(ctx.c, '#successModal'), false);
      assert.equal(await ctx.c.evaluate('JSON.parse(localStorage.getItem("mastv.location.v1")).region.isoRegion'), 'MX-CMX');
      await choose(ctx); await waitTitles(ctx, foodCmx);
    }
    // Una aceptación de sincronización tardía tampoco restaura una decisión retirada.
    await change(ctx); const pending = gate(ctx); ctx.responses.push({body: accepted(), wait: pending.wait});
    const before = geoEvents(ctx).length; await click(ctx.c, '#allowLocation');
    await waitUntil(() => geoEvents(ctx).length === before + 1, 'pending geo sync');
    if (!await visible(ctx.c, '#locationModal')) await change(ctx);
    await click(ctx.c, '#declineLocation'); await ctx.c.waitFor('document.querySelector("#locationModal").hidden');
    pending.release(); await delay(150); await noRegion(ctx); await waitTitles(ctx, foodAll);
    assert.doesNotMatch(await text(ctx.c, '#locationFeedback'), /MX-CMX aplicada|sincronizando/i);
    return {localRegionSurvivesHttpSemanticAndNetworkRejection: true,noFalseSyncSuccess: true,lateSyncCannotRestoreWithdrawnRegion: true};
  }],
  ['Combinar afinidad con elegibilidad regional', async ctx => {
    await enterCatalog(ctx); await waitTitles(ctx, ['CINE-CMX','CINE-NATIONAL',...foodCmx]);
    await choose(ctx, 'Cine'); await waitTitles(ctx, ['CINE-CMX','CINE-NATIONAL']);
    await choose(ctx, 'Ropa'); await waitTitles(ctx, ['ROPA-CMX']);
    await choose(ctx, 'Todos'); await waitTitles(ctx, ['CINE-CMX','CINE-NATIONAL',...foodCmx]);
    assert.equal(await geoCalls(ctx), 0); assert.equal(geoEvents(ctx).length, 0);
    return {regionalEligibilityBeforeAffinity: true,descendingAndStableOrder: true,explicitCategoryIgnoresAffinityButRespectsRegion: true};
  }, {region: 'MX-CMX', map: {Cine: 4, Comida: 2, Ropa: 1}}],
  ['Actualizar afinidades devueltas al sincronizar región', async ctx => {
    ctx.resolverResponses.push({body: address('MX-CMX', 'ISO3166-2-lvl6')});
    ctx.responses.push({body: accepted({Comida: 5})});
    await allow(ctx); await waitTitles(ctx, foodCmx);
    assert.equal(geoEvents(ctx).length, 1); assert.equal(ctx.calls.length, 1, 'Render must not generate interactions');
    assert.equal(await ctx.c.evaluate('JSON.parse(localStorage.getItem("mastv.interests.v1")).interests.comida'), 5);
    await change(ctx); ctx.responses.push({body: accepted({})});
    await allow(ctx); await waitTitles(ctx, []);
    assert.match(await text(ctx.c, '#emptyState'), /recomendaciones/i);
    assert.match(await text(ctx.c, '#regionStatus'), /MX-CMX/);
    return {newMapReplacesPreviousThroughGeoAcceptance: true,lvl6Fallback: true,emptyMapAlsoRemovesRecommendations: true,noRenderEvents: true};
  }, {map: {Cine: 4}}]
];
assert.equal(cases.length, 18);

try {
  for (const [name, test, options = {}] of cases) {
    const id = String(results.length + 1).padStart(2, '0'); let ctx;
    try {
      ctx = await setup(options);
      const observed = await test(ctx);
      await noCoordinateLeaks(ctx); assert.deepEqual(ctx.errors, []);
      await screenshot(ctx.c, id);
      results.push({id, name, status: 'PASS', observed, geolocationRequests: await geoCalls(ctx), resolutions: ctx.resolutions, calls: ctx.calls, uncaughtErrors: ctx.errors});
    } catch (error) {
      if (ctx) try {await screenshot(ctx.c, id + '-failure');} catch {}
      results.push({id, name, status: 'FAIL', error: error.stack, resolutions: ctx?.resolutions, calls: ctx?.calls, uncaughtErrors: ctx?.errors});
    } finally {
      if (ctx) {for (const release of ctx.releases) release(); await ctx.c.close(); live.delete(ctx.c);}
    }
    await writeFile(out + '/results.json', JSON.stringify({scope: 'US004 18 expanded browser cases; only synthetic external responses', date: new Date().toISOString(), results}, null, 2));
    console.log(JSON.stringify({id, name, status: results.at(-1).status, error: results.at(-1).error?.split('\n')[0]}));
  }
  const hashes = {};
  for (const file of ['index.html','css/styles.css','js/app.js','js/catalog.js','js/config.js','js/tracking.js','js/interests.js','js/location.js']) {
    hashes[file] = createHash('sha256').update(await readFile(projectRoot + '/' + file)).digest('hex');
  }
  await writeFile(out + '/source-hashes.json', JSON.stringify(hashes, null, 2));
  const failed = results.filter(result => result.status === 'FAIL').length;
  console.log(JSON.stringify({total: results.length, passed: results.length - failed, failed})); process.exitCode = failed ? 1 : 0;
} finally {
  for (const c of live) await c.close(); await host.close();
}
