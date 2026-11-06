'use strict';

const tracker = mastvTracking.createTracker(window.MASTV_CONFIG);
const interestStore = mastvInterests.createInterests({profileId: tracker.getState().profileId});
const locationStore = mastvLocation.createLocation({...window.MASTV_CONFIG, ...tracker.getState(), tracker});
let offers = [];
const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
const views = {home: $('#homeView'), catalog: $('#catalogView'), detail: $('#detailView')};
const modals = {location: $('#locationModal'), confirm: $('#confirmModal'), success: $('#successModal')};
let selectedOffer = null;
let currentView = 'home';
let lastFocused = null;
let category = 'Todos';
let categoryKey = null;
let catalogState = 'loading';
let omittedOffers = 0;
let confirmationAction = null;
let pendingRedemption = null;

// Refresca el catálogo tras una respuesta aceptada sin generar interacciones.
tracker.subscribe(({response}) => {
  interestStore.applyProfile(response.profile);
  locationStore.setProfileId(response.profile.id);
  renderOffers();
});

function showView(name) {
  currentView = name;
  Object.entries(views).forEach(([key, el]) => el.hidden = key !== name);
  $('#bottomBar').hidden = name !== 'catalog';
  $('#siteHeader').hidden = false;
  $('#siteMenu').hidden = true;
  $('#menuToggle').setAttribute('aria-expanded', 'false');
  window.scrollTo({top: 0, behavior: 'instant'});
}
function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}
function discountLabel(offer) {
  return offer.discountPercentage === null ? '' : `${offer.discountPercentage}% de descuento`;
}
function priceLabel(value, currency) {
  const amount = new Intl.NumberFormat('es-MX', {maximumFractionDigits: 2}).format(value);
  return currency ? `${amount} ${currency}` : amount;
}
function renderCategories() {
  const categories = new Map();
  offers.forEach((offer) => {
    if (!categories.has(offer.categoryKey)) categories.set(offer.categoryKey, offer.category);
  });
  if (categoryKey !== null && !categories.has(categoryKey)) {
    categoryKey = null;
    category = 'Todos';
  }
  const options = [[null, 'Todos'], ...categories];
  $('#categoryFilters').replaceChildren(...options.map(([key, label]) => {
    const button = element('button', 'filter', label);
    button.type = 'button';
    button.dataset.filter = label;
    button.dataset.categoryKey = key ?? '';
    const active = key === categoryKey;
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-pressed', String(active));
    button.addEventListener('click', () => {
      setFilter(label, key);
      tracker.send([mastvTracking.filterEvent(label)]);
    });
    return button;
  }));
}
function renderOffers() {
  const ready = catalogState === 'ready';
  const visible = ready ? interestStore.selectOffers(locationStore.filterOffers(offers), categoryKey) : [];
  $('#offerList').setAttribute('aria-busy', String(catalogState === 'loading'));
  $('#catalogStatus').textContent = catalogState === 'loading' ? 'Cargando ofertas…' : catalogState === 'error' ? 'No se pudieron cargar las ofertas. Vuelve a intentarlo.' : '';
  $('#retryCatalog').hidden = catalogState !== 'error';
  $('#catalogWarning').hidden = !ready || omittedOffers === 0;
  $('#offerList').replaceChildren(...visible.map((offer) => {
    const article = element('article', 'offer-card');
    const head = element('div', 'offer-card__head');
    const icon = element('div', 'offer-card__logo offer-card__logo--generic', ({comida: '🍽️', cine: '🎟️', ropa: '👕'})[offer.categoryKey] ?? '🎁');
    icon.setAttribute('aria-hidden', 'true');
    const heading = element('div', 'offer-card__heading');
    heading.append(element('h3', '', offer.name), element('p', '', offer.brand || 'Comercio no disponible'));
    head.append(icon, heading);
    const tags = element('div', 'tag-row');
    tags.append(element('span', 'tag', offer.category));
    if (offer.location) tags.append(element('span', 'tag tag--location', offer.location));
    if (discountLabel(offer)) tags.append(element('span', 'tag tag--discount', discountLabel(offer)));
    const button = element('button', 'offer-card__button', 'Ver beneficio');
    button.type = 'button';
    button.addEventListener('click', () => openOffer(offer.id));
    article.append(head, element('p', 'offer-card__description', offer.description || 'Descripción no disponible'), tags);
    if (discountLabel(offer)) article.append(element('p', 'offer-card__discount', discountLabel(offer)));
    article.append(button);
    return article;
  }));
  $('#emptyState').hidden = !ready || visible.length > 0;
  $('#emptyState').textContent = omittedOffers > 0 && offers.length === 0 ? 'No hay promociones utilizables disponibles.' : offers.length === 0 ? 'No hay promociones disponibles.' : categoryKey === null ? 'Todavía no hay recomendaciones personalizadas. Explora las categorías disponibles para descubrir beneficios.' : 'No hay promociones en esta categoría por ahora.';
  $('#bottomBarLabel').textContent = category;
}
function setFilter(newCategory, key = mastvCatalog.key(newCategory)) {
  category = newCategory;
  categoryKey = key;
  $$('.filter').forEach((button) => {
    const active = button.dataset.categoryKey === (categoryKey ?? '');
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-pressed', String(active));
  });
  renderOffers();
}
async function loadCatalog() {
  if (catalogState === 'loading' && $('#offerList').getAttribute('aria-busy') === 'true') return;
  catalogState = 'loading';
  offers = [];
  omittedOffers = 0;
  renderCategories();
  renderOffers();
  try {
    const result = await mastvCatalog.loadOffers(window.MASTV_CONFIG.offersApi);
    offers = result.offers;
    omittedOffers = result.omitted;
    catalogState = 'ready';
  } catch {
    catalogState = 'error';
  }
  renderCategories();
  renderOffers();
}
function openOffer(id) {
  const offer = offers.find((item) => item.id === id);
  if (!offer) return;
  selectedOffer = offer;
  $('#detailTitle').textContent = offer.name;
  $('#detailSubtitle').textContent = offer.brand || 'Comercio no disponible';
  $('#detailDescription').textContent = offer.description || 'Descripción no disponible';
  $('#promoCode').textContent = offer.code || 'Cupón no disponible';
  $('#copyCode').disabled = !offer.code;
  $('#redeemButton').disabled = !offer.code || Boolean(pendingRedemption);
  $('#redemptionFeedback').textContent = pendingRedemption ? 'Hay una confirmación en proceso.' : '';
  $('#detailDiscount').textContent = discountLabel(offer);
  $('#detailDiscountSection').hidden = !discountLabel(offer);
  const conditions = [['Categoría', offer.category], ['Cobertura', offer.location]];
  if (offer.priceOriginal !== null) conditions.push(['Precio original', priceLabel(offer.priceOriginal, offer.currency)]);
  if (offer.priceOffer !== null) conditions.push(['Precio de oferta', priceLabel(offer.priceOffer, offer.currency)]);
  if (offer.currency) conditions.push(['Moneda', offer.currency]);
  if (offer.expirationDate) conditions.push(['Vencimiento', offer.expirationDate.slice(0, 10)]);
  if (offer.offerType) conditions.push(['Tipo de oferta', offer.offerType]);
  $('#detailConditions').replaceChildren(...conditions.filter(([, value]) => value).flatMap(([label, value]) => [element('dt', '', label), element('dd', '', value)]));
  $('#copyFeedback').textContent = '';
  showView('detail');
  tracker.send(mastvTracking.openEvents(offer));
}
function openModal(name) {
  lastFocused=document.activeElement;
  modals[name].hidden=false;
  document.body.style.overflow='hidden';
  modals[name].querySelector('.dialog').focus();
}
function closeModal(name) {
  if (name === 'confirm') confirmationAction = null;
  modals[name].hidden=true;
  if(Object.values(modals).every(el=>el.hidden))document.body.style.overflow='';
  if(lastFocused?.isConnected&&!lastFocused.closest('[hidden]'))lastFocused.focus();
}
function renderLocation() {
  const state = locationStore.getState();
  $('#regionStatus').textContent = state.region ? `Región activa: ${state.region.isoRegion}` : 'Sin región activa. Puedes explorar ofertas de todas las regiones.';
  $('#locationFeedback').textContent = state.message;
  $('#locationStatus').textContent = state.message;
  $('#allowLocation').disabled = ['locating', 'resolving', 'syncing'].includes(state.status);
}
function proceedFromLocation() {
  closeModal('location');
  showView('catalog');
}
function declineLocation() {
  locationStore.decline();
  proceedFromLocation();
}
locationStore.subscribe((state) => {
  renderLocation();
  renderOffers();
  if (['syncing', 'ready', 'sync-error', 'error'].includes(state.status) && !modals.location.hidden) proceedFromLocation();
});
$('#changeLocation').addEventListener('click', () => {
  locationStore.prepareDecision();
  openModal('location');
});
$('#allowLocation').addEventListener('click', () => locationStore.allow());
$('#declineLocation').addEventListener('click', declineLocation);
$('#closeLocation').addEventListener('click', declineLocation);
$('#backToCatalog').addEventListener('click',()=>showView('catalog'));
$('#redeemButton').addEventListener('click', () => {
  if (!selectedOffer?.code || pendingRedemption) return;
  confirmationAction = {offer: selectedOffer};
  $('#confirmOfferName').textContent = selectedOffer.name;
  $('#confirmOfferDescription').textContent = selectedOffer.description || 'Descripción no disponible';
  $('#confirmStatus').textContent = '';
  $('#confirmRedeem').disabled = false;
  openModal('confirm');
});
$('#closeConfirm').addEventListener('click', () => closeModal('confirm'));
$('#cancelRedeem').addEventListener('click', () => closeModal('confirm'));
$('#confirmRedeem').addEventListener('click', async () => {
  const action = confirmationAction;
  if (!action?.offer.code || pendingRedemption) return;
  pendingRedemption = action;
  $('#confirmRedeem').disabled = true;
  $('#redeemButton').disabled = true;
  $('#confirmStatus').textContent = 'Registrando confirmación…';
  $('#redemptionFeedback').textContent = 'Registrando confirmación…';
  const result = await tracker.send([mastvTracking.redeemEvent(action.offer)]);
  pendingRedemption = null;
  $('#confirmRedeem').disabled = false;
  $('#redeemButton').disabled = !selectedOffer?.code;
  const message = result.accepted ? 'Tu confirmación de canje se registró. El comercio deberá validar el beneficio.' : 'No pudo confirmarse el registro. Puedes continuar consultando el beneficio.';
  $('#redemptionFeedback').textContent = selectedOffer === action.offer ? message : '';
  // Una respuesta tardía no debe interrumpir una vista o confirmación distinta.
  if (confirmationAction !== action || modals.confirm.hidden) return;
  $('#confirmStatus').textContent = message;
  if (result.accepted) {
    closeModal('confirm');
    openModal('success');
  }
});
$('#successDone').addEventListener('click',()=>{closeModal('success');showView('catalog')});
$('#copyCode').addEventListener('click',async()=>{
  if (!selectedOffer?.code) return;
  const offer = selectedOffer;
  try{await navigator.clipboard.writeText(offer.code);if (selectedOffer === offer) $('#copyFeedback').textContent='¡Código copiado!';}
  catch{ if (selectedOffer === offer) $('#copyFeedback').textContent='Selecciona y copia el código manualmente.';}
});
$('#menuToggle').addEventListener('click',()=>{const willOpen=$('#siteMenu').hidden;$('#siteMenu').hidden=!willOpen;$('#menuToggle').setAttribute('aria-expanded',String(willOpen));});
$$('[data-go]').forEach(btn=>btn.addEventListener('click',()=>showView(btn.dataset.go)));
$('#retryCatalog').addEventListener('click', loadCatalog);
// Impide que el foco salga de un diálogo abierto usando Tab.
document.addEventListener('keydown',(event)=>{
  const modal=Object.values(modals).find(el=>!el.hidden);if(!modal)return;
  if(event.key==='Escape'){event.preventDefault();if(modal===modals.location)declineLocation();else if(modal===modals.confirm)closeModal('confirm');else {closeModal('success');showView('catalog');}return;}
  if(event.key!=='Tab')return;
  const focusable=[...modal.querySelectorAll('button:not(:disabled),a[href],input:not(:disabled),[tabindex="0"]')];if(!focusable.length)return;
  const first=focusable[0],last=focusable[focusable.length-1];
  if(event.shiftKey&&(document.activeElement===first||document.activeElement===modal.querySelector('.dialog'))){event.preventDefault();last.focus();}
  else if(!event.shiftKey&&(document.activeElement===last||document.activeElement===modal.querySelector('.dialog'))){event.preventDefault();first.focus();}
});
showView('home');
renderLocation();
if (!locationStore.getState().region) openModal('location');
loadCatalog();
