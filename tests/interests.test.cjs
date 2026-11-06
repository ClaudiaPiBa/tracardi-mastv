'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const interests = require('../js/interests.js');
const catalog = [{id:'cine-1',category:'Cine'},{id:'comida-1',category:' Comida '},{id:'ropa-1',category:'Ropa'},{id:'comida-2',category:'comida'},{id:'viajes-1',category:'Viajes'}];
const ids = offers => offers.map(offer=>offer.id);
const memoryStorage = () => {const entries=new Map();return {getItem:key=>entries.get(key)??null,setItem:(key,value)=>entries.set(key,value)};};
const make = options => interests.createInterests({profileId:'perfil-QA',storage:null,...options});

test('Todos excluye pesos insuficientes y ordena afinidad descendente con empate estable',()=>{
  assert.deepEqual(ids(interests.selectOffers(catalog,{Comida:4,Cine:2,Ropa:1})),['comida-1','comida-2','cine-1']);
  assert.deepEqual(ids(interests.selectOffers(catalog,{Comida:2,Cine:2})),['cine-1','comida-1','comida-2']);
  assert.equal(catalog[0].id,'cine-1');
});
test('ausencia, cero, uno, negativos, texto inválido y no finitos no recomiendan',()=>{
  for(const value of [undefined,0,1,-2,'abc',Infinity,-Infinity,NaN,null,true,{},[],''])assert.deepEqual(interests.selectOffers(catalog,{Cine:value}),[]);
  assert.deepEqual(interests.selectOffers(catalog,{}),[]);
});
test('compara categoría e interés sin mayúsculas ni espacios exteriores y acepta números de texto',()=>{
  assert.deepEqual(ids(interests.selectOffers(catalog,{' COMIDA ':'4.5',cine:' 2 '})),['comida-1','comida-2','cine-1']);
  assert.equal(interests.score('2foo'),0);
});
test('categoría explícita muestra ofertas sin restricción por afinidad',()=>{
  assert.deepEqual(ids(interests.selectOffers(catalog,{},' CINE ')),['cine-1']);
  assert.deepEqual(ids(interests.selectOffers(catalog,{Cine:100},'comida')),['comida-1','comida-2']);
});
test('mapas nuevos reemplazan completo y un mapa vacío elimina recomendaciones',()=>{
  const store=make();
  store.applyProfile({id:'perfil-QA',interests:{Comida:5,Cine:2}});
  store.applyProfile({id:'perfil-QA',interests:{Cine:3}});
  assert.deepEqual(ids(store.selectOffers(catalog)),['cine-1']);
  store.applyProfile({id:'perfil-QA',interests:{}});
  assert.deepEqual(store.selectOffers(catalog),[]);
});
test('campo ausente o mapa malformado conserva último mapa válido del mismo perfil',()=>{
  const store=make();store.applyProfile({id:'perfil-QA',interests:{Cine:3}});
  for(const profile of [{id:'perfil-QA'},...['incorrecto',null,[],42].map(value=>({id:'perfil-QA',interests:value}))]){
    store.applyProfile(profile);assert.deepEqual(ids(store.selectOffers(catalog)),['cine-1']);
  }
});
test('cambiar perfil invalida intereses anteriores si no aporta un nuevo mapa válido',()=>{
  const store=make();store.applyProfile({id:'perfil-QA',interests:{Cine:3}});
  store.applyProfile({id:'otro-perfil'});
  assert.deepEqual(store.getState(),{profileId:'otro-perfil',interests:{}});
  store.applyProfile({id:'tercer-perfil',interests:{Comida:4}});
  assert.deepEqual(ids(store.selectOffers(catalog)),['comida-1','comida-2']);
  store.applyProfile({id:'cuarto-perfil',interests:null});
  assert.deepEqual(store.selectOffers(catalog),[]);
});
test('restaura intereses únicamente para el perfil MASTV conocido',()=>{
  const storage=memoryStorage();const first=make({storage});
  first.applyProfile({id:'perfil-QA',interests:{Cine:3}});
  assert.deepEqual(ids(make({storage}).selectOffers(catalog)),['cine-1']);
  assert.deepEqual(make({storage,profileId:'otro-perfil'}).selectOffers(catalog),[]);
  assert.deepEqual(make({storage,profileId:null}).selectOffers(catalog),[]);
});
test('persistencia corrupta se ignora sin impedir categoría explícita',()=>{
  for(const raw of ['{malformado',JSON.stringify({profileId:'perfil-QA',interests:[]}),JSON.stringify({profileId:'perfil-QA',interests:null})]){
    const store=make({storage:{getItem:()=>raw,setItem(){}}});
    assert.deepEqual(store.selectOffers(catalog),[]);
    assert.deepEqual(ids(store.selectOffers(catalog,'Cine')),['cine-1']);
  }
});
test('storage denegado mantiene recomendaciones y cambio de perfil en memoria',()=>{
  const store=make({storage:{getItem(){throw Error('denegado');},setItem(){throw Error('denegado');}}});
  store.applyProfile({id:'perfil-QA',interests:{Comida:4}});
  assert.deepEqual(ids(store.selectOffers(catalog)),['comida-1','comida-2']);
  store.applyProfile({id:'otro-perfil',interests:{Cine:2}});
  assert.deepEqual(ids(store.selectOffers(catalog)),['cine-1']);
});
test('mapas públicos son copias y claves especiales no heredan afinidades',()=>{
  const store=make();store.applyProfile({id:'perfil-QA',interests:{Cine:3}});
  store.getState().interests.cine=100;
  assert.equal(store.getState().interests.cine,3);
  assert.deepEqual(interests.selectOffers([{id:'especial',category:'constructor'}],{}),[]);
  const map=interests.normalizeMap(JSON.parse('{"__proto__":3}'));
  assert.deepEqual(ids(interests.selectOffers([{id:'especial',category:'__proto__'}],map)),['especial']);
});
