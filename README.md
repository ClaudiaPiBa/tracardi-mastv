# Catálogo MASTV

Frontend estático HTML/CSS/JavaScript, sin framework ni gestor de paquetes.

Para probarlo con un origen HTTP local, desde este directorio:

```sh
python3 -m http.server 8080 --bind 127.0.0.1
```

Abrir `http://127.0.0.1:8080`. Este servidor solo sirve archivos; no actúa como proxy ni backend. La ubicación se solicita únicamente tras permitirla en el diálogo y puede retirarse desde «Cambiar ubicación».

## Catálogo Strapi

Editar `offersApi` en `js/config.js`. Valor inicial: `http://localhost:1337/api/offers`. Es configuración pública: no incluir tokens, credenciales ni secretos. El navegador necesita acceso a ese servicio y Strapi debe permitir CORS desde el origen del frontend. En otro dispositivo, `localhost` apunta a ese dispositivo. Un sitio HTTPS necesita un endpoint HTTPS compatible.

La consulta solicita `populate[imagen_promo]=true` y páginas de 100 y sigue `meta.pagination` (o `pagination`) mediante `pageCount`, o `total` y `pageSize`/`limit`. Respeta el tamaño efectivo de Strapi. Acepta lista raíz, `data` u `ofertas`, con campos planos o dentro de `attributes`. Cada página tiene un límite de espera de 12 segundos. Un error HTTP, de red, JSON, estructura o paginación descarta la carga completa y muestra «Reintentar carga». No hay ofertas locales de contingencia.

La identidad prioriza `id_offer`, `documentId`, `id`; título y categoría también son obligatorios. Se omiten registros incompletos con aviso visible. Se conservan los identificadores originales para integraciones posteriores. Categorías desde las ofertas válidas, comparadas sin distinguir mayúsculas ni espacios exteriores. «Todos» muestra recomendaciones según los intereses recibidos de Tracardi; las categorías explícitas permiten explorar el catálogo válido sin restricción por afinidad.

La tarjeta, detalle, copia y confirmación usan la misma oferta normalizada. Los campos opcionales inválidos no se convierten en cero ni se inventan; se muestran precios sin sufijo de moneda si esta no está publicada válidamente. La fecha solo informa el vencimiento; Strapi decide qué está publicado. Sin cupón no se puede copiar ni confirmar. Las tarjetas muestran el recurso original de `imagen_promo.url` (media plano) o `imagen_promo.data.attributes.url` (Strapi v4), con la imagen completa y proporcionada. Las rutas relativas se resuelven contra el origen de `offersApi`, sin depender del servidor estático. Solo se admiten URL HTTP/HTTPS sin credenciales. El icono de categoría permanece si falta el medio, la URL no es válida o la imagen no carga. La imagen complementa el título, lleva `alt=""` y no añade controles de teclado. En la comprobación local del 2026-11-06, el GET con `populate` expuso `imagen_promo: null` en las siete ofertas; la compatibilidad con medios no nulos se verifica mediante datos sintéticos. Los accesos editoriales de Inicio llevan al catálogo. La confirmación envía un registro a Tracardi; no valida el consumo ni la aceptación comercial del cupón.

## Verificación

Los comandos build/test/typecheck/lint/dev del proyecto continúan declarados N/A en PROJECT.md. Comprobaciones adicionales sin dependencias nuevas:

```sh
node --check js/config.js
node --check js/catalog.js
node --check js/app.js
node --test tests/catalog.test.cjs
```

Las pruebas usan exclusivamente ofertas sintéticas y no llaman a servicios. Cubren normalización, campos opcionales, medios planos/anidados, URL de imagen, formatos, páginas, rechazo de cargas parciales, estructura inválida y tiempo límite. Para QA de interfaz, usar respuestas sintéticas de Strapi para estados de carga/vacío/error/reintento, categorías, detalle y cupón; permitir Clipboard API en un origen seguro local. Comprobar Escape y Tab en diálogos, navegación y ancho móvil.

## Tracking Tracardi

`js/config.js` reúne `trackingApi` (`http://localhost:8686/track`) y `trackingSource` (`demo-source`). Son datos públicos, sin claves administrativas. El recolector debe permitir CORS desde el origen HTTP/HTTPS del frontend.

Seleccionar un filtro emite su evento de segmentación (Comida, Electronica, Cine, Ropa, Online) o `category-filter` para Todos y categorías restantes. Abrir un detalle envía `offer-click` y `offer-view` juntos en una petición; cada evento aparece una vez por apertura. Solo confirmar explícitamente envía `offer-redeem`. Renderizar, cancelar, cerrar, Escape o copiar no generan un canje ni nuevos eventos de consulta.

La identidad se guarda en `localStorage` bajo `mastv.visitor.v1`, separada de la demo. Mantiene sesión y perfil entre recargas; datos ilegibles se ignoran y, si el almacenamiento está denegado, se conserva en memoria durante la visita. Las peticiones se serializan y construyen el perfil al enviarse para que las siguientes reutilicen el primer perfil recibido. La cola no bloquea la navegación ni la copia. Cada petición tiene 12 segundos de límite de espera y no se reenvía automáticamente.

Se reconoce recepción válida únicamente con HTTP correcto y un objeto JSON que incluya `task` y `profile.id` no vacíos, sin errores o rechazo explícitos en la raíz, `response` o `profile`. Esta es la forma observada en el recolector local; HTTP200 por sí solo no basta. Solo una respuesta aceptada cambia la identidad o notifica a consumidores mediante `tracker.subscribe`. La tarea recibida confirma recepción por el recolector, sin demostrar procesamiento de workflows, validación comercial o consumo efectivo del beneficio.

Mientras se procesa una confirmación se bloquean duplicados de esa acción. Se puede cerrar el diálogo y seguir consultando. Una respuesta tardía no abre el éxito sobre otro detalle o después del cierre. Un error informa que el registro no pudo confirmarse y permite continuar; no muestra éxito ni reintenta automáticamente. Volver a pulsar Confirmar tras un fallo es una nueva acción explícita y puede duplicar un registro cuyo resultado previo fuera incierto.

Comprobaciones adicionales:

```sh
node --check js/tracking.js
node --test --test-isolation=none tests/catalog.test.cjs tests/tracking.test.cjs
```

## Recomendaciones por intereses

«Todos» incluye únicamente ofertas cuya categoría tiene afinidad numérica mayor que1. Se ordenan de mayor a menor, conservando el orden del catálogo en empates. Los nombres de categoría se comparan sin distinguir mayúsculas ni espacios exteriores; los valores numéricos en texto también se aceptan. Afinidades inválidas, no finitas o ausentes equivalen a0. Una categoría explícita muestra sus ofertas aunque no exista afinidad; todos los filtros del catálogo válido permanecen disponibles.

Un visitante sin afinidades suficientes ve «Todavía no hay recomendaciones personalizadas» con invitación a explorar los filtros. No se fabrican intereses ni se configura entrenamiento en Tracardi.

Solo las respuestas aceptadas del tracker actualizan intereses. `profile.interests` como objeto reemplaza todo el mapa; `{}` elimina recomendaciones. Campo ausente o contenedor inválido (null, lista, texto) conserva el último mapa del mismo perfil. Dentro de un mapa válido, cada peso inválido equivale a0 sin descartar las otras categorías. Si Tracardi adopta otro perfil, se descartan intereses anteriores salvo un mapa válido en esa misma respuesta.

La persistencia propia `mastv.interests.v1` guarda `{profileId,interests}` y solo restaura si coincide con el perfil de `mastv.visitor.v1`. Datos corruptos se ignoran; sin almacenamiento funciona en memoria. Actualizar intereses refresca el listado sin cerrar detalle o diálogo ni emitir nuevas interacciones.

```sh
node --check js/interests.js
node --test --test-isolation=none tests/interests.test.cjs
```


## Ubicación consentida

`geocodingApi` en `js/config.js` configura la resolución inversa. Valor inicial: `https://nominatim.openstreetmap.org/reverse`, siguiendo la referencia de la demo. El navegador consulta ese proveedor externo con coordenadas únicamente tras pulsar Permitir y obtener permiso del navegador. El diálogo explica el destino externo antes de decidir; el catálogo incluye atribución a Nominatim y OpenStreetMap. Se necesita un origen seguro para Geolocation API (HTTPS o localhost), acceso al resolver y CORS compatible.

Se solicita `format=jsonv2&addressdetails=1` y se toma el primer código ISO válido de `address.ISO3166-2-lvl4`, `lvl3` o `lvl6`. Los códigos se normalizan con trim/mayúsculas. Con región válida, primero se eligen ofertas nacionales (cobertura nula, ausente o vacía) o de esa región; después se aplican los intereses de «Todos» o la categoría explícita. Sin región no se excluyen ofertas por cobertura. Los filtros siguen disponibles aunque la región no tenga ofertas en alguna categoría.

El almacenamiento propio `mastv.location.v1` guarda solo la región consentida, su fecha de consentimiento y el vínculo de sesión/perfil MASTV. No se guardan coordenadas en localStorage, sessionStorage ni eventos o consola. Las coordenadas se usan solo en memoria durante la consulta al resolver. La región local puede restaurarse sin nuevas coordenadas, resolución o evento por recarga. No se adopta una región de respuestas remotas de Tracardi. La primera asignación de perfil conserva la región consentida durante esa visita. Sin almacenamiento disponible, se mantiene en memoria.

«Cambiar ubicación» abre una nueva decisión: permitir y resolver correctamente sustituye la región; rechazar, cerrar o Escape retira la región guardada y recupera todas las coberturas, sin borrar intereses o eventos históricos. Durante una solicitud pendiente, esas acciones invalidan callbacks tardíos y abortan la resolución si ya empezó. Si una nueva resolución falla, se conserva la última región consentida y se explica; sin región previa se continúa sin exclusión regional. El feedback permanece visible en el catálogo.

Una región válida origina `geo-location` mediante el tracker existente, con `iso_region`, `ISO3166-2-lvl4`, `country`, `country_code`, `state`, `action: geo_consent_granted` y `consented_at`. El payload no contiene coordenadas. Solo una respuesta aceptada por el contrato del tracker actualiza perfil/intereses, como en US-003. Si no se confirma la recepción, la región local se conserva y se informa el fallo sin afirmar registro exitoso. No hay reenvío automático. La recepción del recolector no prueba ejecución de workflows.

El servicio público de Nominatim exige uso moderado, identificación mediante Referer y un máximo agregado de 1 petición por segundo por aplicación ([política del proveedor](https://operations.osmfoundation.org/policies/nominatim/), [API reverse](https://nominatim.org/release-docs/latest/api/Reverse/)). Esta entrega local hace una consulta por decisión, sin sondeo, con guardas de concurrencia y separación mínima de 1 segundo por página; restaurar no consulta. Esto no impone el límite agregado entre varios visitantes: antes de operar con tráfico, el responsable debe configurar un proveedor o instancia con capacidad adecuada y condiciones compatibles. No se garantiza capacidad productiva ni se añade un backend. La consulta declara `cache: no-store` para no conservar la URL con coordenadas en la caché HTTP y `referrerPolicy: origin` para identificar el origen sin exponer su ruta. No cambiar esta política para impedir la identificación del origen.

Comprobaciones sin dependencias nuevas:

```sh
node --check js/location.js
node --check js/app.js
node --check js/config.js
node --test --test-isolation=none tests/catalog.test.cjs tests/tracking.test.cjs tests/interests.test.cjs tests/location.test.cjs
```

Las pruebas de ubicación usan coordenadas sintéticas y un resolver/collector falsos. Cubren consentimiento, errores, restauración, retirada, callbacks tardíos, rate guard por página, persistencia y combinación regional con afinidades. No demuestran disponibilidad externa del geocodificador. Para QA de navegador, interceptar Strapi/Tracardi/Nominatim con ofertas y regiones sintéticas; comprobar Permitir/Rechazar/cierre/Escape, Tab, feedback tras cerrar el diálogo, ausencia de coordenadas en almacenamiento/eventos, cambio/retirada y restauración. Evitar consultas externas innecesarias durante QA.
