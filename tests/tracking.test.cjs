'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const tracking = require('../js/tracking.js');
const accepted = (id = 'perfil-sintetico') => ({task: 'tarea-sintetica', profile: {id, interests: {}}, response: {}});
const event = {type: 'category-filter', properties: {category: 'Prueba'}};
const response = (body) => ({ok: true, json: async () => body});
const memoryStorage = () => {const data = new Map(); return {getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value)};};
const make = (options = {}) => tracking.createTracker({trackingApi: 'http://tracking.test/track', trackingSource: 'fuente-sintetica', storage: null, createSessionId: () => 'sesion-sintetica', ...options});

test('solo reconoce respuesta de recepción observada, sin errores explícitos', () => {
  assert.equal(tracking.acceptedResponse(accepted()), true);
  for (const value of [null, [], {}, {profile: {id: 'x'}}, {task: 'x'}, {...accepted(), errors: ['rechazo']}, {...accepted(), response: {error: 'fallo'}}, {...accepted(), response: {success: false}}, {...accepted(), profile: {id: 'x', errors: {reason: 'rechazado'}}}]) assert.equal(tracking.acceptedResponse(value), false);
});
test('selecciones generan los siete tipos requeridos con propiedades de referencia', () => {
  for (const [category, type] of [['Comida', 'comida-seg'], ['Electronica', 'electronica-seg'], ['Cine', 'cine-seg'], ['Ropa', 'ropa-seg'], ['Online', 'online-seg'], ['Todos', 'category-filter'], ['Viajes', 'category-filter']]) {
    const value = tracking.filterEvent(category, 'hora-sintetica');
    assert.equal(value.type, type);
    assert.equal(value.properties.category, category);
    assert.equal(value.properties.filter_time, 'hora-sintetica');
  }
});
test('apertura crea una consulta y apertura del mismo beneficio, sin inventar económicos', () => {
  const offer = {id: 'oferta-sintetica', name: 'Prueba', category: 'Cine', code: 'CUPON-PRUEBA', priceOffer: null, priceOriginal: null, discountPercentage: null};
  const values = tracking.openEvents(offer);
  assert.deepEqual(values.map(value => value.type), ['offer-click', 'offer-view']);
  assert.equal(values[0].properties.offer_id, offer.id);
  assert.equal(values[1].properties.coupon_code, offer.code);
  assert.equal(values[0].properties.price, null);
  assert.equal(tracking.redeemEvent({...offer, code: ''}), null);
  assert.equal(tracking.redeemEvent(offer, 'hora-sintetica').properties.coupon, offer.code);
});
test('primer envío usa perfil nulo; envíos concurrentes esperan perfil inicial', async () => {
  const calls = [];
  let release;
  const gate = new Promise(resolve => release = resolve);
  const tracker = make({fetcher: async (_, options) => {
    calls.push(JSON.parse(options.body));
    if (calls.length === 1) await gate;
    return response(accepted());
  }});
  const first = tracker.send([event]);
  const second = tracker.send([event]);
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(calls.length, 1);
  assert.equal(calls[0].profile, null);
  release();
  await Promise.all([first, second]);
  assert.deepEqual(calls[1].profile, {id: 'perfil-sintetico'});
  assert.equal(calls[0].session.id, calls[1].session.id);
  assert.equal(calls[0].source.id, 'fuente-sintetica');
});
test('restaura perfil y sesión desde espacio MASTV sin afectar datos de demo', async () => {
  const storage = memoryStorage();
  storage.setItem('tracardi_profile_id', 'perfil-demo-no-utilizar');
  const first = make({storage, fetcher: async () => response(accepted())});
  await first.send([event]);
  const restored = make({storage});
  assert.deepEqual(restored.getState(), first.getState());
  assert.equal(storage.getItem('tracardi_profile_id'), 'perfil-demo-no-utilizar');
});
test('storage ilegible o denegado mantiene identidad en memoria', async () => {
  const storage = {getItem() {throw Error('denegado');}, setItem() {throw Error('denegado');}};
  const tracker = make({storage, fetcher: async () => response(accepted())});
  await tracker.send([event]);
  await tracker.send([event]);
  assert.deepEqual(tracker.getState(), {sessionId: 'sesion-sintetica', profileId: 'perfil-sintetico'});
  const corrupt = make({storage: {getItem: () => 'malformado', setItem() {}}});
  assert.equal(corrupt.getState().profileId, null);
});
test('rechazos HTTP, JSON y comunicación no cambian perfil ni notifican aceptación', async () => {
  const bodies = [response({...accepted('intruso'), errors: ['rechazo']}), {ok: false, status: 500}, {ok: true, json: async () => {throw Error('JSON');}}, null];
  let notifications = 0;
  const tracker = make({fetcher: async () => {const value = bodies.shift(); if (!value) throw Error('red'); return value;}});
  tracker.subscribe(() => notifications++);
  for (let i = 0; i < 4; i++) assert.equal((await tracker.send([event])).accepted, false);
  assert.equal(tracker.getState().profileId, null);
  assert.equal(notifications, 0);
});
test('fallo no interrumpe cola y no hay reintento automático', async () => {
  let calls = 0;
  const tracker = make({fetcher: async () => {calls++; if (calls === 1) throw Error('red'); return response(accepted());}});
  assert.equal((await tracker.send([event])).accepted, false);
  assert.equal(calls, 1);
  assert.equal((await tracker.send([event])).accepted, true);
  assert.equal(calls, 2);
});
test('timeout aborta y devuelve fallo sin bloquear siguientes envíos', async () => {
  const tracker = make({timeoutMs: 10, fetcher: async (_, {signal}) => new Promise((resolve, reject) => signal.addEventListener('abort', () => reject(Error('abortado'))))});
  assert.equal((await tracker.send([event])).accepted, false);
});
test('notifica solo respuestas aceptadas y aísla errores de consumidores', async () => {
  const notifications = [];
  const tracker = make({fetcher: async () => response(accepted())});
  tracker.subscribe(() => {throw Error('consumidor');});
  const unsubscribe = tracker.subscribe(value => notifications.push(value));
  assert.equal((await tracker.send([event])).accepted, true);
  assert.equal(notifications[0].profileChanged, true);
  assert.equal(notifications[0].previousProfileId, null);
  unsubscribe();
  await tracker.send([event]);
  assert.equal(notifications.length, 1);
});
test('snapshot de envío impide que un cambio posterior altere datos comerciales', async () => {
  let sent;
  const tracker = make({fetcher: async (_, options) => {sent = JSON.parse(options.body); return response(accepted());}});
  const mutable = {type: 'offer-view', properties: {title: 'Original sintético'}};
  const promise = tracker.send([mutable]);
  mutable.properties.title = 'Modificado';
  await promise;
  assert.equal(sent.events[0].properties.title, 'Original sintético');
});
