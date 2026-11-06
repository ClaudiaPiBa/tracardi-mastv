'use strict';

const mastvInterests = (() => {
  const storageKey = 'mastv.interests.v1';
  const text = (value) => typeof value === 'string' ? value.trim() : '';
  const key = (value) => text(value).toLocaleLowerCase('es');
  const object = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
  function score(value) {
    if (typeof value !== 'number' && (typeof value !== 'string' || !value.trim())) return 0;
    const number = Number(value);
    return Number.isFinite(number) ? number : 0;
  }
  function normalizeMap(value) {
    if (!object(value)) return null;
    const entries = new Map();
    Object.entries(value).forEach(([category, weight]) => {
      const categoryKey = key(category);
      if (categoryKey && !entries.has(categoryKey)) entries.set(categoryKey, score(weight));
    });
    return Object.fromEntries(entries);
  }
  function selectOffers(offers, interests, categoryKey = null) {
    if (categoryKey !== null) return offers.filter((offer) => key(offer.category) === key(categoryKey));
    const weights = normalizeMap(interests) ?? {};
    return offers.map((offer, index) => ({offer, index, weight: Object.hasOwn(weights, key(offer.category)) ? weights[key(offer.category)] : 0}))
      .filter((item) => item.weight > 1)
      .sort((a, b) => b.weight - a.weight || a.index - b.index)
      .map((item) => item.offer);
  }
  function createInterests(options = {}) {
    let storage = options.storage;
    if (storage === undefined) {
      try { storage = localStorage; } catch { storage = null; }
    }
    let profileId = text(options.profileId) || null;
    let interests = {};
    try {
      const saved = JSON.parse(storage?.getItem(storageKey) ?? 'null');
      if (profileId && object(saved) && text(saved.profileId) === profileId) interests = normalizeMap(saved.interests) ?? {};
    } catch { /* Datos corruptos no impiden explorar categorías. */ }
    function persist() {
      try { storage?.setItem(storageKey, JSON.stringify({profileId, interests})); } catch { /* Se mantiene en memoria durante la visita. */ }
    }
    function applyProfile(profile) {
      if (!object(profile) || !text(profile.id)) return false;
      const nextId = text(profile.id);
      if (nextId !== profileId) interests = {};
      profileId = nextId;
      if (Object.hasOwn(profile, 'interests')) {
        const next = normalizeMap(profile.interests);
        if (next !== null) interests = next;
      }
      persist();
      return true;
    }
    return {
      applyProfile,
      getState: () => ({profileId, interests: {...interests}}),
      selectOffers: (offers, categoryKey = null) => selectOffers(offers, interests, categoryKey)
    };
  }
  return {storageKey, score, normalizeMap, selectOffers, createInterests};
})();
if (typeof module !== 'undefined') module.exports = mastvInterests;
