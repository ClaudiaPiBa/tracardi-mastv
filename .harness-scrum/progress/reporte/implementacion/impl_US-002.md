# Implementación: US-002

**Fecha:** 2026-11-05
**Estado:** Completada
**Proyecto:** MASTV — Catálogo de ofertas @ /home/swumplurd/Documentos/devsarrollo/repos/tracardi-mastv
**Stack:** HTML/CSS/JavaScript / sin framework / sin gestor de paquetes

Implementación terminada para QA independiente; no equivale a aceptación de la historia. Gate 1 revisión1 aprobado según entrada del coordinador. Se preserva la corrección de diálogos de US-001 validada por QA revisión2.

## Archivos modificados
- `js/tracking.js` — módulo sin dependencias: eventos, cola, almacenamiento propio, timeout, aceptación semántica, perfil y suscripciones.
- `tests/tracking.test.cjs` — once pruebas sintéticas de contrato, identidad, errores y generación de eventos.
- `js/config.js` — `trackingApi` y `trackingSource` públicos y configurables junto con Strapi.
- `js/app.js` — eventos al seleccionar filtro y abrir detalle; confirmación explícita asíncrona, guardas de acción, mensajes y refresco de catálogo tras respuesta aceptada sin emitir nuevas interacciones.
- `index.html` — carga del módulo y mensajes accesibles en detalle/confirmación; éxito con texto de confirmación registrada, sin validación comercial.
- `css/styles.css` — texto de estado de tracking; conserva altura máxima y desplazamiento de diálogos de US-001.
- `README.md` — configuración, identidad, CORS, aceptación, límites de registro y pruebas.

## Decisiones técnicas
- Cadena de UI: detalle existente → acción Canjear → diálogo título/resumen → estado de registro → Confirmar/Cancelar; al aceptar → éxito. Los mensajes se insertan en el flujo existente del diálogo desplazable, sin coordenadas absolutas nuevas.
- Configuración en un único archivo público: `trackingApi=http://localhost:8686/track`, `trackingSource=demo-source`. No se copiaron claves administrativas ni componentes de inspector/métricas/workflows de la demo.
- Payload `source.id`, `session.id`, perfil conocido o null, lista de eventos. `offer-click` y `offer-view` viajan juntos en una petición, una vez cada uno por apertura efectiva. Render y copia no envían eventos.
- Categorías Comida/Electronica/Cine/Ropa/Online usan segmentación; Todos y desconocidas `category-filter`, con category/filter_time y action en segmentación.
- Datos comerciales proceden de la misma oferta normalizada usada por detalle, sin fabricar importes. `offer-redeem` solo con cupón y confirmación explícita; no se envía al abrir/cerrar/cancelar/Escape.
- Espacio propio `localStorage['mastv.visitor.v1']` con sessionId/profileId; no utiliza claves de la demo. Datos ilegibles se ignoran. Fallos de lectura/escritura conservan identidad en memoria durante la visita.
- Peticiones serializadas: la identidad se captura al transmitir, después del perfil devuelto por la petición previa. Cada petición tiene timeout12s y credenciales omitidas. No hay reenvío automático, incluido canje; consulta/copia permanecen disponibles aunque falle medición.
- Aceptación basada en contrato real observado: HTTP correcto y JSON objeto con `task` y `profile.id` no vacíos, sin errores/rechazos explícitos en raíz/response/profile. Solo aceptación actualiza perfil y notifica consumidores. HTTP200 vacío, JSON inválido, error HTTP/red o rechazo no producen éxito ni cambian identidad.
- Estado pendiente captura acción y oferta, deshabilita confirmaciones duplicadas y permite cerrar el diálogo. La respuesta tardía solo abre éxito si sigue abierta esa misma acción; no interrumpe otro detalle. Cierre/cancelación/teclado se conservan y los controles se restauran tras respuesta.
- `tracker.subscribe` notifica respuesta aceptada, perfil anterior, cambio de perfil y estado actual. La app refresca `renderOffers` por esa suscripción, sin emitir filtros/aperturas por render. La selección por intereses y la región no se implementan en US-002.

## Validación ejecutada
- `node --check js/tracking.js`, `node --check js/config.js`, `node --check js/app.js`: salida0 tras integración final y suscripción.
- `node --test --test-isolation=none tests/tracking.test.cjs`: salida0, **11 pruebas, 11 pasan, 0 fallan**, antes y después de integración. Cubren aceptación/rechazo anidado; siete filtros; dos eventos de apertura y opcionales nulos; primer envío concurrente esperando perfil; recarga y separación de demo; storage denegado/corrupto; HTTP/JSON/red sin cambio de perfil; cola que continúa sin retries; timeout; notificación/unsubscribe/errores de consumidor; snapshot de propiedades.
- `git diff --check`: salida0.
- `node /tmp/mastv-us002/smoke.mjs`: salida0, Chrome headless con sandbox normal, servidor local efímero y red interceptada con fixtures exclusivamente sintéticos. Seis comprobaciones PASA: filtro con perfil inicial nulo; apertura con dos eventos y perfil reutilizado; doble confirmación pendiente bloqueada; éxito solo después de respuesta aceptada; respuesta inválida sin éxito; respuesta tardía que no interrumpe otro detalle. Siete POST controlados, cero excepciones Runtime. Evidencia `/tmp/mastv-us002/smoke.json` y runner del mismo nombre `.mjs`.
- Primera ejecución del smoke expiró esperando perfil porque el runner intentó interpretar el preflight OPTIONS como un POST JSON. Se corrigió exclusivamente el runner para responder preflight CORS y se repitió con éxito; no fue un cambio en producto ni una prueba del CORS real.
- Probe real mínimo autorizado: `node /tmp/mastv-us002/probe.cjs`, salida0, un único `category-filter` con categoría sintética y sesión nueva a localhost8686. HTTP200 y cuerpo `{task:<identificador>,ux:[],response:{},profile:{id:<nuevo>,interests:{}}}`. Respuesta local `/tmp/mastv-us002/probe.json`; no se incluyen identificadores en este reporte ni datos de ofertas/perfiles reales. No se consultaron perfiles ni se modificaron fuentes/workflows.
- Build/test/typecheck/lint/dev continúan N/A en PROJECT.md; los comandos anteriores son comprobaciones adicionales sin nuevas dependencias.

## Escenarios Gherkin cubiertos

Los casos completos pendientes de ejecución independiente se identifican sin equiparar pruebas de unidad a navegador. El feature expande 21 casos.

- [ ] Registrar la selección de un filtro — siete variantes de unidad pasan; Comida con POST/browser pasa en smoke; seis variantes browser pendientes QA.
- [x] Registrar la apertura de un beneficio — smoke comprobó dos eventos del mismo beneficio con perfil reutilizado; unidad verifica propiedades y nulos.
- [x] Vincular nuevas interacciones con el perfil recibido — smoke y unidad verifican perfil inicial nulo y siguientes asociados a perfil recibido.
- [ ] Mantener la identidad al recargar — unidad pasa; recarga real de navegador pendiente QA.
- [ ] Seguir midiendo durante una visita sin persistencia disponible — unidad pasa; navegador con storage denegado pendiente QA.
- [x] Confirmar el registro de un canje — smoke verificó POST y éxito únicamente después de liberar aceptación válida.
- [ ] Abandonar una confirmación sin registrar canje — implementación conserva salidas; tres variantes completas pendientes QA.
- [x] Evitar confirmaciones repetidas mientras se procesa una acción — smoke forzó segundo evento click durante respuesta retenida y observó un solo offer-redeem.
- [ ] Informar un registro de canje no confirmado — respuesta sin aceptación válida pasa en browser; rechazo/comunicación pasan en unidad, variantes browser pendientes QA.
- [ ] Continuar consultando si falla la medición — navegación continúa en smoke; Clipboard real con tracking fallido pendiente QA.
- [ ] Actualizar el catálogo sin contar otra interacción — suscripción conectada y render sin emisiones; mutación DOM y recuento focalizados pendientes QA.

## Instrucciones para QA

Desde PROJECT_PATH:

```sh
node --check js/config.js
node --check js/tracking.js
node --check js/app.js
node --test --test-isolation=none tests/tracking.test.cjs
python3 -m http.server 8080 --bind 127.0.0.1
```

Cargar `http://127.0.0.1:8080` con fixture de Strapi y respuestas de `/track` controladas. Aceptación compatible con servicio: `{task:'tarea-QA',response:{},profile:{id:'perfil-QA',interests:{}}}`. Atender preflight OPTIONS con Allow-Origin/Allow-Headers/Allow-Methods adecuados, sin desactivar seguridad del navegador.

Selectores: `[data-filter]`, `.offer-card__button`, `#redeemButton`, `#confirmRedeem`, `#confirmStatus`, `#redemptionFeedback`, `#successModal`; `tracker.getState()` y `mastvTracking.storageKey` para identidad. Propiedades de evento desde js/tracking.js; las dos consultas se agrupan en una petición. `tracker.subscribe` dispara renderOffers tras respuestas aceptadas, sin cerrar detalle o diálogo. Para comprobar ausencia de interacciones de render, retener respuesta inicial, observar mutación real del listado tras liberarla y contar eventos antes/después.

Comprobar las21 variantes completas, perfil inicial/recarga/storage denegado, fallos semánticos/JSON/red, confirmación pendiente duplicada, salidas sin canje, respuesta tardía y Clipboard real mientras tracking falla. Conservar regresión de diálogo LONG en320×568; ahora la confirmación espera respuesta del recolector, por lo que su fixture debe aceptar el POST para comprobar el éxito.

## Bloqueantes y límites
- Sin bloqueantes de implementación. QA independiente completo y CORS real del POST desde navegador están pendientes; el probe se ejecutó desde Node y no demuestra CORS.
- `task` confirma recepción por recolector; no prueba procesamiento final de workflows, cálculo de afinidades, validación del comercio, consumo efectivo o unicidad del cupón. El texto de UI se limita a la confirmación registrada.
- Tras fallo de red puede existir incertidumbre de entrega. No se promete exactamente una vez ni se reenvía automáticamente; una nueva confirmación explícita puede repetir un registro previo incierto.
- No se implementaron intereses ni región, no hubo consulta de perfiles existentes, cambios en servicios, commits, despliegues o publicaciones. Solo este reporte se escribe en el harness por el developer.


## Corrección tras QA revisión 1 — 2026-11-05

**Estado de implementación:** Completada, pendiente de repetición QA focalizada. Se leyó el reporte `progress/reporte/qa/qa_US-002.md`: 20/21 casos PASS, con fallo en la extensión de estado de la respuesta tardía del caso16. Se conserva toda la evidencia anterior, incluidos recepción real y regresión LONG verificadas por QA.

### Cambio mínimo

Solo `js/app.js`, completion de confirmación: el feedback de detalle muestra el resultado únicamente si sigue seleccionada la oferta de esa acción; para otra oferta limpia el aviso temporal. Mantiene las guardas de acción/dialogo y restaura controles. No abre éxito ni atribuye el registro de A al beneficio B. No se integró US-003.

### Evidencia ejecutada

- `node /tmp/mastv-us002/smoke.mjs`: salida0, seis comprobaciones PASA, fixtures sintéticos y Chrome headless con sandbox normal, cero excepciones Runtime.
- Reproducción focal A pendiente → cerrar → volver al catálogo → abrir B → aceptar A: títuloB conservado, éxito oculto, botónB habilitado y `redemptionFeedback.textContent === ''` al terminar. Se forzó además segundo click durante la espera y solo salió un canje para esa acción.
- Misma oferta con aceptación retenida: no hay éxito antes de respuesta; al aceptar aparece confirmación registrada. Respuesta inválida: sin éxito, mensaje de fallo y botones Confirmar/Canjear rehabilitados.
- Evidencia actualizada `/tmp/mastv-us002/smoke.json`; runner `/tmp/mastv-us002/smoke.mjs`. Siete POST controlados, sin peticiones a servicios reales.
- `node --check js/app.js` y `git diff --check`: salida0. No se repitieron unidades ni batería completa porque el cambio es una asignación de feedback del flujo ya cubierto.

### Repetición QA

Repetir caso16 y confirmar que, tras concluirA, B no muestra aviso pendiente ni éxito deA, conserva navegación/copia y sus controles se rehabilitan. La guarda tardía sigue sin cerrar otro detalle o abrir un diálogo ajeno. El developer no cambia veredicto ni estados de la historia.
