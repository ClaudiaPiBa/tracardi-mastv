'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const {normalizeOffer, loadOffers, key} = require('../js/catalog.js');
const offer = (id = 'sintetica-1') => ({id_offer: id, titulo: 'Beneficio sintético', categoria: ' Comida ', codigo_cupon: 'CUPON-PRUEBA'});
const response = (data) => ({ok: true, json: async () => data});

test('normaliza campos planos, prioridad de identidad y números sin inventar datos', () => {
  const normalized = normalizeOffer({...offer(), id: 7, documentId: 'documento', precio_oferta: '0', descuento_porcentaje: '25', moneda: 'mxn'});
  assert.equal(normalized.id, 'sintetica-1');
  assert.equal(normalized.strapiId, 7);
  assert.equal(normalized.documentId, 'documento');
  assert.equal(normalized.categoryKey, 'comida');
  assert.equal(normalized.priceOffer, 0);
  assert.equal(normalized.priceOriginal, null);
  assert.equal(normalized.discountPercentage, 25);
  assert.equal(normalized.currency, 'MXN');
});
test('acepta attributes y conserva id original numérico', () => {
  const normalized = normalizeOffer({id: 0, attributes: {...offer(''), id_offer: ' ', documentId: 'doc-prueba'}});
  assert.equal(normalized.id, 'doc-prueba');
  assert.equal(normalized.strapiId, 0);
  assert.equal(normalizeOffer({id: 0, attributes: offer('')}).id, '0');
});
test('omite identidad, título o categoría ausentes; no admite tipos de identidad inválidos', () => {
  for (const record of [null, {}, {...offer(), id_offer: undefined}, {...offer(), titulo: ' '}, {...offer(), categoria: ''}, {...offer(), id_offer: {}}]) assert.equal(normalizeOffer(record), null);
});
test('ausencias e inválidos opcionales nunca se convierten en cero ni códigos inventados', () => {
  const normalized = normalizeOffer({...offer(), codigo_cupon: null, precio_original: '', precio_oferta: '12foo', descuento_porcentaje: 101, moneda: 'foo', fecha_expiracion: '2026-02-30'});
  assert.equal(normalized.code, '');
  assert.equal(normalized.priceOriginal, null);
  assert.equal(normalized.priceOffer, null);
  assert.equal(normalized.discountPercentage, null);
  assert.equal(normalized.currency, '');
  assert.equal(normalized.expirationDate, null);
  assert.equal(normalizeOffer({...offer(), fecha_expiracion: '2028-02-29'}).expirationDate, '2028-02-29');
});
test('categorías comparan mayúsculas y espacios exteriores sin crear alias', () => {
  assert.equal(key(' COMIDA '), key('Comida'));
  assert.notEqual(key('Electrónica'), key('Electronica'));
});
for (const shape of ['root', 'data', 'ofertas']) test(`carga formato ${shape}`, async () => {
  const payload = shape === 'root' ? [offer()] : {[shape]: [offer()]};
  const result = await loadOffers('http://catalog.test/api/offers', async () => response(payload));
  assert.equal(result.offers.length, 1);
});
test('carga todas las páginas y respeta tamaño efectivo, omitiendo registros incompletos', async () => {
  const calls = [];
  const result = await loadOffers('http://catalog.test/api/offers?locale=es', async (url) => {
    const parsed = new URL(url);
    calls.push(parsed);
    const page = Number(parsed.searchParams.get('pagination[page]'));
    return response({data: page === 1 ? [offer('uno'), {}] : [offer('dos')], meta: {pagination: {page, pageSize: 2, pageCount: 2, total: 3}}});
  });
  assert.equal(calls.length, 2);
  assert.equal(calls[0].searchParams.get('pagination[pageSize]'), '100');
  assert.equal(calls[1].searchParams.get('pagination[pageSize]'), '2');
  assert.equal(calls[1].searchParams.get('locale'), 'es');
  assert.deepEqual(result.offers.map(item => item.id), ['uno', 'dos']);
  assert.equal(result.omitted, 1);
});
test('deriva páginas desde total y tamaño de página', async () => {
  let calls = 0;
  const result = await loadOffers('http://catalog.test', async () => response({ofertas: [offer(String(++calls))], pagination: {total: 2, pageSize: 1}}));
  assert.equal(result.offers.length, 2);
});
test('fallo posterior rechaza catálogo completo, nunca devuelve página parcial', async () => {
  let calls = 0;
  await assert.rejects(loadOffers('http://catalog.test', async () => ++calls === 1 ? response({data: [offer()], meta: {pagination: {pageCount: 2}}}) : {ok: false, status: 503}), /HTTP 503/);
});
test('rechaza JSON malformado y estructuras que no representan catálogo', async () => {
  await assert.rejects(loadOffers('http://catalog.test', async () => response({unknown: []})), /Formato/);
  await assert.rejects(loadOffers('http://catalog.test', async () => ({ok: true, json: async () => {throw new SyntaxError('JSON');}})), /JSON/);
});
test('no oculta páginas vacías inesperadas ni metadatos inconsistentes', async () => {
  let calls = 0;
  await assert.rejects(loadOffers('http://catalog.test', async () => response({data: ++calls === 1 ? [offer()] : [], meta: {pagination: {pageCount: 2}}})), /catálogo cambió/);
  await assert.rejects(loadOffers('http://catalog.test', async () => response({data: [], meta: {pagination: {pageCount: -1}}})), /Paginación/);
});
test('distingue catálogo vacío de todos los registros omitidos', async () => {
  const empty = await loadOffers('http://catalog.test', async () => response([]));
  const invalid = await loadOffers('http://catalog.test', async () => response([{}]));
  assert.deepEqual(empty, {offers: [], omitted: 0});
  assert.deepEqual(invalid, {offers: [], omitted: 1});
});
test('tiempo límite aborta la consulta', async () => {
  await assert.rejects(loadOffers('http://catalog.test', async (_, {signal}) => new Promise((resolve, reject) => signal.addEventListener('abort', () => reject(new Error('abortado')))), 10), /abortado/);
});


test('normaliza imagen original plana y media Strapi v4 sin elegir miniaturas', () => {
  const media = {url: '/uploads/promo.png', formats: {thumbnail: {url: '/uploads/mini.png'}}};
  assert.equal(normalizeOffer({...offer(), imagen_promo: media}, 'http://strapi.test').promoImageUrl, 'http://strapi.test/uploads/promo.png');
  assert.equal(normalizeOffer({id: 9, attributes: {...offer(), imagen_promo: {data: {id: 4, attributes: media}}}}, 'https://strapi.test').promoImageUrl, 'https://strapi.test/uploads/promo.png');
  assert.equal(normalizeOffer({...offer(), imagen_promo: {url: 'https://cdn.test/promo.png'}}).promoImageUrl, 'https://cdn.test/promo.png');
});
test('imagen ausente, vacía o inválida conserva oferta para usar icono', () => {
  const invalid = [undefined, null, '', {}, {data: null}, {url: ' '}, {url: 12}, {url: 'http://['}, {url: 'javascript:alert(1)'}, {url: 'data:image/png;base64,AAA'}, {url: 'file:///tmp/promo.png'}, {url: 'https://user:password@cdn.test/image.png'}, [], {data: []}];
  for (const imagen_promo of invalid) {
    const normalized = normalizeOffer({...offer(), imagen_promo}, 'http://strapi.test');
    assert.equal(normalized.id, 'sintetica-1');
    assert.equal(normalized.promoImageUrl, '');
  }
});
test('cada página solicita imagen_promo y resuelve recursos en el origen de Strapi', async () => {
  const calls = [];
  const result = await loadOffers('https://strapi.test/api/offers?locale=es&status=published&pagination[start]=20&pagination[limit]=2', async (url) => {
    const parsed = new URL(url);
    calls.push(parsed);
    const page = Number(parsed.searchParams.get('pagination[page]'));
    const imagen_promo = page === 1 ? {url: '/uploads/uno.png'} : {data: {attributes: {url: 'uploads/dos.png'}}};
    return response({data: [{...offer(String(page)), imagen_promo}], meta: {pagination: {page, pageSize: 1, pageCount: 2}}});
  });
  for (const url of calls) {
    assert.equal(url.searchParams.get('populate[imagen_promo]'), 'true');
    assert.equal(url.searchParams.get('locale'), 'es');
    assert.equal(url.searchParams.get('status'), 'published');
    assert.equal(url.searchParams.has('pagination[start]'), false);
    assert.equal(url.searchParams.has('pagination[limit]'), false);
  }
  assert.deepEqual(result.offers.map(item => item.promoImageUrl), ['https://strapi.test/uploads/uno.png', 'https://strapi.test/uploads/dos.png']);
});
