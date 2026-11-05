'use strict';

const offers = [
  {id:'dominos',name:'Pizzas medianas',brand:'Dominos pizzas',logo:'img/dominos.svg',logoClass:'dominos',category:'Comida',location:'MX-CDMX',badge:'-39% DESCUENTO',subtitle:'Pizzas medianas',description:'2 Rebanadas con queso cheddar\n2 Porciones de papas fritas rusticas y 2 bebidas',discount:'-$20.00 mxn desc',code:'PIZZA1230'},
  {id:'cinemex',name:'Cinemex',brand:'Cinemex',logo:'img/cinemex.svg',logoClass:'cinemex',category:'Cine',location:'MX-CDMX',badge:'-39% DESCUENTO',subtitle:'50% de descuento en boletos 2D',description:'50% de descuento en películas y estrenos\n2x1 en películas infantiles',discount:'-50% desc',code:'CINEMEX1230'}
];
const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
const views = {home:$('#homeView'),catalog:$('#catalogView'),detail:$('#detailView')};
const modals = {location:$('#locationModal'),confirm:$('#confirmModal'),success:$('#successModal')};
let selectedOffer = offers[1];
let currentView = 'home';
let lastFocused = null;
let category = 'Todos';

function showView(name) {
  currentView=name;
  Object.entries(views).forEach(([key,el])=>el.hidden=key!==name);
  $('#bottomBar').hidden = name!=='catalog';
  $('#siteHeader').hidden = false;
  $('#siteMenu').hidden=true;
  $('#menuToggle').setAttribute('aria-expanded','false');
  window.scrollTo({top:0,behavior:'instant'});
}
function renderOffers() {
  const visible=offers.filter(o=>category==='Todos'||o.category===category);
  $('#offerList').replaceChildren(...visible.map(o=>{
    const article=document.createElement('article');article.className='offer-card';
    article.innerHTML=`<div class="offer-card__head"><div class="offer-card__logo offer-card__logo--${o.logoClass}" aria-label="${o.brand}"><img src="${o.logo}" alt="${o.brand}" loading="lazy"></div><div class="offer-card__heading"><h3>${o.name}</h3><p>${o.subtitle}</p></div></div><p class="offer-card__description"></p><div class="tag-row"><span class="tag">${o.category}</span><span class="tag tag--location">${o.location}</span><span class="tag tag--discount">${o.badge}</span></div><p class="offer-card__discount">${o.discount}</p><button class="offer-card__button" type="button">Ver beneficio</button>`;
    article.querySelector('.offer-card__description').textContent=o.description;
    article.querySelector('button').addEventListener('click',()=>openOffer(o.id));
    return article;
  }));
  $('#emptyState').hidden=visible.length>0;
  $('#bottomBarLabel').textContent=category;
}
function setFilter(newCategory) {
  category=newCategory;
  $$('.filter').forEach(btn=>{const active=btn.dataset.filter===category;btn.classList.toggle('is-active',active);btn.setAttribute('aria-pressed',String(active));});
  renderOffers();
}
function openOffer(id) {
  const offer=offers.find(o=>o.id===id);if(!offer)return;
  selectedOffer=offer;
  $('#detailTitle').textContent=offer.name;
  $('#detailSubtitle').textContent=offer.subtitle;
  $('#detailDescription').textContent=offer.description;
  $('#promoCode').textContent=offer.code;
  $('#detailDiscount').textContent=offer.discount;
  $('#copyFeedback').textContent='';
  showView('detail');
}
function openModal(name) {
  lastFocused=document.activeElement;
  modals[name].hidden=false;
  document.body.style.overflow='hidden';
  modals[name].querySelector('.dialog').focus();
}
function closeModal(name) {
  modals[name].hidden=true;
  if(Object.values(modals).every(el=>el.hidden))document.body.style.overflow='';
  if(lastFocused?.isConnected&&!lastFocused.closest('[hidden]'))lastFocused.focus();
}
function proceedFromLocation() {
  closeModal('location');showView('catalog');
}
$('#allowLocation').addEventListener('click',()=>{
  if(!navigator.geolocation){$('#locationStatus').textContent='La ubicación no está disponible en este navegador.';proceedFromLocation();return;}
  $('#allowLocation').disabled=true;
  $('#locationStatus').textContent='Solicitando permiso de ubicación…';
  navigator.geolocation.getCurrentPosition(
    ()=>proceedFromLocation(),
    ()=>proceedFromLocation(),
    {enableHighAccuracy:false,timeout:8000,maximumAge:300000}
  );
});
$('#declineLocation').addEventListener('click',()=>proceedFromLocation());
$('#closeLocation').addEventListener('click',()=>proceedFromLocation());
$('#backToCatalog').addEventListener('click',()=>showView('catalog'));
$('#redeemButton').addEventListener('click',()=>{
  $('#confirmOfferName').textContent=selectedOffer.name;
  $('#confirmOfferDescription').textContent=selectedOffer.subtitle;
  openModal('confirm');
});
$('#closeConfirm').addEventListener('click',()=>{closeModal('confirm');});
$('#cancelRedeem').addEventListener('click',()=>{closeModal('confirm');});
$('#confirmRedeem').addEventListener('click',()=>{
  closeModal('confirm');openModal('success');
});
$('#successDone').addEventListener('click',()=>{closeModal('success');showView('catalog')});
$('#copyCode').addEventListener('click',async()=>{
  try{await navigator.clipboard.writeText(selectedOffer.code);$('#copyFeedback').textContent='¡Código copiado!';}
  catch{ $('#copyFeedback').textContent='Selecciona y copia el código manualmente.';}
});
$('#menuToggle').addEventListener('click',()=>{const willOpen=$('#siteMenu').hidden;$('#siteMenu').hidden=!willOpen;$('#menuToggle').setAttribute('aria-expanded',String(willOpen));});
$$('[data-go]').forEach(btn=>btn.addEventListener('click',()=>showView(btn.dataset.go)));
$$('[data-offer]').forEach(btn=>btn.addEventListener('click',()=>openOffer(btn.dataset.offer)));
$$('[data-filter]').forEach(btn=>btn.addEventListener('click',()=>setFilter(btn.dataset.filter)));
// Impide que el foco salga de un diálogo abierto usando Tab.
document.addEventListener('keydown',(event)=>{
  const modal=Object.values(modals).find(el=>!el.hidden);if(!modal)return;
  if(event.key==='Escape'){event.preventDefault();if(modal===modals.location)proceedFromLocation();else if(modal===modals.confirm)closeModal('confirm');else {closeModal('success');showView('catalog');}return;}
  if(event.key!=='Tab')return;
  const focusable=[...modal.querySelectorAll('button:not(:disabled),a[href],input:not(:disabled),[tabindex="0"]')];if(!focusable.length)return;
  const first=focusable[0],last=focusable[focusable.length-1];
  if(event.shiftKey&&(document.activeElement===first||document.activeElement===modal.querySelector('.dialog'))){event.preventDefault();last.focus();}
  else if(!event.shiftKey&&(document.activeElement===last||document.activeElement===modal.querySelector('.dialog'))){event.preventDefault();first.focus();}
});
renderOffers();showView('home');openModal('location');
