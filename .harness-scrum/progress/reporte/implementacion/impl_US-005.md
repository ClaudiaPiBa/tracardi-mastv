# Implementación: US-005

**Fecha:** 2026-11-06
**Estado:** Completada
**Proyecto:** MASTV — Catálogo de ofertas @ /home/swumplurd/Documentos/devsarrollo/repos/tracardi-mastv
**Stack:** HTML/CSS/JavaScript / sin framework / sin gestor de paquetes

## Archivos modificados
- `js/catalog.js` — solicita la población específica de `imagen_promo` en cada página, normaliza media plano/anidado y resuelve rutas en el origen de Strapi; acepta únicamente HTTP/HTTPS sin credenciales.
- `js/app.js` — usa imagen decorativa en el espacio del icono, conserva el icono durante carga y lo restaura ante error; mantiene el mismo botón y apertura por ID.
- `css/styles.css` — contenedor de imagen de hasta 90 × 80 px con proporción completa mediante `object-fit: contain`.
- `tests/catalog.test.cjs` — tres pruebas de contrato media, opcionales inválidos/URL y población/origen en todas las páginas.
- `README.md` — documenta población, contrato compatible, accesibilidad, respaldo y límite de evidencia real.

## Decisiones técnicas
- Cadena de dimensiones documentada antes de implementar: tarjeta → cabecera flexible → visual de hasta 90 × 80 px (máximo 34% del ancho interior) + separación 9 px + título flexible con `min-width: 0`; descripción, etiquetas y acción debajo en flujo. A 320 px: tarjeta 306 px → interior 280 px → visual 90 px + 9 px + título 181 px. A 480/1024 px: app limitada a 480 px → tarjeta 466 px → interior 440 px → visual 90 px + 9 px + título 341 px. Sin imagen se conserva visual genérico 44 × 44 px.
- Se usa URL del medio original, no `formats.thumbnail`, para mostrar la imagen completa. Las estructuras compatibles son `imagen_promo.url` y `imagen_promo.data.attributes.url`; también se acepta `data.url`. Los contenedores inválidos conservan la oferta y dan respaldo genérico.
- Imagen con `alt=""` y contenedor `aria-hidden="true"`: complementa al título y no anuncia archivos ni añade un control de teclado.
- El icono permanece mientras carga. Solo `load` sustituye el icono; `error` retira la imagen y restaura el icono sin cambiar el contenido o la acción.
- Recomendaciones, categoría y región usan el renderizador existente, por lo que comparten esta presentación sin modificar selección, tracking ni navegación.
- Cambios preparados en `/tmp/mastv-us005-dev/implementation.patch` debido al proyecto fuera de las raíces de escritura y aplicados por el coordinador mediante `git apply`. Las comprobaciones finales se ejecutaron sobre los archivos reales de `PROJECT_PATH`. El estado Completada se refiere a implementación y validación técnica; la aceptación de interfaz queda para QA y Gate 2.

## Evidencia de contrato y validación
- GET de solo lectura con máximo 10 segundos a `http://localhost:1337/api/offers?pagination[pageSize]=1&populate=imagen_promo`: HTTP correcto con `imagen_promo: null`.
- GET de solo lectura con máximo 10 segundos a `http://localhost:1337/api/offers?pagination[pageSize]=100&populate=imagen_promo`: siete ofertas, todas con `imagen_promo: null`.
- GET exacto para el parámetro implementado `http://localhost:1337/api/offers?pagination[pageSize]=1&populate[imagen_promo]=true`: respuesta correcta y campo expuesto como null. No se modificaron datos remotos ni se enviaron eventos reales.
- No hay muestra real de medio no nulo en las ofertas actuales. La compatibilidad de URL y las formas plana/Strapi v4 se verifican con datos sintéticos; esto no demuestra disponibilidad de un archivo remoto real.
- En staging y nuevamente en `PROJECT_PATH` tras aplicar: `node --check js/catalog.js` y `node --check js/app.js` terminaron con código 0.
- En staging y nuevamente en `PROJECT_PATH` tras aplicar: `node --test --test-isolation=none tests/catalog.test.cjs tests/tracking.test.cjs tests/interests.test.cjs tests/location.test.cjs`: 64 pruebas, 64 pasan, 0 fallan, 0 omitidas.
- En `PROJECT_PATH`, `git diff --check` terminó con código 0.
- Sobre `js/catalog.js` real se ejecutó `loadOffers('http://localhost:1337/api/offers', fetch, 10000)` mediante GET únicamente: `{"offers":7,"omitted":0,"withImage":0}`. Confirma carga completa con el parámetro de población implementado y ausencia de medios reales disponibles.
- Build, typecheck y lint siguen declarados N/A en `PROJECT.md`; no se inventaron comandos ni dependencias.

## Escenarios Gherkin cubiertos
- [ ] Mostrar imagen completa a 320, 480 y 1024 px con título y acción accesibles: implementado, pendiente ejecución de navegador por QA.
- [ ] Respaldo con imagen ausente, vacía o no cargable: normalización probada con datos sintéticos; eventos de imagen y presentación pendientes de navegador por QA.
- [ ] Abrir el detalle de la misma promoción mediante teclado: botón original conservado; pendiente ejecución de teclado por QA.

## Instrucciones para QA
Desde el proyecto, ejecutar:

```sh
node --check js/catalog.js
node --check js/app.js
node --test --test-isolation=none tests/catalog.test.cjs tests/tracking.test.cjs tests/interests.test.cjs tests/location.test.cjs
python3 -m http.server 8080 --bind 127.0.0.1
```

Abrir `http://127.0.0.1:8080`. Interceptar Strapi/Tracardi con fixtures sintéticos para evitar tracking real. Usar media plano `{url: '/uploads/prueba.png'}` o media v4 `{data: {attributes: {url: '/uploads/prueba.png'}}}` con la imagen servida/interceptada en el origen de Strapi. Incluir imagen horizontal y vertical, medio ausente/null/vacío e imagen con error HTTP. En anchos 320/480/1024 verificar `.offer-card__image` completa, proporcionada y dentro de la tarjeta; título y Ver beneficio legibles. Al cargar, `.offer-card__logo--promo` reemplaza `.offer-card__logo--generic`; en error se retira la imagen y reaparece el icono de categoría. Comprobar `alt=""`, contenedor `aria-hidden`, foco del botón y apertura con Enter/Espacio de la misma oferta. Repetir en categoría explícita y recomendaciones con afinidad >1; confirmar que no se generan eventos al cargar una imagen o filtrar regionalmente y que abrir detalle conserva los eventos existentes.

## Bloqueantes y límites
- Sin bloqueo de implementación. Parche aplicado y comprobaciones técnicas finales correctas.
- QA de navegador pendiente; no se marcan los escenarios Gherkin como ejecutados.
- Medios reales no nulos no disponibles en las siete ofertas locales; no se alteraron para fabricar evidencia.
