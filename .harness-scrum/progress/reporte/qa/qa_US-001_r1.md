# Reporte QA: US-001

**Fecha:** 2026-11-05
**Veredicto:** ❌ FALLA
**Proyecto:** `/home/swumplurd/Documentos/devsarrollo/repos/tracardi-mastv`

Los once escenarios base se ejecutaron en Chrome y pasaron. La variante con título y descripción remotos extensos detectó una confirmación de canje inaccesible en móvil: el diálogo excede el viewport y bloquea el desplazamiento. Requiere corrección antes de demo por la condición de Done de conservar diálogos y accesibilidad. No se altera el criterio para exigir todo el contenido visible simultáneamente: el defecto es no poder alcanzar los controles mediante desplazamiento normal.

## Ejecución y evidencia

Se leyeron historia/feature, informe `impl_US-001.md`, configuración y código final. El coordinador mantuvo congelados los archivos cargados por US-001 mientras se ejecutó QA. No se modificó implementación ni se instalaron dependencias.

**Directorio de todos los runners:** `/home/swumplurd/Documentos/devsarrollo/repos/tracardi-mastv`.
**Entorno:** Node 24.16.0; Google Chrome 156.0.8078.79 headless con sandbox normal; CDP nativo; origen HTTP local efímero. Ejecución de servidor/navegador/red mediante `exec_command require_escalated`.

| Comando ejecutado | Código | Resultado |
|---|---:|---|
| `node /tmp/tracardi-qa/us001.mjs` (repetición tras corregir runner) | 0 | 11 escenarios base PASS, perfiles Chrome independientes, puntero/teclado y portapapeles real; 0 excepciones Runtime y 0 console.error capturados. |
| `node /tmp/tracardi-qa/real-read.mjs` (repetición tras corregir espera del runner) | 0 | GET real Strapi desde Chrome: HTTP200, 7 registros y 7 tarjetas normalizadas, sin advertencia de omisión ni error. CORS permite el origen local de prueba. |
| `node /tmp/tracardi-qa/us001-regression.mjs` (desplazamiento del runner corregido) | 1 | 6 grupos PASS y 1 FAIL: texto remoto extenso en móvil. |
| `node /tmp/tracardi-qa/us001-regression.mjs --only-long` | 1 | Reproducción aislada del mismo defecto; rueda normal no mueve el diálogo ni alcanza Confirmar. |

La primera ronda del runner principal dio 8 PASS y 3 discrepancias por contar Google Fonts bloqueado como petición de catálogo; corregido el filtro del runner y repetidos los once con éxito. El GET real inicial esperaba antes del arranque de scripts; corregida la espera del runner. La primera ronda de regresión usaba scroll suave al medir coordenadas del clic; se corrigió exclusivamente el runner para usar desplazamiento instantáneo. Ninguna de esas incidencias requirió cambiar el producto. El defecto LONG persiste con el runner corregido.

Evidencia persistente en `evidencia/US-001/`: `results.json`, `regression.json`, `long-content-reproduction.json`, `long-confirm-bounds.json`, `us001-real-read.json`, `source-hashes.json`, capturas sintéticas y los runners/fixtures. La captura `long-confirm-320.png` muestra el defecto. Las capturas 01..11 solo contienen fixtures QA. `source-hashes.json` identifica el baseline validado.

## Resultado por escenario

### ✅ Escenario: Consultar la categoría con datos remotos
- **Given** respuesta sintética con un beneficio Comida y datos comerciales publicados → verificado.
- **When** se selecciona Comida mediante puntero en Chrome → ejecutado.
- **Then** tarjeta con título, comercio, descripción y descuento publicados; sin ofertas incrustadas ajenas a la respuesta → cumplido.
- **Evidencia:** `results.json` caso 01; `01.png`; una tarjeta y filtros Todos/Comida.

### ✅ Escenario: Reconocer una carga de catálogo en curso
- **Given** respuesta Strapi retenida → verificado.
- **When** se accede al catálogo antes de liberar la respuesta → ejecutado.
- **Then** `Cargando ofertas…`, aria-busy=true, sin tarjetas ni estado vacío durante la espera → cumplido.
- **Evidencia:** `results.json` caso 02; luego se liberó la respuesta y terminó la carga.

### ✅ Escenario: Consultar todas las páginas publicadas
- **Given** 101 ofertas Comida con IDs distintos en dos páginas → verificado.
- **When** termina la carga y se selecciona Comida → ejecutado.
- **Then** las 101 ofertas están disponibles y en orden; peticiones páginas 1/2, tamaño inicial100 → cumplido.
- **Evidencia:** `results.json` caso 03; `03.png` es una captura visible, el conteo completo procede de DOM y peticiones.

### ❌ Escenario: Abrir un detalle coherente con la tarjeta — variante con contenido extenso
- **Given** dos beneficios QA distintos con condiciones/cupón; adicionalmente un beneficio válido con título de 200 caracteres, descripción de 460 y cupón de140, sin restricciones de longitud en el contrato → verificado.
- **When** se abre el segundo beneficio en el caso base, y el beneficio LONG en viewport320×568; se solicita Canjear Promoción → ejecutado.
- **Then base** título/comercio/descripción/cupón/precios/moneda/vencimiento/tipo y resumen corresponden al segundo beneficio; Tab/Shift+Tab, Escape y retorno de foco funcionan → cumplido (`results.json` caso04).
- **Paso fallido en variante:** consulta y manejo accesible de la confirmación correspondiente al beneficio; condición de Done de conservar diálogos y accesibilidad.
- **Resultado real:** el cuadro fijo centra contenido más alto que la pantalla; se recorta la parte superior y quedan Confirmar/Cancelar por debajo del viewport, sin contenedor desplazable. Confirmar ocupa y640.70..688.70 con viewport de568; body overflow=hidden. La rueda de600 no cambia esos límites y dialog.scrollTop permanece0. Escape permite salir, pero el uso por puntero/táctil no permite alcanzar las acciones.
- **Evidencia:** `regression.json` último grupo; `long-content-reproduction.json`; `long-confirm-bounds.json`; `long-confirm-320.png` y `long-detail-320.png`.
- **Reproducción:** ejecutar `node /tmp/tracardi-qa/us001-regression.mjs --only-long`, con el código base congelado; el runner crea respuesta `offer('LONG','Comida',{titulo:'QA título '.repeat(20),descripcion:'QA descripción extensa '.repeat(20),codigo_cupon:'QA-CUPON-LARGO-'.repeat(10)})`. Rechazar ubicación, elegir Comida, Ver beneficio y Canjear Promoción. No se requieren datos reales.

### ✅ Escenario: Copiar el cupón publicado
- **Given** detalle con cupón QA, permisos Clipboard y pestaña enfocada → verificado.
- **When** se pulsa el control de copia mediante puntero → ejecutado.
- **Then** Clipboard API real devuelve el código publicado y la UI informa `¡Código copiado!` → cumplido.
- **Evidencia:** `results.json` caso05; `05.png`.

### ✅ Escenario: Reconocer un catálogo publicado sin ofertas
- **Given** Strapi responde200 con lista vacía → verificado.
- **When** finaliza la carga del catálogo → ejecutado.
- **Then** mensaje `No hay promociones disponibles.`, cero tarjetas, sin advertencia ni reintento → cumplido.
- **Evidencia:** `results.json` caso06; `06.png`.

### ✅ Escenario: Recuperar una carga fallida
- **Given** primera página válida y segunda con HTTP503 → verificado.
- **When** se consulta el catálogo → ejecutado.
- **Then** se informa fallo y se ofrece reintentar; cero tarjetas, sin parcial ni respaldo incrustado ni falso vacío → cumplido.
- **Evidencia:** `results.json` caso07; `07.png`; dos GET al catálogo.

### ✅ Escenario: Volver a intentar la carga
- **Given** primer GET falla por comunicación y el segundo entrega el beneficio QA → verificado.
- **When** se pulsa Reintentar y luego Comida → ejecutado.
- **Then** se consulta la oferta publicada y desaparece Reintentar → cumplido.
- **Evidencia:** `results.json` caso08; `08.png`; dos intentos de GET al catálogo.

### ✅ Escenario: Separar ofertas incompletas de ofertas utilizables
- **Given** registro sin identidad y beneficio Comida válido → verificado.
- **When** se selecciona Comida → ejecutado.
- **Then** una sola tarjeta abrible, de la oferta válida, y advertencia de información incompleta; la oferta sin identidad no tiene control abrible → cumplido.
- **Evidencia:** `results.json` caso09; `09.png`. La regresión verifica además todos inválidos con aviso y estado `No hay promociones utilizables disponibles.`, sin confundirlo con catálogo remoto vacío.

### ✅ Escenario: Consultar una oferta sin cupón
- **Given** oferta mínima válida sin código → verificado.
- **When** se abre su detalle y se intenta pulsar copia/canje → ejecutado.
- **Then** `Cupón no disponible`, controles disabled, portapapeles sin cambio y confirmación cerrada → cumplido.
- **Evidencia:** `results.json` caso10; `10.png`; Clipboard inicial sintético conservado.

### ✅ Escenario: Acceder al catálogo desde Inicio
- **Given** catálogo QA sin identificadores de ejemplos editoriales → verificado.
- **When** se visitan los tres destacados desde Inicio → ejecutado.
- **Then** todos llevan al catálogo remoto; no abren detalle fijo inexistente → cumplido.
- **Evidencia:** `results.json` caso11; `11.png`; tres accesos comprobados.

## Observaciones de calidad

- Los once escenarios no tienen Scenario Outline ni Background. Se ejecutaron individualmente con un perfil nuevo por escenario; las dependencias son solo fixtures del propio caso. Los escenarios futuros US-002..004 no se verifican en esta entrega.
- Regresión independiente de UI: lista raíz y contenedor ofertas; attributes y case/espacios de categoría; contenido HTML remoto conservado como texto sin ejecutar; todos omitidos; economía/moneda/fecha inválidas sin valores inventados; comercio/descripción ausentes. Todos pasan.
- Menú, ida/vuelta Inicio/Catálogo/Detalle, diálogos cancelar/cerrar/confirmación local y salida a catálogo pasan en320×568,430×932 y1024×768 con datos de longitud normal. Sin desborde horizontal en catálogo/detalle. Capturas `responsive-detail-*.png`. La confirmación local aclara que ocurre en este dispositivo; tracking está fuera de US-001.
- Las fuentes externas se bloquearon intencionalmente en los runners, usando fallback local. No se atribuye el bloqueo de fuente al producto ni se certifica la tipografía remota. No se realizó auditoría completa con lector de pantalla ni todos los navegadores: **NO VERIFICADA**; reproducir con revisión manual accesible en los entornos que se acuerden. Esto no sustituye el defecto de accesibilidad concreto ejecutado arriba.
- Lectura real: un GET desde navegador a `http://localhost:1337/api/offers`; respuesta data/meta de7 registros, normalización completa sin omisiones, CORS reflejó `http://127.0.0.1:35687`. La evidencia solo contiene claves/tipos/conteos, sin ofertas ni perfiles reales. No prueba despliegue ni otros orígenes.
- No hubo POST a Strapi/Tracardi ni consulta de perfiles ni geolocalización; en los runners se rechazó ubicación. No se hicieron commits, publicación o despliegue.
- PROJECT.md declara build/test/typecheck/lint/dev N/A. El developer ya registró15 pruebas unitarias; no se repitieron porque QA cubrió flujo de navegador independiente. Se comprobaron sintaxis de los runners durante preparación, no se presenta eso como evidencia funcional.

## Recomendaciones

- Acotar altura del diálogo al viewport y permitir desplazamiento interior manteniendo cierre y todo el contenido. Al repetir QA comprobar rueda/táctil, navegación Tab y controles Cancelar/Confirmar alcanzables; no exigir contenido y controles visibles simultáneamente.
- Considerar agregar un escenario explícito de confirmación con contenido remoto extenso en pantalla pequeña para conservar esta regresión; no se cambia el Gherkin desde QA.

## Decisión

- [ ] Aprobado para demo con usuario
- [x] Requiere corrección antes de demo (diálogo de confirmación con contenido extenso)
