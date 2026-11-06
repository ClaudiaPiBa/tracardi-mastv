# Refinamiento pendiente: ofertas Strapi y tracking Tracardi en MASTV

**Fecha:** 2026-11-05
**Rol:** Product Owner
**Estado:** Requiere aclaración de alcance antes de reservar IDs y redactar historias finales.
**Proyecto:** `/home/swumplurd/Documentos/devsarrollo/repos/tracardi-mastv`
**HARNESS_DIR:** `/home/swumplurd/Documentos/devsarrollo/repos/tracardi-mastv/.harness-scrum`
**Referencia consultada en solo lectura:** `/home/swumplurd/Documentos/devsarrollo/proyectos/tacardi-demo`
**Entrega:** borrador en `/tmp/tracardi-refinamiento/refinamiento.md`; no se modificó el proyecto ni su backlog.

## Preguntas de aclaración para presentar al usuario

1. **¿Qué significa «al igual que la demo» para las ofertas visibles?** Opción A: cargar ofertas Strapi y registrar filtros, apertura y confirmación de canje, manteniendo «Todos» como catálogo completo. Opción B: incluir también personalización por intereses y ubicación: «Todos» mostraría solo categorías con afinidad mayor que 1, ordenadas por afinidad; con ubicación aceptada mostraría ofertas nacionales y de la región, y se enviaría `geo-location`. La diferencia es relevante: en la demo, un visitante sin intereses puede ver «Todos» vacío aunque existan ofertas.
2. **¿Se utilizarán los mismos servicios de la demo o unos distintos?** Si son los mismos, tomar las direcciones locales observadas como valores de configuración candidatos y comprobar después el acceso del frontend. Si son distintos, el coordinador debe identificar las direcciones autorizadas y la fuente de eventos, sin pedir secretos por chat.

El Scrum Master informó de que ya presentó estas dos preguntas al usuario. No hay una tercera pregunta imprescindible: los detalles restantes se pueden proponer como supuestos concretos en Gate 1. Por ejemplo, para Inicio se puede conservar el contenido editorial y dirigir los accesos al catálogo remoto, sustituyendo el enlace fijo a `cinemex`; la referencia no ofrece un campo ni una regla para destacados dinámicos. Los puntos técnicos de abajo pueden resolverse mediante el entorno disponible, sin solicitar credenciales en el chat. Tras recibir respuestas, se podrá redactar el alcance y presentarlo en Gate 1; este informe no sustituye ese gate.

## Necesidad y valor identificados

Como visitante del catálogo de beneficios MASTV, quiero consultar ofertas administradas en Strapi y navegar o confirmar el canje de una oferta con sus datos vigentes, para utilizar beneficios sin depender de promociones de ejemplo incrustadas en el frontend.

Como responsable de beneficios, quiero que las interacciones se asocien al mismo visitante en Tracardi, para medir consultas y confirmaciones de canje por oferta y categoría.

## Evidencia del estado actual

- `js/app.js:3`: catálogo incrustado con dos ofertas; no hay carga remota ni tracking.
- `js/app.js:25`: render de tarjetas; `js/app.js:37`: filtro local por categoría; `js/app.js:42`: apertura del detalle con datos de la oferta seleccionada.
- `index.html:27`: Inicio tiene tres tarjetas editoriales; `index.html:30` apunta al identificador fijo `cinemex`. Ese identificador no tiene equivalencia garantizada en Strapi.
- `index.html:38`: filtros fijos «Todos», «Comida», «Cine», «Ropa».
- `js/app.js:67`: se solicita geolocalización, pero sus coordenadas se descartan y no hay región persistida ni filtro regional.
- `js/app.js:87`: confirmar canje solo intercambia diálogos; `index.html:66` afirma registro correcto sin servicio que lo respalde.
- `.harness-scrum/BACKLOG.md`: no hay historias; siguiente ID disponible `US-001`. No se reservó ese ID.
- `.harness-scrum/PROJECT.md`: declara HTML/CSS/JavaScript sin framework ni gestor, comandos N/A; descripción y convenciones pendientes. El coordinador comunicó que resolverá esos campos según el código real.

Las rutas de esta sección son relativas a PROJECT_PATH. No se encontraron archivos `AGENTS.md` en los ancestros/directorios de los dos proyectos consultados mediante lectura local; se aplicaron las instrucciones AGENTS facilitadas en la tarea y el rol del harness en `.codex/agents/product_owner.toml`.

## Contrato observado de Strapi en la referencia

Las rutas siguientes son relativas a `/home/swumplurd/Documentos/devsarrollo/proyectos/tacardi-demo`.

- `server.js:9`: dirección predeterminada `http://localhost:1337/api/offers`, configurable en la demo mediante `OFFERS_API`.
- `server.js:67`: consulta a Strapi y normalización; si no hay tamaño de página se solicita 100. Reconoce `data`, un array raíz o `ofertas`. Prioriza `id_offer`, después `documentId`, después `id` para el identificador comercial normalizado. Convierte precios y porcentaje de descuento a números.
- `server.js:89`: región desde `entidad_federativa`, con compatibilidad parcial para `attributes.entidad_federativa`. **No demuestra compatibilidad general con todo el contenido anidado en `attributes`.**
- `server.js:135`: `/api/ofertas` devuelve `ofertas`, `categorias`, `total`, `total_catalogo`, con filtro opcional por categoría y región. Es una ruta de Express en la demo, no una ruta implementada en el proyecto MASTV.
- `public/app.js:466`: primero consulta `/api/ofertas`; si falla consulta Strapi directamente. `server.js:113` puede usar el archivo local de contingencia cuando falla Strapi. MASTV no dispone de ese servidor ni de dicho archivo.

| Campo observado | Uso de negocio propuesto para evaluar en Gate 1 |
|---|---|
| `id_offer`, `documentId`, `id` | Identificación estable para selección de detalle y correlación de eventos |
| `titulo` | Nombre de tarjeta, detalle y confirmación de canje |
| `establecimiento` | Marca o comercio |
| `descripcion` | Descripción de tarjeta y detalle; el contrato observado no ofrece un subtítulo separado |
| `categoria` | Etiqueta, filtro y segmentación |
| `entidad_federativa` | Región; ausencia representa cobertura nacional en la demo |
| `descuento_porcentaje` | Insignia y descuento de la promoción |
| `precio_original`, `precio_oferta`, `moneda` | Datos económicos y propiedades de tracking; el diseño actual no muestra todos como campos separados |
| `codigo_cupon` | Código mostrado y copiado en el detalle |
| `fecha_expiracion`, `tipo_oferta` | Contexto de oferta en detalle de la demo y eventos de consulta |

No se observó un campo de logo, imagen o destacado en el contrato consumido por la demo. No debe inventarse una relación entre las marcas remotas y los SVG locales. Puede proponerse un recurso visual genérico cuando no haya imagen, pendiente de incluirlo como supuesto en Gate 1. Los nombres de campos del archivo de contingencia se inspeccionaron sin trasladar sus valores a esta entrega.

## Eventos observados de Tracardi

`public/app.js:1` configura la API local `http://localhost:8686` y una fuente de demostración. Es configuración de referencia, no verificación de que esa fuente esté autorizada para el nuevo frontend. `public/app.js:828` envía `POST /track` con `source.id`, `session.id`, perfil conocido o nulo, y una lista de eventos con tipo y propiedades.

| Acción real de la referencia | Tipo enviado | Datos observados | Evidencia |
|---|---|---|---|
| Filtrar una categoría conocida | `comida-seg`, `electronica-seg`, `cine-seg`, `ropa-seg`, `online-seg` | `category`, `action: category_filter`, `filter_time` | `public/app.js:506` |
| Seleccionar «Todas» o categoría sin correspondencia | `category-filter` | `category`, `filter_time` | `public/app.js:541` |
| Abrir detalle | `offer-click` y `offer-view` | `id`, `offer_id`, `title`, `category`, `entidad_federativa`, `store`, `price_original`, `price`, `price_offer`, `discount_percentage`, `coupon_code`, `expiration_date`, `offer_type`, `action: offer_click` | `public/app.js:780` |
| Confirmar canje | `offer-redeem` | `id`, `offer_id`, `title`, `category`, `store`, `price`, `price_original`, `discount_percentage`, `coupon`, `coupon_code`, `entidad_federativa`, `action: offer_redeem`, `redeemed_at` | `public/app.js:929` |
| Aceptar ubicación y resolver una región | `geo-location` | `iso_region`, `ISO3166-2-lvl4`, `country`, `country_code`, `state`, `action: geo_consent_granted`, `consented_at` | `public/app.js:1385` |

- `public/app.js:6`: mantiene sesión y perfil en almacenamiento local; `public/app.js:856` conserva el identificador de perfil devuelto por Tracardi y actualiza intereses. El refinamiento deberá cubrir continuidad de identidad y persistencia no disponible.
- `public/app.js:549`: aplica elegibilidad regional y, en «Todas», afinidad mayor que 1 y orden descendente por interés. No equivale a un catálogo completo para un nuevo visitante.
- `public/app.js:1356`: resuelve coordenadas mediante geocodificación inversa externa. El evento de región no contiene coordenadas; el frontend sí las usa para la consulta de geocodificación. Incorporarlo requiere aprobar ese comportamiento y verificar un servicio permitido.
- `public/app.js:819`: copiar cupón no dispara un evento propio en el flujo de ofertas observado.
- La demo incluye también herramientas manuales, webhooks e inspector; no se infiere su inclusión en MASTV a partir de pedir consumo de datos y tracking.
- `public/app.js:1006`: las métricas de promociones son otro servicio de la demo. El envío a Tracardi no requiere reproducir ese panel ni métricas simuladas.

## Descomposición candidata tras aclarar el alcance

Sin IDs reservados y sin estado «Refinada» hasta resolver las preguntas:

1. **Consultar beneficios administrados en Strapi**: carga, categorías del catálogo remoto, selección y detalle coherentes, código, estado vacío, error de carga, oferta incompleta y tratamiento del Inicio acordado. Talla candidata L, por cuatro o más comportamientos y adaptación del contrato remoto.
2. **Medir interacción y confirmación de canje en Tracardi**: filtros, consulta de oferta, confirmación explícita, cancelación sin canje, identidad continua y fallo del recolector. Talla candidata L; depende de la primera para datos e identificadores consistentes.
3. **Solo si se elige paridad de personalización:** historias separadas de preferencias y región, con límites de consentimiento, datos regionales, visitante sin intereses y servicios externos. No se debe introducir filtrado por afinidad dentro de la historia de carga de Strapi sin aprobación expresa.

Las pruebas de tracking deben comprobar eventos reales aceptados o evidencia controlada de la petición y del manejo de error, distinguiendo ambas. Un escenario contra servicios externos no ejecutado debe constar como pendiente. Los datos de prueba serán sintéticos.

## Puntos técnicos a resolver por el coordinador antes de delegar implementación

- Confirmar entorno de acceso a Strapi y Tracardi, fuente de eventos para MASTV y lectura desde navegador. Las direcciones locales son valores encontrados en código, no servicios comprobados en esta sesión.
- Elegir acceso directo configurable para el frontend o dependencia explícita de un proxy existente. No introducir Express, npm ni copiar el servidor de la demo por suposición.
- Si Strapi requiere un secreto de servidor, acordar un intermediario autorizado; no incrustarlo en el frontend. No se consultaron ni transcribieron valores de configuración privada.
- Acordar datos incompletos, categoría desconocida, páginas posteriores a 100 y contingencia; no confundir un fallo de Strapi con un catálogo vacío ni sustituirlo silenciosamente por ofertas de ejemplo.
- El usuario pidió tracking del canje: el evento representa la confirmación del visitante. La referencia no demuestra una transacción de validación externa o reserva de cupón. No ampliar a un sistema de canjes definitivo por inferencia; el texto de éxito deberá describir solo lo que efectivamente se registra.
- El código de referencia consume respuestas del recolector sin comprobar siempre el resultado HTTP; no copiar ese comportamiento como criterio de éxito. La implementación deberá distinguir fallo y aceptación para evitar afirmar un registro inexistente.

## Evidencia y límites de esta revisión

Se leyeron los archivos locales citados, PROJECT.md, BACKLOG.md, plantilla de historia y definición del rol. No se ejecutaron servicios, no se consultaron redes ni se verificó el esquema activo de Strapi o la aceptación de eventos en Tracardi. La revisión describe comportamiento del código de referencia, no disponibilidad o funcionamiento comprobados. No se modificaron código, configuración, datos ni archivos del HARNESS_DIR. No se reservaron IDs, no se crearon historias o features finales y no se ejecutaron commits o publicaciones.
