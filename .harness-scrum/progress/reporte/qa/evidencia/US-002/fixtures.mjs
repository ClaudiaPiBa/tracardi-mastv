export function offer(id, categoria='Comida', extra={}) {
  return {id_offer:`QA-${id}`,id:`qa-row-${id}`,documentId:`qa-doc-${id}`,titulo:`QA beneficio ${id}`,establecimiento:'QA comercio sintético',descripcion:`QA descripción ${id}`,categoria,descuento_porcentaje:15,codigo_cupon:`QA-CUPON-${id}`,precio_original:200,precio_oferta:170,moneda:'MXN',fecha_expiracion:'2030-12-31',tipo_oferta:'descuento',...extra};
}
export const categories=['Comida','Electronica','Cine','Ropa','Online','Viajes'];
export const catalog=categories.map((c,i)=>offer(String(i+1),c));
export const regional=[offer('NACIONAL','Comida',{entidad_federativa:null}),offer('CMX','Comida',{entidad_federativa:'MX-CMX'}),offer('JAL','Comida',{entidad_federativa:'MX-JAL'}),offer('CINE-NACIONAL','Cine',{entidad_federativa:''}),offer('CINE-CMX','Cine',{entidad_federativa:' mx-cmx '}),offer('CINE-JAL','Cine',{entidad_federativa:'MX-JAL'})];
export const strapiPage=(data,page=1,pageCount=1)=>({data,meta:{pagination:{page,pageSize:100,pageCount,total:pageCount===1?data.length:101}}});
export const strapiAttributes=items=>({data:items.map(({id,documentId,...attributes})=>({id,documentId,attributes}))});
export const noCoupon=offer('SIN-CUPON','Comida',{codigo_cupon:null});
export const missingIdentity={titulo:'QA incompleta',categoria:'Comida'};
export const malformedEconomics=offer('OPTIONALS','Comida',{precio_original:null,precio_oferta:'invalid',moneda:null,descuento_porcentaje:null,fecha_expiracion:'invalid'});
export const interestExamples=[['ausente',undefined],['cero',0],['uno',1],['negativo',-1],['no numérico','invalid']];
export const regionResolution={address:{'ISO3166-2-lvl4':'MX-CMX',country:'QA país',country_code:'mx',state:'QA región'}};
// Acceptance response shape must match implementation contract + real collector semantics.
// Do not assume an HTTP200 response alone means the collector accepted an event.
export const syntheticProfileId='QA-SYNTHETIC-PROFILE';
