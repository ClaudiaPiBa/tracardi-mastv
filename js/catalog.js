'use strict';

// Contrato compartido por la interfaz y las comprobaciones sin navegador.
const mastvCatalog = (() => {
  const text = (value) => typeof value === 'string' ? value.trim() : '';
  const key = (value) => text(value).toLocaleLowerCase('es');
  const identity = (value) => typeof value === 'number' && Number.isFinite(value) ? String(value) : text(value);
  function number(value, max = Infinity) {
    if (typeof value !== 'number' && (typeof value !== 'string' || !value.trim())) return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed >= 0 && parsed <= max ? parsed : null;
  }
  function validDate(value) {
    const raw = text(value);
    if (!/^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2}))?$/.test(raw)) return null;
    const date = new Date(raw);
    const day = new Date(`${raw.slice(0, 10)}T00:00:00Z`);
    return Number.isFinite(date.getTime()) && Number.isFinite(day.getTime()) && day.toISOString().slice(0, 10) === raw.slice(0, 10) ? raw : null;
  }
  function normalizeOffer(item) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return null;
    const fields = {...item, ...(item.attributes && typeof item.attributes === 'object' && !Array.isArray(item.attributes) ? item.attributes : {})};
    const id = [fields.id_offer, fields.documentId, fields.id].map(identity).find(Boolean);
    const name = text(fields.titulo);
    const category = text(fields.categoria);
    if (!id || !name || !category) return null;
    const currency = text(fields.moneda).toUpperCase();
    const currencies = typeof Intl.supportedValuesOf === 'function' ? Intl.supportedValuesOf('currency') : null;
    return {
      id, name, category, categoryKey: key(category),
      strapiId: item.id ?? fields.id ?? null,
      documentId: fields.documentId ?? null,
      idOffer: fields.id_offer ?? null,
      brand: text(fields.establecimiento),
      description: text(fields.descripcion),
      location: text(fields.entidad_federativa),
      discountPercentage: number(fields.descuento_porcentaje, 100),
      priceOriginal: number(fields.precio_original),
      priceOffer: number(fields.precio_oferta),
      currency: /^[A-Z]{3}$/.test(currency) && (!currencies || currencies.includes(currency)) ? currency : '',
      expirationDate: validDate(fields.fecha_expiracion),
      offerType: text(fields.tipo_oferta),
      code: text(fields.codigo_cupon)
    };
  }
  function unpack(payload) {
    const rows = Array.isArray(payload) ? payload : payload?.data ?? payload?.ofertas;
    if (!Array.isArray(rows)) throw new Error('Formato de catálogo no válido');
    return {rows, pagination: payload?.meta?.pagination ?? payload?.pagination ?? null};
  }
  function pageCount(pagination, pageSize) {
    if (!pagination) return 1;
    if (pagination.pageCount !== undefined) {
      if (!Number.isSafeInteger(pagination.pageCount) || pagination.pageCount < 0) throw new Error('Paginación no válida');
      return Math.max(1, pagination.pageCount);
    }
    if (pagination.total !== undefined) {
      const size = pagination.pageSize ?? pagination.limit ?? pageSize;
      if (!Number.isSafeInteger(pagination.total) || pagination.total < 0 || !Number.isSafeInteger(size) || size <= 0) throw new Error('Paginación no válida');
      return Math.max(1, Math.ceil(pagination.total / size));
    }
    throw new Error('Paginación incompleta');
  }
  async function loadOffers(endpoint, fetcher = fetch, timeoutMs = 12000) {
    const base = new URL(endpoint, typeof location === 'undefined' ? 'http://localhost' : location.href);
    if (!['http:', 'https:'].includes(base.protocol)) throw new Error('URL del catálogo no válida');
    base.searchParams.delete('pagination[start]');
    base.searchParams.delete('pagination[limit]');
    base.searchParams.set('pagination[pageSize]', '100');
    const rows = [];
    let pages = 1;
    for (let page = 1; page <= pages; page += 1) {
      const url = new URL(base);
      url.searchParams.set('pagination[page]', String(page));
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const response = await fetcher(url.toString(), {headers: {Accept: 'application/json'}, signal: controller.signal, credentials: 'omit'});
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const result = unpack(await response.json());
        const count = pageCount(result.pagination, 100);
        if (page === 1) {
          pages = count;
          // Respeta el tamaño efectivo aplicado por Strapi para páginas siguientes.
          const size = result.pagination?.pageSize ?? result.pagination?.limit;
          if (size !== undefined) {
            if (!Number.isSafeInteger(size) || size <= 0) throw new Error('Tamaño de página no válido');
            base.searchParams.set('pagination[pageSize]', String(size));
          }
        } else if (count !== pages || result.rows.length === 0) {
          throw new Error('El catálogo cambió durante la carga; vuelve a intentar');
        }
        if (result.pagination?.page !== undefined && result.pagination.page !== page) throw new Error('Página inesperada');
        rows.push(...result.rows);
      } finally {
        clearTimeout(timer);
      }
    }
    let omitted = 0;
    const byId = new Map();
    rows.forEach((item) => {
      const offer = normalizeOffer(item);
      if (!offer) omitted += 1;
      else if (!byId.has(offer.id)) byId.set(offer.id, offer);
    });
    return {offers: [...byId.values()], omitted};
  }
  return {key, normalizeOffer, loadOffers};
})();
if (typeof module !== 'undefined') module.exports = mastvCatalog;
