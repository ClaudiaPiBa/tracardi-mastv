# Implementación: US-001

**Fecha:** 2026-11-05
**Estado:** Completada
**Proyecto:** MASTV — Catálogo de ofertas @ /home/swumplurd/Documentos/devsarrollo/repos/tracardi-mastv
**Stack:** HTML/CSS/JavaScript / sin framework / sin gestor de paquetes

Implementación terminada para revisión QA independiente. No equivale a aceptación de la historia ni a escenarios Gherkin completos ejecutados.

## Archivos modificados
- `index.html` — carga de configuración/módulo; filtros dinámicos, mensajes y reintento; condiciones de detalle; accesos editoriales al catálogo y eliminación del identificador fijo; confirmación explícitamente local.
- `js/app.js` — carga y estados, render seguro mediante textContent, categorías remotas, selección/detalle y confirmación coherentes; controles deshabilitados sin cupón; conserva diálogos y teclado existentes.
- `js/catalog.js` — normalización plana/attributes, identidad con trazabilidad, validación de opcionales, lectura de todos los formatos y páginas, timeout y rechazo de catálogo parcial; exportación CommonJS adicional para pruebas.
- `js/config.js` — endpoint público configurable Strapi, sin credenciales.
- `css/styles.css` — avisos, recurso genérico por categoría, condiciones y ajuste de textos extensos.
- `README.md` — configuración, CORS/origen, límites y comandos concretos de comprobación.
- `tests/catalog.test.cjs` — 15 pruebas sintéticas sin dependencias ni llamadas reales a servicios.

## Decisiones técnicas
- Cadena de UI documentada antes de programar: banner → filtros → avisos → tarjetas → vacío/reintento. Detalle: título/comercio → descripción → cupón → condiciones → descuento → acción. Flujo normal del documento, sin posiciones absolutas nuevas que solapen piezas.
- `mastvCatalog.loadOffers` publica solo tras completar todas las páginas; timeout de 12 segundos por página, credenciales omitidas. Fallo HTTP/red/JSON/esquema/paginación produce estado de error y permite reintentar, sin respaldo local.
- Tamaño inicial 100; sigue pageCount o total y tamaño efectivo de metadatos. Conserva parámetros públicos del endpoint y actualiza página. Respuestas inesperadas, página posterior vacía o cambios de conteo se rechazan.
- Identidad prioriza id_offer/documentId/id convertidos a texto; conserva strapiId/documentId/idOffer. Mínimos: identidad, titulo y categoria. Omisiones cuentan en aviso separado, incluso si todas son inválidas; no se equipara ese caso a un catálogo remoto vacío.
- Precio/porcentaje ausente o inválido permanece null. Porcentaje válido entre 0 y 100. Moneda ISO reconocida por Intl; importes sin moneda publicada válida se muestran sin sufijo. Fecha de calendario validada y mostrada como fecha publicada, sin caducidad automática.
- Categorías comparadas por minúsculas y espacios exteriores, sin aliases. Recurso genérico por categoría, sin asociación inventada a logos. Todos muestra ofertas válidas durante US-001; intereses y elegibilidad regional quedan para sus historias.
- Datos remotos se insertan como texto y nodos DOM, sin innerHTML. Sin cupón no se permite copia ni canje, también mediante guardas de handlers.
- Confirmación actual es local y lo dice explícitamente; no se implementó tracking, perfil, intereses ni región. No se modificaron servicios o referencia de demo.

## Validación ejecutada
- `node --check js/catalog.js`, `node --check js/config.js`, `node --check js/app.js`: salida 0.
- `node --test --test-isolation=none tests/catalog.test.cjs`: salida 0, **15 pruebas, 15 pasan, 0 fallan**. También se ejecutó directamente el archivo con 15/15. `node --test tests/catalog.test.cjs` salida 0 pero este entorno resumió solo el archivo; la evidencia detallada procede del comando sin aislamiento.
- Pruebas: normalización plana/anidada e identidad; opcionales inválidos/cero válido; comparación de categorías; tres formatos; páginas y tamaño efectivo; paginación por total; error posterior sin parcial; JSON/esquema incorrectos; metadatos/página vacía inesperados; vacío frente a todos omitidos; abort por timeout.
- `git diff --check`: salida 0.
- `node /tmp/mastv-us001/smoke.mjs`: salida 0 en Chrome headless con sandbox normal y red externa interceptada mediante `/tmp/tracardi-qa/cdp.mjs`. Fixtures exclusivos sintéticos. Cuatro comprobaciones: catálogo/filtro; título/cupón de detalle; resumen de confirmación; Escape y retorno de foco. Sin excepciones Runtime. Evidencia `/tmp/mastv-us001/smoke.json`.
- Primera ejecución smoke falló solo en la expectativa de retorno de foco porque el clic DOM del runner no enfocaba el botón; se corrigió el runner enfocando el botón antes del clic, sin cambiar implementación, y repitió con éxito.
- Build/typecheck/lint/dev: N/A en PROJECT.md. No se instaló infraestructura ni dependencias.

## Escenarios Gherkin cubiertos

La lista identifica escenarios completos pendientes de ejecución independiente. Los checks unitarios y smoke anteriores cubren partes, sin afirmar ejecución íntegra del Given/When/Then.

- [ ] Consultar la categoría con datos remotos — smoke parcial; QA completo pendiente.
- [ ] Reconocer una carga de catálogo en curso — QA de interfaz pendiente.
- [ ] Consultar todas las páginas publicadas — unidad pasa; QA de interfaz pendiente.
- [ ] Abrir un detalle coherente con la tarjeta — smoke parcial; condiciones completas pendientes en QA.
- [ ] Copiar el cupón publicado — Clipboard API real no ejecutada por developer.
- [ ] Reconocer un catálogo publicado sin ofertas — unidad pasa; QA de interfaz pendiente.
- [ ] Recuperar una carga fallida — unidad pasa; QA de interfaz pendiente.
- [ ] Volver a intentar la carga — QA de interfaz pendiente.
- [ ] Separar ofertas incompletas de ofertas utilizables — unidad pasa; QA de interfaz pendiente.
- [ ] Consultar una oferta sin cupón — normalización pasa; QA de controles pendiente.
- [ ] Acceder al catálogo desde Inicio — QA de navegación pendiente.

## Instrucciones para QA

Desde PROJECT_PATH:

```sh
node --check js/config.js
node --check js/catalog.js
node --check js/app.js
node --test --test-isolation=none tests/catalog.test.cjs
python3 -m http.server 8080 --bind 127.0.0.1
```

Abrir http://127.0.0.1:8080; rechazar ubicación para revisar catálogo. Usar fixtures sintéticos interceptados para no copiar datos reales. Configuración efectiva en window.MASTV_CONFIG.offersApi. Selectores: #catalogStatus, #catalogWarning, #retryCatalog, #offerList, #emptyState, #categoryFilters, #detailConditions, #copyCode, #redeemButton. Categorías: button[data-filter], clave normalizada en data-category-key; «Todos» usa clave vacía.

Probar respuestas retenidas, fallos en página posterior, recuperación, todas inválidas, cero ofertas, campos planos/attributes y lista/data/ofertas. Validar datos de tarjeta/detalle/confirmación, Clipboard real con permisos y pestaña activa, inexistencia de ofertas incrustadas, navegación desde cada editorial y teclado/diálogos/móvil. Recurso visual nunca es un logo comercial. El smoke no verifica accesibilidad completa ni render visual.

Para siguientes integraciones, ofertas normalizadas usan: id/name/category/categoryKey/brand/description/location/discountPercentage/priceOriginal/priceOffer/currency/expirationDate/offerType/code y strapiId/documentId/idOffer. La selección no depende de un índice fijo.

## Bloqueantes y límites
- Sin bloqueantes de implementación. Los escenarios completos y la lectura CORS real desde navegador quedan para QA; no se declara servicio integrado operativamente solo por fixtures.
- No se realizaron POST reales, lectura de perfiles, cambios en Strapi/Tracardi, commits ni publicaciones.
- Se conservaron los archivos del harness y cambios ajenos; solo se escribe este reporte dentro de .harness-scrum.


## Corrección tras QA revisión 1 — 2026-11-05

**Estado de implementación:** Completada, pendiente de repetición QA focalizada. Se conserva íntegra la evidencia anterior. Se leyó `progress/reporte/qa/qa_US-001.md` con veredicto FALLA: once escenarios base pasan, pero contenido remoto extenso deja controles de confirmación inaccesibles a 320×568.

### Cambio mínimo

- Solo `css/styles.css`: altura máxima del diálogo igual al viewport menos el padding del backdrop (36px en móvil, 48px desde 600px); fallback vh y dvh, `overflow-y:auto` y `overscroll-behavior:contain`.
- Se conserva el flujo título → resumen → acciones; el contenido completo se puede desplazar, sin exigir visibilidad simultánea. No se recorta ni limita el texto publicado.
- Sin cambios JavaScript/HTML, reglas de negocio, historias, estados o servicios. El módulo aislado US-002 permanece sin cargar en el frontend.

### Evidencia ejecutada

- `node /tmp/mastv-us001/long-dialog.mjs`: salida 0, PASA con Chrome headless y sandbox normal, red interceptada y fixture sintético equivalente a LONG de QA (título200/descripcion460/cupón largo), viewport320×568.
- Diálogo observado entre y18 y550 (altura532, scrollHeight999), dentro del viewport de568. Rueda real `Input.dispatchMouseEvent mouseWheel` produce scrollTop>0; Confirmar se alcanza y queda entre y407.41 y455.41.
- Clics reales de puntero verificaron Cancelar, Cerrar y Confirmar; confirmar abre éxito local y permite volver al catálogo. Tab y Shift+Tab trasladaron foco a Cerrar/Cancelar, desplazando el control hasta quedar visible; Escape cerró el diálogo.
- Evidencia `/tmp/mastv-us001/long-dialog.json`; runner `/tmp/mastv-us001/long-dialog.mjs`.
- `node /tmp/mastv-us001/smoke.mjs`: salida 0, cuatro comprobaciones de catálogo/filtro, detalle/cupón, resumen coherente, Escape/restauración de foco; cero excepciones Runtime.
- `node --check js/app.js`, `node --check js/catalog.js`, `node --check js/config.js` y `git diff --check`: salida0. No se repitieron las quince pruebas de catálogo porque el único cambio fue CSS.

### Repetición QA requerida

Usar el fixture LONG del reporte QA en320×568 y verificar que el diálogo permanece dentro del viewport, que rueda/táctil o Tab permiten alcanzar acciones, y que Cancelar/Cerrar/Confirmar funcionan. No exigir que todo el resumen y botones estén visibles simultáneamente. Revisar también diálogos normales en los tamaños ya cubiertos. El developer no cambia el veredicto QA ni marca la historia Done.
