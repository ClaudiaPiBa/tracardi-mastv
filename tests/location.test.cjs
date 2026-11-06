'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const location = require('../js/location.js');
const interests = require('../js/interests.js');
const deferred = () => {let resolve; const promise = new Promise((done) => {resolve = done;}); return {promise, resolve};};
const address = (iso = 'MX-CMX') => ({address: {'ISO3166-2-lvl4': iso, country: 'México', country_code: 'MX', state: 'Ciudad de México'}});
function setup(overrides = {}) {
  const saved = new Map();
  const events = [];
  const requests = [];
  const storage = {getItem: (key) => saved.get(key) ?? null, setItem: (key, value) => saved.set(key, value), removeItem: (key) => saved.delete(key)};
  const options = {
    sessionId: 'synthetic-session', profileId: null, storage,
    geocodingApi: 'https://resolver.invalid/reverse', clock: () => Date.parse('2026-11-05T12:00:00Z'), wait: async () => {},
    geolocation: {getCurrentPosition: (success) => success({coords: {latitude: 19, longitude: -99}})},
    fetcher: async (url, config) => {requests.push({url, config}); return {ok: true, json: async () => address()};},
    tracker: {send: async (batch) => {events.push(...batch); return {accepted: true};}},
    ...overrides
  };
  return {store: location.createLocation(options), saved, events, requests, storage, options};
}

test('normaliza ISO y descarta códigos vacíos o inventados', () => {
  assert.equal(location.normalizeRegion(' mx-cmx '), 'MX-CMX');
  for (const value of ['', null, 'Ciudad de México', 'MX', 'MX-ABCD', {}, 1]) assert.equal(location.normalizeRegion(value), '');
});
test('resuelve lvl4 y alternativas válidas sin adoptar campos arbitrarios', () => {
  assert.equal(location.regionFromAddress({'ISO3166-2-lvl4': '', 'ISO3166-2-lvl3': ' mx-jal '}).isoRegion, 'MX-JAL');
  assert.equal(location.regionFromAddress({'ISO3166-2-lvl6': 'MX-CMX'}).isoRegion, 'MX-CMX');
  assert.equal(location.regionFromAddress({state: 'Ciudad de México', iso_region: 'MX-CMX'}), null);
});
test('elegibilidad conserva nacionales y compara espacios/mayúsculas; sin región conserva todo', () => {
  const offers = [{location: null}, {}, {location: ''}, {location: ' '}, {location: ' mx-cmx '}, {location: 'MX-JAL'}];
  assert.deepEqual(location.filterOffers(offers, ' MX-CMX '), offers.slice(0, 5));
  assert.deepEqual(location.filterOffers(offers, null), offers);
});
test('construir o rechazar no solicita coordenadas, resolución ni tracking', () => {
  let coordinates = 0;
  const {store, requests, events} = setup({geolocation: {getCurrentPosition: () => {coordinates += 1;}}});
  store.prepareDecision(); store.decline();
  assert.equal(coordinates, 0); assert.equal(requests.length, 0); assert.equal(events.length, 0);
});
test('permiso válido guarda solo región consentida y envía campos de evento sin coordenadas', async () => {
  const {store, saved, requests, events} = setup();
  await store.allow();
  assert.equal(store.getState().region.isoRegion, 'MX-CMX');
  assert.equal(store.getState().status, 'ready');
  assert.equal(events.length, 1);
  assert.deepEqual(Object.keys(events[0].properties).sort(), ['ISO3166-2-lvl4', 'action', 'consented_at', 'country', 'country_code', 'iso_region', 'state'].sort());
  assert.equal(events[0].type, 'geo-location');
  assert.equal(events[0].properties.action, 'geo_consent_granted');
  const persisted = [...saved.values()].join('');
  assert.doesNotMatch(persisted, /latitude|longitude|coords|\blat\b|\blon\b/);
  assert.equal(new URL(requests[0].url).searchParams.get('lat'), '19');
  assert.equal(new URL(requests[0].url).searchParams.get('format'), 'jsonv2');
  assert.equal(requests[0].config.credentials, 'omit');
  assert.equal(requests[0].config.cache, 'no-store');
  assert.equal(requests[0].config.referrerPolicy, 'origin');
});
test('restaura región consentida de misma visita y no consulta ni emite', async () => {
  const {store, storage, options, events} = setup();
  await store.allow(); store.setProfileId('new-profile');
  const next = location.createLocation({...options, storage, profileId: 'new-profile'});
  assert.equal(next.getState().region.isoRegion, 'MX-CMX');
  assert.equal(events.length, 1);
});
test('ignora persistencia ajena, inválida o sin consentimiento verificable', () => {
  const {storage, options} = setup();
  for (const saved of [null, {}, {sessionId: 'other', region: {isoRegion: 'MX-CMX', consentedAt: '2026-11-05'}}, {sessionId: options.sessionId, region: {isoRegion: 'MX-CMX'}}, {sessionId: options.sessionId, region: {isoRegion: 'bad', consentedAt: '2026-11-05'}}]) {
    storage.setItem(location.storageKey, JSON.stringify(saved));
    assert.equal(location.createLocation(options).getState().region, null);
  }
  storage.setItem(location.storageKey, 'not json');
  assert.equal(location.createLocation(options).getState().region, null);
});
test('cambiar perfil no borra región consentida ni adopta región remota', async () => {
  const {store, saved} = setup(); await store.allow(); store.setProfileId('collector-profile');
  assert.equal(store.getState().region.isoRegion, 'MX-CMX');
  assert.equal(JSON.parse(saved.get(location.storageKey)).profileId, 'collector-profile');
});
test('retirar elimina región y persistencia sin modificar otro espacio de almacenamiento', async () => {
  const {store, saved} = setup(); saved.set('mastv.interests.v1', 'unchanged');
  await store.allow(); store.decline();
  assert.equal(store.getState().region, null); assert.equal(saved.has(location.storageKey), false);
  assert.equal(saved.get('mastv.interests.v1'), 'unchanged');
});
test('nueva resolución sustituye región anterior y genera nuevo evento', async () => {
  let iso = 'MX-CMX';
  const {store, events} = setup({fetcher: async () => ({ok: true, json: async () => address(iso)})});
  await store.allow(); iso = 'MX-JAL'; store.prepareDecision(); await store.allow();
  assert.equal(store.getState().region.isoRegion, 'MX-JAL');
  assert.deepEqual(events.map((event) => event.properties.iso_region), ['MX-CMX', 'MX-JAL']);
});
test('fallo primera resolución permite catálogo sin exclusión y sin evento', async () => {
  const {store, events} = setup({fetcher: async () => ({ok: true, json: async () => ({address: {state: 'Ciudad de México'}})})});
  await store.allow();
  assert.equal(store.getState().region, null); assert.equal(events.length, 0);
  assert.match(store.getState().message, /región válida.*sin exclusión regional/);
});
test('fallo actualización conserva región y explica el impedimento', async () => {
  let fail = false;
  const {store, events} = setup({fetcher: async () => {if (fail) throw new Error('network'); return {ok: true, json: async () => address()};}});
  await store.allow(); fail = true; store.prepareDecision(); await store.allow();
  assert.equal(store.getState().region.isoRegion, 'MX-CMX'); assert.equal(events.length, 1);
  assert.match(store.getState().message, /No pudo actualizarse.*se conserva MX-CMX/);
});
for (const [name, geolocation, message] of [
  ['no soportada', null, /no está disponible/],
  ['denegada', {getCurrentPosition: (_, failure) => failure({code: 1})}, /no concedió permiso/],
  ['timeout', {getCurrentPosition: (_, failure) => failure({code: 3})}, /agotó el tiempo/]
]) test(`ubicación ${name} informa y no inventa evento`, async () => {
  const {store, events, requests} = setup({geolocation}); await store.allow();
  assert.equal(store.getState().region, null); assert.equal(events.length, 0); assert.equal(requests.length, 0);
  assert.match(store.getState().message, message);
});
test('error HTTP y JSON inválido no crean región', async () => {
  for (const fetcher of [async () => ({ok: false}), async () => ({ok: true, json: async () => {throw new Error();}})]) {
    const {store, events} = setup({fetcher}); await store.allow();
    assert.equal(store.getState().region, null); assert.equal(events.length, 0);
  }
});
test('timeout del resolver informa sin inventar región', async () => {
  const {store} = setup({timeoutMs: 1, fetcher: (_, {signal}) => new Promise((_, reject) => signal.addEventListener('abort', () => reject(new Error('abort'))))});
  await store.allow(); assert.equal(store.getState().status, 'error'); assert.equal(store.getState().region, null);
});
test('fallo de envío conserva región local e informa sin afirmar registro', async () => {
  for (const send of [async () => ({accepted: false}), async () => {throw new Error();}]) {
    const {store} = setup({tracker: {send}}); await store.allow();
    assert.equal(store.getState().region.isoRegion, 'MX-CMX'); assert.equal(store.getState().status, 'sync-error');
    assert.match(store.getState().message, /No pudo confirmarse la sincronización/);
  }
});
test('rechazo mientras espera coordenadas invalida callback tardío sin resolver ni emitir', async () => {
  let success;
  const {store, events, requests} = setup({geolocation: {getCurrentPosition: (callback) => {success = callback;}}});
  const pending = store.allow(); store.decline(); success({coords: {latitude: 19, longitude: -99}}); await pending;
  assert.equal(store.getState().region, null); assert.equal(events.length, 0); assert.equal(requests.length, 0);
});
test('cierre mientras resuelve aborta solicitud e ignora incluso fetch que no respeta abort', async () => {
  const deferredResponse = deferred(); let requestSignal;
  const {store, events} = setup({fetcher: async (_, {signal}) => {requestSignal = signal; return deferredResponse.promise;}});
  const pending = store.allow(); await Promise.resolve(); store.decline();
  assert.equal(requestSignal.aborted, true);
  deferredResponse.resolve({ok: true, json: async () => address()}); await pending;
  assert.equal(store.getState().region, null); assert.equal(events.length, 0);
});
test('respuesta de envío tardía no restaura región retirada ni sobrescribe feedback', async () => {
  const sent = deferred(); const {store} = setup({tracker: {send: () => sent.promise}});
  const pending = store.allow(); for (let i = 0; i < 5; i += 1) await Promise.resolve();
  assert.equal(store.getState().status, 'syncing'); store.decline(); sent.resolve({accepted: true}); await pending;
  assert.equal(store.getState().region, null); assert.equal(store.getState().status, 'declined');
});
test('no duplica acciones concurrentes y respeta mínimo 1s antes de resolver de nuevo', async () => {
  let success; const waits = [];
  const {store, requests} = setup({wait: async (ms) => {waits.push(ms);}, geolocation: {getCurrentPosition: (callback) => {success = callback;}}});
  const first = store.allow(); assert.deepEqual(await store.allow(), {ignored: true});
  success({coords: {latitude: 19, longitude: -99}}); await first;
  store.prepareDecision(); const second = store.allow(); success({coords: {latitude: 19, longitude: -99}}); await second;
  assert.equal(requests.length, 2); assert.deepEqual(waits, [1000]);
});
test('sin almacenamiento conserva región durante visita', async () => {
  const {store} = setup({storage: {getItem: () => {throw new Error();}, setItem: () => {throw new Error();}, removeItem: () => {throw new Error();}}});
  await store.allow(); assert.equal(store.getState().region.isoRegion, 'MX-CMX'); store.decline(); assert.equal(store.getState().region, null);
});
test('aplica región antes de afinidad y categoría, conserva orden por peso', () => {
  const offers = [
    {id: 'other-cine', category: 'Cine', location: 'MX-JAL'},
    {id: 'national-food', category: 'Comida', location: ''},
    {id: 'regional-cine', category: 'Cine', location: 'MX-CMX'},
    {id: 'low', category: 'Ropa', location: ''}
  ];
  const eligible = location.filterOffers(offers, 'MX-CMX');
  assert.deepEqual(interests.selectOffers(eligible, {cine: 4, comida: 2, ropa: 1}).map((offer) => offer.id), ['regional-cine', 'national-food']);
  assert.deepEqual(interests.selectOffers(eligible, {}, 'Cine').map((offer) => offer.id), ['regional-cine']);
});
