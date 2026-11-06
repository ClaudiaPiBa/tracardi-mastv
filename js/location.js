'use strict';

const mastvLocation = (() => {
  const storageKey = 'mastv.location.v1';
  const text = (value) => typeof value === 'string' ? value.trim() : '';
  const object = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
  function normalizeRegion(value) {
    const region = text(value).toUpperCase();
    return /^[A-Z]{2}-[A-Z0-9]{1,3}$/.test(region) ? region : '';
  }
  function regionFromAddress(address) {
    if (!object(address)) return null;
    const isoRegion = ['ISO3166-2-lvl4', 'ISO3166-2-lvl3', 'ISO3166-2-lvl6'].map((field) => normalizeRegion(address[field])).find(Boolean);
    if (!isoRegion) return null;
    return {isoRegion, country: text(address.country), countryCode: /^[a-z]{2}$/i.test(text(address.country_code)) ? text(address.country_code).toLowerCase() : '', state: text(address.state)};
  }
  function filterOffers(offers, region) {
    const active = normalizeRegion(region);
    if (!active) return offers.slice();
    return offers.filter((offer) => !text(offer.location) || text(offer.location).toUpperCase() === active);
  }
  function locationEvent(region) {
    return {type: 'geo-location', properties: {
      iso_region: region.isoRegion, 'ISO3166-2-lvl4': region.isoRegion,
      country: region.country, country_code: region.countryCode, state: region.state,
      action: 'geo_consent_granted', consented_at: region.consentedAt
    }};
  }
  function createLocation(options = {}) {
    let storage = options.storage;
    if (storage === undefined) {
      try { storage = localStorage; } catch { storage = null; }
    }
    const sessionId = text(options.sessionId);
    let profileId = text(options.profileId) || null;
    let region = null;
    try {
      const saved = JSON.parse(storage?.getItem(storageKey) ?? 'null');
      if (sessionId && object(saved) && saved.sessionId === sessionId && object(saved.region)) {
        const savedRegion = regionFromAddress({'ISO3166-2-lvl4': saved.region.isoRegion, country: saved.region.country, country_code: saved.region.countryCode, state: saved.region.state});
        if (savedRegion && text(saved.region.consentedAt) && Number.isFinite(Date.parse(saved.region.consentedAt))) region = {...savedRegion, consentedAt: saved.region.consentedAt};
      }
    } catch { /* Datos corruptos no impiden explorar. */ }
    const fetcher = options.fetcher ?? fetch;
    const geolocation = options.geolocation === undefined ? globalThis.navigator?.geolocation : options.geolocation;
    const clock = options.clock ?? Date.now;
    const wait = options.wait ?? ((duration) => new Promise((resolve) => setTimeout(resolve, duration)));
    const listeners = new Set();
    let status = 'idle';
    let message = '';
    let version = 0;
    let activeController = null;
    let lastRequestAt = -Infinity;
    function getState() { return {region: region ? {...region} : null, status, message}; }
    function publish(nextStatus, nextMessage) {
      status = nextStatus;
      message = nextMessage;
      listeners.forEach((listener) => { try { listener(getState()); } catch { /* La UI no altera la decisión. */ } });
    }
    function persist() {
      try {
        if (region) storage?.setItem(storageKey, JSON.stringify({sessionId, profileId, region}));
        else storage?.removeItem(storageKey);
      } catch { /* Conserva la región consentida solo en memoria. */ }
    }
    function cancel() {
      version += 1;
      activeController?.abort();
      activeController = null;
    }
    function prepareDecision() {
      cancel();
      publish('idle', '');
    }
    function decline() {
      cancel();
      region = null;
      persist();
      publish('declined', 'Puedes explorar todas las regiones sin compartir tu ubicación.');
    }
    async function allow() {
      if (['locating', 'resolving', 'syncing'].includes(status)) return {ignored: true};
      const operation = ++version;
      const consentedAt = new Date(clock()).toISOString();
      const controller = new AbortController();
      activeController = controller;
      const current = () => operation === version;
      publish('locating', 'Solicitando permiso de ubicación…');
      try {
        if (!geolocation || typeof geolocation.getCurrentPosition !== 'function') throw new Error('La ubicación no está disponible en este navegador.');
        const position = await new Promise((resolve, reject) => geolocation.getCurrentPosition(resolve, (error) => {
          const reason = error?.code === 1 ? 'El navegador no concedió permiso de ubicación.' : error?.code === 3 ? 'Se agotó el tiempo para obtener la ubicación.' : 'No se pudo obtener la ubicación.';
          reject(new Error(reason));
        }, {enableHighAccuracy: false, timeout: 8000, maximumAge: 300000}));
        if (!current()) return {cancelled: true};
        const latitude = position?.coords?.latitude;
        const longitude = position?.coords?.longitude;
        if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) throw new Error('No se pudo obtener la ubicación.');
        publish('resolving', 'Determinando tu región…');
        const gap = 1000 - (clock() - lastRequestAt);
        if (gap > 0) await wait(gap);
        if (!current()) return {cancelled: true};
        const url = new URL(options.geocodingApi);
        if (!['http:', 'https:'].includes(url.protocol)) throw new Error('No se pudo consultar el servicio de ubicación.');
        url.searchParams.set('format', 'jsonv2');
        url.searchParams.set('addressdetails', '1');
        url.searchParams.set('lat', String(latitude));
        url.searchParams.set('lon', String(longitude));
        let resolved;
        const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? 12000);
        try {
          lastRequestAt = clock();
          const response = await fetcher(url.toString(), {headers: {Accept: 'application/json'}, credentials: 'omit', cache: 'no-store', referrerPolicy: 'origin', signal: controller.signal});
          if (!response.ok) throw new Error();
          resolved = regionFromAddress((await response.json())?.address);
        } catch {
          throw new Error('No se pudo consultar el servicio de ubicación.');
        } finally {
          clearTimeout(timer);
        }
        if (!current()) return {cancelled: true};
        if (!resolved) throw new Error('El servicio no devolvió una región válida.');
        region = {...resolved, consentedAt};
        persist();
        publish('syncing', `Región ${region.isoRegion} aplicada. Sincronizando…`);
        let result;
        try { result = await options.tracker.send([locationEvent(region)]); } catch { result = {accepted: false}; }
        if (!current()) return {cancelled: true};
        publish(result?.accepted ? 'ready' : 'sync-error', result?.accepted ? `Región ${region.isoRegion} aplicada.` : `Región ${region.isoRegion} aplicada. No pudo confirmarse la sincronización de ubicación.`);
        return {accepted: Boolean(result?.accepted), region: {...region}};
      } catch (error) {
        if (!current()) return {cancelled: true};
        const reason = error instanceof Error ? error.message : 'No se pudo determinar la región.';
        publish('error', region ? `No pudo actualizarse la ubicación; se conserva ${region.isoRegion}. ${reason}` : `${reason} Puedes explorar sin exclusión regional.`);
        return {accepted: false, region: region ? {...region} : null};
      } finally {
        if (current()) activeController = null;
      }
    }
    return {
      getState, prepareDecision, allow, decline,
      setProfileId: (value) => {profileId = text(value) || null; if (region) persist();},
      filterOffers: (offers) => filterOffers(offers, region?.isoRegion),
      subscribe: (listener) => {listeners.add(listener); return () => listeners.delete(listener);}
    };
  }
  return {storageKey, normalizeRegion, regionFromAddress, filterOffers, locationEvent, createLocation};
})();
if (typeof module !== 'undefined') module.exports = mastvLocation;
