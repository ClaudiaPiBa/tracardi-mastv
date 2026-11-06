# Implementación: US-004

**Fecha:** 2026-11-05
**Estado:** Completada
**Proyecto:** MASTV — Catálogo de ofertas @ /home/swumplurd/Documentos/devsarrollo/repos/tracardi-mastv
**Stack:** HTML/CSS/JavaScript / sin framework / sin gestor de paquetes

## Archivos modificados
- `js/location.js` — consentimiento, resolución inversa, persistencia regional, elegibilidad y evento sin coordenadas.
- `tests/location.test.cjs` — 24 pruebas con datos sintéticos.
- `js/app.js` — integra región antes de afinidad/categoría, feedback persistente, cambio/retirada y respuestas aceptadas del tracker.
- `js/config.js` — endpoint público `geocodingApi`, configurable centralmente.
- `index.html` — módulo, región activa, Cambiar ubicación, explicación del proveedor externo y atribución.
- `css/styles.css` — composición regional en flujo normal; conserva scroll y correcciones previas de diálogos.
- `README.md` — configuración, consentimiento, persistencia, contrato, límites del proveedor y verificación.

Instalados por el coordinador con comprobación previa de hashes de baseline y contenido authored: 7 archivos, exit0. No se modificaron catalog.js, tracking.js, interests.js ni archivos Scrum de otros roles.

## Decisiones técnicas
- Coordenadas solo en memoria durante permiso/resolución. Persistencia y eventos usan campos explícitos de región, sin coordenadas; no se escriben en consola.
- Fetch del resolver con `cache: 'no-store'`, `referrerPolicy: 'origin'`, credenciales omitidas y tiempo límite. No se envían identidad/perfil/cupón al proveedor de mapas.
- Solo resolución válida tras permitir produce `geo-location`, mediante la identidad/cola/validación existentes de US-002. Las respuestas aceptadas actualizan intereses mediante US-003; recepción no demuestra workflows.
- `mastv.location.v1` vincula región y consentimiento con sesión/perfil locales. Restaurar no pide coordenadas ni emite otro evento; el primer perfil aceptado no elimina la región recién consentida. No se adopta región remota silenciosamente.
- Primero se aplica cobertura nacional o ISO coincidente; después afinidad de Todos o categoría explícita. Sin región no se excluye cobertura.
- Rechazar, cerrar y Escape retiran región e invalidan callbacks tardíos. La nueva resolución fallida conserva la región anterior; el envío fallido conserva la región resuelta e informa sin afirmar éxito.
- Guardas de concurrencia y mínimo1s entre resoluciones por página; sin sondeo. Esto no garantiza el límite agregado entre visitantes. README documenta uso local moderado y necesidad de proveedor/instancia adecuados antes de operar con tráfico.
- Cadena de composición documentada antes de editar en `/tmp/mastv-us004/ui-chain.md`: banner → bloque de región/cambio/feedback → atribución → filtros → listado. Diálogo en flujo normal con scroll existente.

## Verificación ejecutada
- Sintaxis Node de location.js, app.js, config.js y runner de smoke: PASA. build/test/typecheck/lint/dev oficiales siguen N/A según PROJECT.md; las comprobaciones Node son adicionales sin dependencias nuevas.
- Pruebas de ubicación: 24/24 PASA antes del ajuste final de opciones HTTP. Cubren consentimiento, códigos ISO, nacionales/coincidentes, restauración, cambio/retirada, fallos, almacenamiento denegado, callbacks tardíos, mínimo1s y combinación con afinidades.
- Suite de regresión previa al ajuste de transporte: 61/61 PASA (catálogo/tracking/intereses/ubicación).
- Tras añadir no-store/origin: prueba específica que exige ambas opciones 1/1 PASA y sintaxis location.js PASA. No se amplió de nuevo la batería sin necesidad.
- Primer smoke: timeout esperando ready, exit1. Causa confirmada en el runner: el preflight OPTIONS simulado carecía de Access-Control-Allow-Headers/Methods. Se corrigió solo `/tmp/mastv-us004/smoke.mjs` para responder204, permitir Content-Type,Accept y POST,OPTIONS, excluir OPTIONS del conteo de eventos y guardar diagnóstico sanitizado al fallar. No hubo cambios de producto para resolverlo.
- Smoke corregido ejecutado por coordinador en Chrome156/CDP: exit0, **6/6 PASA**, `runtimeErrors: []`. Evidencia leída: `/tmp/mastv-us004/smoke-result.json`.
  - Espera decisión explícita sin coordenadas/evento.
  - Región + afinidades + evento sin coordenadas, con identidad de sesión y adopción del primer perfil sin perder región.
  - Restauración sin solicitud/evento nuevos.
  - Retirada recupera todas las coberturas sin borrar afinidades.
  - Cierre descarta coordenadas tardías.
  - Fallo de sincronización mantiene región y explicación visible en catálogo.

El smoke intercepta Strapi, Tracardi y Nominatim con datos sintéticos. No prueba disponibilidad externa del geocodificador ni nueva recepción real de geo-location por Tracardi. No contiene credenciales, perfiles reales ni coordenadas en su evidencia.

## Escenarios Gherkin cubiertos
Las comprobaciones de lógica y los seis smoke anteriores están ejecutados. La verificación completa e independiente de los siguientes escenarios y sus variantes queda pendiente de QA; no se marca como ejecutada por preparar la implementación.
- [ ] Esperar una decisión antes de solicitar ubicación.
- [ ] Aplicar una región resuelta con consentimiento.
- [ ] Asociar región al visitante sin coordenadas.
- [ ] Continuar sin compartir ubicación (rechazar/cerrar/Escape).
- [ ] Continuar cuando no puede determinarse la región (cinco resultados).
- [ ] Restaurar una región consentida.
- [ ] Sustituir la región por una nueva decisión.
- [ ] Retirar una región conservada.
- [ ] Conservar la región anterior si falla su actualización.
- [ ] Aplicar la región aunque no pueda sincronizarse su evento.
- [ ] Combinar afinidad con elegibilidad regional.
- [ ] Actualizar afinidades devueltas al sincronizar región.

## Instrucciones para QA
Desde `/home/swumplurd/Documentos/devsarrollo/repos/tracardi-mastv`:

```sh
node --check js/location.js
node --check js/app.js
node --check js/config.js
node --test --test-isolation=none tests/location.test.cjs
python3 -m http.server 8080 --bind 127.0.0.1
```

Abrir `http://127.0.0.1:8080`. Para casos deterministas, interceptar las respuestas Strapi/Tracardi/Nominatim y sustituir geolocalización con coordenadas sintéticas. No realizar consultas externas innecesarias. Configuración pública en js/config.js; diálogos/acciones conservan IDs previos. Nuevos selectores: #changeLocation, #regionStatus, #locationFeedback. Estado visible para inspección: locationStore.getState(). Evidencia previa y runner en `/tmp/mastv-us004/`; `node /tmp/mastv-us004/smoke.mjs` requiere permisos de Chrome y servidor local del coordinador.

Verificar las 18 variantes Gherkin y regresiones de navegación, copia, canje, foco/Tab/Escape, ancho móvil, estado largo de diálogo, errores persistentes y respuestas tardías. Comprobar que almacenamiento/eventos no contienen coordenadas y que una región remota no reemplaza una decisión local.

## Bloqueantes
Ninguno de implementación. Pendiente QA independiente y Gate2 del coordinador. No se marca la historia Done ni se realizan commits, despliegues o publicaciones.
