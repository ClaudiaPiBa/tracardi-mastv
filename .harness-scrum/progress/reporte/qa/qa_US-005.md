# Reporte QA: US-005

**Fecha:** 2026-11-06
**Veredicto:** ⚠️ PASA CON OBSERVACIONES

Los siete casos expandidos del Gherkin y las dos regresiones focales pasan en navegador. La observación para la demo es la ausencia de un medio real no nulo en las siete ofertas consultadas por el developer: la presentación de imágenes se acredita con fixtures, no con una promoción real que actualmente tenga archivo asociado.

## Ejecución y evidencia

Proyecto y directorio de los comandos de producto/navegador: `/home/swumplurd/Documentos/devsarrollo/repos/tracardi-mastv`. QA leyó historia, feature aprobado, PROJECT.md, informe Completada y código final. Se revisaron las instrucciones del harness y se buscaron AGENTS.md en ancestros y directorios afectados; no se encontraron instrucciones adicionales. No se modificó implementación ni archivos del proceso Scrum. En la tabla, Harness corresponde a `/home/swumplurd/Documentos/devsarrollo/repos/harness/scrum-harness-codex`.

Node 24.16.0, Google Chrome 156.0.8078.79 headless/CDP con sandbox normal, viewport de altura 1000 y anchos 320/480/1024. Un perfil independiente por caso y servidor local efímero. El coordinador ejecutó los comandos de navegador fuera de la restricción de red del sandbox, con autorización shell; QA preparó el runner y revisó resultados, capturas y hashes. Los eventos de ratón y teclado se enviaron por CDP; no se invocaron manejadores de producto para simular la interacción.

| Comando | Directorio | Código | Resultado observado |
|---|---|---:|---|
| `node --check /tmp/mastv-us005-qa/us005.mjs` | Harness | 0 | Sintaxis del runner correcta. |
| `/usr/bin/google-chrome --version` | Harness | 0 | Chrome 156.0.8078.79. |
| `node /tmp/mastv-us005-qa/us005.mjs` dentro del sandbox | Proyecto | 1 | listen EPERM en 127.0.0.1; no inició el servidor. |
| Mismo runner, primera pasada autorizada | Proyecto | 1 | Un caso PASS; ocho no superaron preparación. Evidencia conservada; no se atribuye fallo al producto. |
| `node /tmp/mastv-us005-qa/us005.mjs --diagnose` | Proyecto | 1 | Diagnóstico aislado 480: click de inicio interceptado por backdrop; sin excepción Runtime. |
| `node /tmp/mastv-us005-qa/us005.mjs`, preparación corregida | Proyecto | 1 | 8 PASS; caso 07 no activó Enter por helper de teclado incompleto. Sin excepciones Runtime. |
| `node /tmp/mastv-us005-qa/us005.mjs --keyboard`, evento de teclado corregido | Proyecto | 0 | Caso 07 PASS con Enter y Espacio. Se reutilizan los otros ocho PASS de la pasada anterior sin cambio de producto. |
| `node --check js/catalog.js` y `node --check js/app.js` | Proyecto | 0, evidencia heredada | Developer las ejecutó sobre el proyecto real y las documentó en impl_US-005.md. QA no afirma haberlas repetido. |
| `node --test --test-isolation=none tests/catalog.test.cjs tests/tracking.test.cjs tests/interests.test.cjs tests/location.test.cjs` | Proyecto | 0, evidencia heredada | Developer documentó 64/64, cero fallos y omitidas; no se repitieron sin causa ni cambio nuevo. |
| `node /tmp/mastv-us005-qa/finalize.mjs` | Harness | 0 | Verifica ocho PASS originales, PASS focal 07 y hashes idénticos de los ocho archivos entre ambas baterías; genera este reporte. |

Build, typecheck, lint y dev siguen N/A según PROJECT.md. Las comprobaciones Node complementarias proceden del README.

La primera preparación esperaba solo aria-busy=false, valor ya presente en el HTML antes de que terminaran los scripts defer. El diagnóstico mostró el diálogo de ubicación abierto y el click dirigido al inicio bloqueado por su backdrop. Se corrigió únicamente el runner para esperar document.readyState=complete, catálogo no ocupado y categorías creadas por app.js, y el cierre efectivo del diálogo antes de navegar. No se modificó el producto ni se sustituyeron las acciones CDP por clicks de DOM.

La pasada con preparación correcta dejó ocho casos PASS y el caso 07 no abrió el detalle: el foco sí alcanzó el botón, pero el helper omitía el carácter de retorno de Enter. Se completó con código virtual/nativo 13 y text/unmodifiedText de retorno en keyDown, patrón ya validado en QA US-001 revisión2; Espacio incluye código 32 y carácter de espacio. Se repitió únicamente 07 con perfil nuevo y log de eventos nativos con isTrusted, sin invocar click de DOM. QA revisó keypress/click de Enter y keyup/click de Espacio con isTrusted=true en el registro. Ambos cambios resuelven el runner, no un defecto del producto. El veredicto combina ocho PASS conservados con el PASS focal 07.

Evidencia relativa al reporte: `evidencia/US-005/evidence-final/results.json`, capturas 01–06/08–09 y manifiestos source-hashes-before/after.json. El cierre de 07 consta en `evidencia/US-005/keyboard-evidence/results.json`, capturas 07/07-detail-Enter/Space y sus propios manifiestos. El archivo 07-failure.png y el resultado fallido original se conservan como antecedente del helper incompleto; no se sobrescriben. Runner y helpers en `evidencia/US-005/{us005,cdp,fixtures}.mjs`, instrucciones en `evidencia/US-005/REPRODUCIR.md`. Los intentos iniciales se conservan separados en evidence/ y diagnostic-evidence/; no forman parte del conteo final de escenarios aprobados.

## Resultado por escenario

### ✅ Escenario 01: Mostrar imagen adaptada a 320 px

- **Given** oferta plana con media plana/URL absoluta y oferta attributes con media v4/URL relativa; imágenes cargables horizontal 480×120 y vertical 120×320; viewport 320 → verificado.
- **When** se consulta el catálogo y las tarjetas tras inicializar la app → ejecutado en navegador.
- **Then** ambas imágenes completas dentro de las tarjetas, sin icono genérico visible, con proporciones conservadas; título y Ver beneficio legibles/accesibles y sin anuncio de archivo → cumplido por geometría, árbol AX y captura 01.

### ✅ Escenario 02: Mostrar imagen adaptada a 480 px

- **Given** mismas dos formas de oferta/media y proporciones, perfil nuevo, viewport 480 → verificado.
- **When** se consultan sus tarjetas → ejecutado en navegador.
- **Then** imagen completa y proporcionada, sin desbordar; título y acción accesibles, sin nombre de archivo en AX → cumplido. Captura 02 y métricas guardadas.

### ✅ Escenario 03: Mostrar imagen adaptada a 1024 px

- **Given** mismas dos promociones cargables, perfil nuevo y viewport 1024 → verificado.
- **When** se consultan las tarjetas → ejecutado en navegador.
- **Then** el catálogo limitado por el diseño mantiene imagen completa, proporción, título y acción accesibles sin anunciar el archivo → cumplido. Captura 03 y métricas guardadas.

En los tres anchos se comprueba naturalWidth/naturalHeight, object-fit=contain, caja de imagen y texto/botón dentro de la tarjeta y scrollWidth igual a innerWidth. El contenido pintado de la imagen horizontal mide 90×22.5 y el vertical 30×80 dentro del espacio 90×80. La URL relativa v4 se solicita a http://localhost:1337/uploads/qa-vertical.svg, origen de Strapi. Las imágenes tienen alt vacío y contenedor aria-hidden; AX conserva los encabezados y botones Ver beneficio. La inspección de capturas confirma el marco y las esquinas de ambas imágenes sin recorte.

### ✅ Escenario 04: Conservar icono con imagen ausente

- **Given** promoción Comida sin campo imagen_promo, perfil independiente → verificado.
- **When** se consulta la tarjeta → ejecutado.
- **Then** icono 🍽️ de categoría visible, sin nodo img roto; título, información y Ver beneficio conservados y dentro de tarjeta → cumplido. Captura 04.

### ✅ Escenario 05: Conservar icono con imagen vacía

- **Given** promoción Cine con imagen_promo.url vacío, perfil independiente → verificado.
- **When** se consulta su tarjeta → ejecutado.
- **Then** icono 🎟️ de categoría visible, sin imagen rota; título, información y botón permanecen disponibles → cumplido. Captura 05.

### ✅ Escenario 06: Conservar icono con imagen no disponible

- **Given** promoción Ropa cuyo archivo devuelve HTTP 404 sintético, perfil independiente → verificado.
- **When** el navegador intenta cargarlo al consultar la tarjeta → ejecutado.
- **Then** el nodo de imagen fallida se retira, reaparece 👕 de categoría y permanecen información y Ver beneficio → cumplido. Captura 06 y petición interceptada 404.

### ✅ Escenario 07: Consultar la misma promoción mediante teclado

- **Given** segunda tarjeta VERTICAL-V4 con imagen cargada, perfil independiente → verificado.
- **When** se alcanza su botón mediante Tab real y se activa con Enter; se vuelve al catálogo y se repite con Espacio → ejecutado mediante Input.dispatchKeyEvent, sin click programático del botón.
- **Then** ambas activaciones abren el detalle QA beneficio VERTICAL-V4; cada una genera exactamente offer-click y offer-view con offer_id=QA-VERTICAL-V4 → cumplido. Capturas 07-detail-Enter/Space y payloads sintéticos registrados.

## Regresión focal

- **Caso 08, recomendaciones:** Cine4 precede Comida2; Ropa1 queda fuera de Todos. Se muestran las tres imágenes de las ofertas esperadas y no hay eventos al renderizar/cargar medios. Los dos formatos de media ya están cubiertos en 01–03.
- **Caso 09, región/categoría:** CMX consentida sintética limita recomendaciones a CMX y nacional; excluye JAL. Filtrar Cine mediante ratón CDP mantiene solo CMX con imagen. Se espera y comprueba la recepción de exactamente un cine-seg existente; no hay eventos de consulta por filtro ni carga de imagen. La afinidad y la elegibilidad se conservan.
- Cero excepciones Runtime en los nueve casos. Los casos visuales y de respaldo verifican cero eventos de consulta y los contextos iniciales cero llamadas de tracking. Abrir detalle genera únicamente los eventos de consulta ya existentes.
- Los hashes SHA256 de index.html, CSS y seis módulos JS coinciden antes/después. Los cambios ajenos del repositorio se conservaron.

## Observaciones de calidad y límites

- Todos los valores de los Scenario Outline se ejecutaron con perfiles nuevos. Enter y Espacio se comprueban en secuencia controlada dentro del mismo caso; cada apertura debe conservar el ID y producir solo su par de eventos.
- **Para la demo:** imágenes y respuestas Strapi/Tracardi son sintéticas. Todo destino externo restante se bloqueó, incluido el proveedor de fuentes; la prueba visual usa la tipografía de respaldo local. No hubo POST reales, escritura remota ni geolocalización real.
- **NO VERIFICADA:** visualización de un archivo asociado a una oferta real y forma no nula real de media. El developer documenta un GET con población correcta y siete ofertas, todas imagen_promo:null. QA reutiliza esa evidencia y no inventa un archivo ni afirma integración visual real. Las formas plana y v4/URL relativa se acreditan con fixtures explícitos.
- **NO VERIFICADOS:** dispositivos físicos, otros navegadores y lectura auditiva con lector de pantalla. La evidencia de accesibilidad corresponde a nombres/roles del árbol AX, markup decorativo y operación real por teclado en Chrome.
- No se hallaron escenarios ambiguos, fallos funcionales ni deuda nueva que bloquee la demo del alcance aprobado.

## Recomendaciones

- Presentar en Gate2 que las imágenes demostradas son fixtures y que el catálogo real actual conserva el icono porque sus medios son null.
- Cuando exista una promoción real con medio no nulo, repetir una comprobación visual de solo lectura para confirmar su estructura efectiva, URL y carga. No requiere modificar datos para fabricar la evidencia actual.

## Decisión

- [x] Aprobado para demo con usuario, mostrando las observaciones anteriores.
- [ ] Requiere corrección de producto antes de demo.

La aceptación humana de Gate2 corresponde al coordinador. QA no modifica estados, backlog, historia, sprint ni aprobación pendiente; no ejecuta commits, merge, despliegue ni publicación.
