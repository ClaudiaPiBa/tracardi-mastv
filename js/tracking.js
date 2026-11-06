'use strict';

const mastvTracking = (() => {
  const storageKey = 'mastv.visitor.v1';
  const text = (value) => typeof value === 'string' ? value.trim() : '';
  const object = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
  function hasError(value) {
    if (!object(value)) return false;
    if (value.accepted === false || value.success === false) return true;
    if (['error', 'rejected', 'failed', 'failure', 'denied'].includes(text(value.status).toLowerCase())) return true;
    for (const key of ['error', 'errors']) {
      const issue = value[key];
      if (Array.isArray(issue) ? issue.length > 0 : object(issue) ? Object.keys(issue).length > 0 : Boolean(issue)) return true;
    }
    return false;
  }
  function acceptedResponse(body) {
    return object(body) && Boolean(text(body.task)) && object(body.profile) && Boolean(text(body.profile.id)) && !hasError(body) && !hasError(body.response) && !hasError(body.profile);
  }
  function createSessionId() {
    if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    bytes[6] = (bytes[6] & 15) | 64;
    bytes[8] = (bytes[8] & 63) | 128;
    const hex = [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }
  function createTracker(options = {}) {
    const fetcher = options.fetcher ?? fetch;
    let storage = options.storage;
    if (storage === undefined) {
      try { storage = localStorage; } catch { storage = null; }
    }
    let saved = null;
    try {
      const value = JSON.parse(storage?.getItem(storageKey) ?? 'null');
      if (object(value) && text(value.sessionId) && (value.profileId === null || text(value.profileId))) saved = value;
    } catch { /* La visita continúa en memoria si el dato es ilegible. */ }
    let state = {sessionId: saved ? text(saved.sessionId) : (options.createSessionId ?? createSessionId)(), profileId: saved ? text(saved.profileId) || null : null};
    const listeners = new Set();
    let queue = Promise.resolve();
    function persist() {
      try { storage?.setItem(storageKey, JSON.stringify(state)); } catch { /* Conserva identidad en memoria. */ }
    }
    persist();
    async function transmit(events) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? 12000);
      try {
        const payload = {source: {id: options.trackingSource}, session: {id: state.sessionId}, profile: state.profileId ? {id: state.profileId} : null, events};
        const result = await fetcher(options.trackingApi, {method: 'POST', headers: {'Content-Type': 'application/json', Accept: 'application/json'}, body: JSON.stringify(payload), signal: controller.signal, credentials: 'omit'});
        if (!result.ok) return {accepted: false};
        const response = await result.json();
        if (!acceptedResponse(response)) return {accepted: false};
        const previousProfileId = state.profileId;
        state = {...state, profileId: text(response.profile.id)};
        persist();
        const notification = {response, previousProfileId, profileChanged: previousProfileId !== state.profileId, state: {...state}};
        listeners.forEach((listener) => {
          try { listener(notification); } catch { /* Un consumidor no cambia el resultado del registro. */ }
        });
        return {accepted: true, response};
      } catch {
        return {accepted: false};
      } finally {
        clearTimeout(timer);
      }
    }
    function send(events) {
      // La cola captura la identidad al enviar, después de recibir el perfil anterior.
      let snapshot;
      try {
        if (!Array.isArray(events) || events.length === 0 || events.some((event) => !text(event.type) || !object(event.properties))) return Promise.resolve({accepted: false});
        snapshot = JSON.parse(JSON.stringify(events));
      } catch {
        return Promise.resolve({accepted: false});
      }
      const pending = queue.then(() => transmit(snapshot));
      queue = pending.then(() => undefined, () => undefined);
      return pending;
    }
    return {
      send,
      getState: () => ({...state}),
      subscribe: (listener) => {listeners.add(listener); return () => listeners.delete(listener);}
    };
  }
  function filterEvent(category, now = new Date().toISOString()) {
    const normalized = text(category).toLocaleLowerCase('es');
    const mappings = new Map([['comida', 'comida-seg'], ['electronica', 'electronica-seg'], ['cine', 'cine-seg'], ['ropa', 'ropa-seg'], ['online', 'online-seg']]);
    const type = mappings.get(normalized) ?? 'category-filter';
    const properties = {category, filter_time: now};
    if (type !== 'category-filter') properties.action = 'category_filter';
    return {type, properties};
  }
  function offerProperties(offer) {
    return {
      id: offer.id, offer_id: offer.id, title: offer.name, category: offer.category,
      store: offer.brand || null, entidad_federativa: offer.location || null,
      price_original: offer.priceOriginal, price: offer.priceOffer, price_offer: offer.priceOffer,
      discount_percentage: offer.discountPercentage, coupon_code: offer.code || null,
      expiration_date: offer.expirationDate, offer_type: offer.offerType || null
    };
  }
  function openEvents(offer) {
    return ['offer-click', 'offer-view'].map((type) => ({type, properties: {...offerProperties(offer), action: 'offer_click'}}));
  }
  function redeemEvent(offer, now = new Date().toISOString()) {
    if (!offer.code) return null;
    return {type: 'offer-redeem', properties: {...offerProperties(offer), coupon: offer.code, action: 'offer_redeem', redeemed_at: now}};
  }
  return {storageKey, acceptedResponse, createTracker, filterEvent, openEvents, redeemEvent};
})();
if (typeof module !== 'undefined') module.exports = mastvTracking;
