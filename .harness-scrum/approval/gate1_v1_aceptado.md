# Gate 1 — Alcance Strapi, Tracardi y personalización (revisión 1)

**Fecha:** 2026-11-05
**Estado:** Pendiente de aprobación afirmativa explícita.
**Historias:** US-001, US-002, US-003, US-004

## Aclaraciones resueltas por el usuario

Respuesta recibida: «tambien incluye la personalizacion de ubicacion e intereses; se usaran los mismos servicios de strapi y tracardi».
Esta respuesta resuelve las preguntas de refinamiento; no constituye aprobación de las historias que se presentan ahora.

## Decisión requerida

Aprobar o rechazar el alcance de las historias y criterios Gherkin de esta revisión. Se puede aprobar el conjunto indicando los IDs; si hay cambios se enviarán al Product Owner y se presentará una revisión nueva. No se implementará antes de una aprobación explícita.

## Reglas relevantes del alcance

- Consumir las ofertas administradas por los mismos servicios de la demo y mantener la interfaz MASTV.
- Registrar interacciones con identidad continua de visitante y distinguir fallo de tracking de recepción confirmada.
- Replicar la regla de intereses de la demo: «Todos» solo muestra categorías con afinidad mayor que 1, ordenadas por afinidad; sin afinidad suficiente puede quedar vacío. Las categorías explícitas permiten explorar otras ofertas respetando el filtro regional.
- Ubicación opcional con permiso: incluir ofertas nacionales y de la región resuelta. Rechazar retira la región; una primera resolución fallida permite navegar sin filtro regional y una actualización fallida conserva la última región consentida.
- Resolver región mediante Nominatim, como la referencia, sin conservar coordenadas ni enviarlas a Tracardi. Se podrá cambiar o retirar la región local.
- Registrar confirmación de canje como interacción; no implica validar un cupón ni completar una transacción externa.
- No se incluyen paneles, simulador de perfiles, webhooks ni Google Analytics de la demo.
- Las historias incluyen sus supuestos y limitaciones, que forman parte de esta revisión. Servicios y escenarios todavía no ejecutados no se presentan como verificados.

## Preguntas

No quedan preguntas de refinamiento abiertas; se requiere decisión de Gate 1 sobre este documento completo.

## US-001

Historia: [archivo](../stories/US-001.md)

# US-001: Consultar beneficios vigentes administrados en Strapi

**Estado:** Refinada

**Como** visitante de MASTV
**Quiero** consultar el catálogo y el detalle con los datos publicados en Strapi
**Para** elegir y utilizar un beneficio con información y cupón coherentes

## Criterios de aceptación

Ver escenarios completos en: `features/US-001-catalogo-strapi.feature`

### Resumen de escenarios

- [ ] Consultar la categoría con datos remotos
- [ ] Reconocer una carga de catálogo en curso
- [ ] Consultar todas las páginas publicadas
- [ ] Abrir un detalle coherente con la tarjeta
- [ ] Copiar el cupón publicado
- [ ] Reconocer un catálogo publicado sin ofertas
- [ ] Recuperar una carga fallida
- [ ] Volver a intentar la carga
- [ ] Separar ofertas incompletas de ofertas utilizables
- [ ] Consultar una oferta sin cupón
- [ ] Acceder al catálogo desde Inicio

## Definición de Done

- [ ] Código implementado y revisado
- [ ] Todos los escenarios Gherkin pasan con evidencia; los no ejecutados se identifican como pendientes
- [ ] Sin regresiones en navegación, filtros, copia, diálogos, teclado y accesibilidad existentes
- [ ] Documentación de configuración y verificación actualizada
- [ ] Evidencia con datos sintéticos; no se incluyen credenciales, perfiles reales ni coordenadas

## Notas de refinamiento

- **Estimación:** L (1 día); más de cuatro comportamientos y reglas de integración
- **Prioridad:** Alta
- **Dependencias:** Ninguna
- **Aprobación:** alcance refinado para Gate 1; pendiente de aprobación explícita de esta revisión
- **Contrato:** mismo servicio de la demo: acceso directo configurable a `http://localhost:1337/api/offers`. Frontend estático; no añadir Express ni gestor de paquetes. Leer todas las páginas indicadas por la respuesta, con tamaño de página inicial 100; aceptar lista raíz, `data` o `ofertas`, normalizando campos planos o bajo `attributes` cuando existan. No copiar contingencia de la demo ni sus datos.
- **Identidad de oferta:** primer identificador no vacío de `id_offer`, `documentId`, `id`, convertido a texto; conservar identificadores originales para trazabilidad. Título y categoría no vacíos también son mínimos para mostrar una oferta; omitir registros sin esos mínimos y avisar que algunas ofertas no están disponibles. Si todos se omiten, mostrar ese aviso y un estado vacío, no afirmar que el catálogo remoto está vacío.
- **Correspondencia:** `titulo` → nombre; `establecimiento` → comercio; `descripcion` → descripción; `categoria` → categoría; `entidad_federativa` → cobertura; `descuento_porcentaje` → descuento; `codigo_cupon` → código. Conservar `precio_original`, `precio_oferta`, `moneda`, `fecha_expiracion`, `tipo_oferta` para detalle y tracking. Mostrar importes, descuento, moneda y vencimiento solo cuando sean válidos; no convertir ausencias en ceros ni inventar descuentos, códigos, moneda o logos. Descripción/comercio ausentes pueden indicarse como no disponibles. Sin cupón, detalle consultable pero copia y confirmación de canje no disponibles.
- **Supuestos para Gate 1:** categorías desde las ofertas válidas, más «Todos»; comparación sin distinguir mayúsculas y espacios exteriores, sin inventar alias. Recurso visual genérico por categoría en lugar de logos de marcas no suministrados. Conservar Inicio editorial y dirigir sus accesos al catálogo remoto, eliminando la dependencia del identificador fijo de ejemplo. No crear un motor de destacados ni caducidad automática: Strapi determina las ofertas publicadas; la fecha se informa si existe.
- **Relación con personalización:** esta historia entrega la fuente de ofertas y el filtro explícito. US-003 define la selección «Todos»; US-004 restringe la región. No son catálogos paralelos ni se conservan ofertas incrustadas como respaldo.

## Evidencia del refinamiento

Referencia de solo lectura: `/home/swumplurd/Documentos/devsarrollo/proyectos/tacardi-demo`; contrato y líneas relevantes en `progress/reporte/refinamiento/ref_strapi_tracardi.md`. Configuración y convenciones: `PROJECT.md`. Las respuestas del usuario incluyen personalización por ubicación e intereses y los mismos servicios Strapi/Tracardi. No se ejecutaron servicios en este refinamiento; disponibilidad, lectura desde navegador y recepción efectiva de eventos deben verificarse durante implementación/QA.


Criterios: [feature](../features/US-001-catalogo-strapi.feature)

```gherkin
# language: en
Feature: Consultar beneficios vigentes administrados en Strapi
  Como visitante de MASTV
  Quiero consultar el catálogo y el detalle con los datos publicados en Strapi
  Para elegir y utilizar un beneficio con información y cupón coherentes

  Scenario: Consultar la categoría con datos remotos
    Given Strapi publica un beneficio de Comida con título, comercio, descripción, descuento y cupón de prueba
    When el visitante consulta la categoría Comida
    Then la tarjeta muestra los datos publicados de ese beneficio
    And no aparecen las ofertas de ejemplo que ya no publica Strapi

  Scenario: Reconocer una carga de catálogo en curso
    Given la consulta a Strapi aún no ha terminado
    When el visitante accede al catálogo
    Then se informa que las ofertas se están cargando
    And no se presenta la espera como ausencia de promociones

  Scenario: Consultar todas las páginas publicadas
    Given Strapi publica más de una página de ofertas de Comida con identificadores distintos
    When el visitante consulta la categoría Comida tras finalizar la carga
    Then están disponibles las ofertas de todas las páginas publicadas de esa categoría

  Scenario: Abrir un detalle coherente con la tarjeta
    Given un beneficio remoto de Comida tiene un cupón de prueba y condiciones comerciales publicadas
    When el visitante abre su detalle desde la categoría Comida
    Then consulta el título, descripción, cupón y condiciones de ese mismo beneficio
    And la confirmación de canje corresponde a ese beneficio

  Scenario: Copiar el cupón publicado
    Given el visitante consulta un beneficio con cupón de prueba y la copia está permitida
    When solicita copiar el cupón
    Then recibe el código publicado de ese beneficio en el portapapeles
    And se informa que el código fue copiado

  Scenario: Reconocer un catálogo publicado sin ofertas
    Given Strapi responde correctamente con un catálogo sin ofertas
    When el visitante consulta el catálogo
    Then se informa que no hay promociones disponibles

  Scenario: Recuperar una carga fallida
    Given Strapi no pudo entregar el catálogo completo
    When el visitante consulta el catálogo
    Then se informa que no se pudieron cargar las ofertas y se ofrece reintentar
    And no se muestran ofertas de ejemplo o un catálogo parcial como si estuviera completo

  Scenario: Volver a intentar la carga
    Given una carga anterior falló y Strapi ya puede entregar el catálogo
    When el visitante vuelve a intentar la carga
    Then puede consultar las ofertas publicadas mediante sus categorías

  Scenario: Separar ofertas incompletas de ofertas utilizables
    Given Strapi publica una oferta sin identidad y otra oferta de Comida con datos mínimos válidos
    When el visitante consulta la categoría Comida
    Then se muestra la oferta válida y se informa que algunas ofertas no están disponibles
    And no puede abrirse la oferta sin identidad

  Scenario: Consultar una oferta sin cupón
    Given Strapi publica un beneficio de Comida con identidad y título pero sin cupón
    When el visitante abre su detalle desde Comida
    Then se informa que el cupón no está disponible
    And no se permite copiar un código ni confirmar un canje de ese beneficio

  Scenario: Acceder al catálogo desde Inicio
    Given el catálogo remoto no contiene ninguna de las ofertas de ejemplo del Inicio
    When el visitante elige ver un beneficio destacado del Inicio
    Then accede al catálogo remoto sin intentar abrir una oferta fija inexistente
```

## US-002

Historia: [archivo](../stories/US-002.md)

# US-002: Registrar consultas y confirmaciones de canje en Tracardi

**Estado:** Refinada

**Como** responsable de beneficios MASTV
**Quiero** medir filtros, consultas y confirmaciones de canje asociadas al visitante
**Para** comparar el interés y las confirmaciones por oferta sin contar cancelaciones como canjes

## Criterios de aceptación

Ver escenarios completos en: `features/US-002-tracking-tracardi.feature`

### Resumen de escenarios

- [ ] Registrar la selección de un filtro
- [ ] Registrar la apertura de un beneficio
- [ ] Vincular nuevas interacciones con el perfil recibido
- [ ] Mantener la identidad al recargar
- [ ] Seguir midiendo durante una visita sin persistencia disponible
- [ ] Confirmar el registro de un canje
- [ ] Abandonar una confirmación sin registrar canje
- [ ] Evitar confirmaciones repetidas mientras se procesa una acción
- [ ] Informar un registro de canje no confirmado
- [ ] Continuar consultando si falla la medición
- [ ] Actualizar el catálogo sin contar otra interacción

## Definición de Done

- [ ] Código implementado y revisado
- [ ] Todos los escenarios Gherkin pasan con evidencia; los no ejecutados se identifican como pendientes
- [ ] Sin regresiones en navegación, filtros, copia, diálogos, teclado y accesibilidad existentes
- [ ] Documentación de configuración y verificación actualizada
- [ ] Evidencia con datos sintéticos; no se incluyen credenciales, perfiles reales ni coordenadas

## Notas de refinamiento

- **Estimación:** L (1 día); más de cuatro comportamientos y reglas de integración
- **Prioridad:** Alta
- **Dependencias:** US-001
- **Aprobación:** alcance refinado para Gate 1; pendiente de aprobación explícita de esta revisión
- **Contrato:** mismo recolector de la demo, `http://localhost:8686/track`, y fuente `demo-source`, configurables en un único lugar del frontend. Enviar `source.id`, `session.id`, perfil conocido o nulo y eventos con tipo y propiedades. No incorporar claves administrativas, inicialización de fuentes, inspector, webhooks, métricas simuladas ni panel de analítica de la demo.
- **Eventos de filtros:** `comida-seg`, `electronica-seg`, `cine-seg`, `ropa-seg`, `online-seg` para sus categorías; `category-filter` para «Todos» o categoría no mapeada. Propiedades de referencia: `category`, `filter_time`; `action: category_filter` en segmentación. Se emiten al seleccionar el filtro, no al renderizar o actualizar automáticamente las ofertas.
- **Eventos de apertura:** una emisión de `offer-click` y una de `offer-view` por apertura efectiva del detalle. Propiedades: `id`, `offer_id`, `title`, `category`, `store`, `entidad_federativa`, `price_original`, `price`, `price_offer`, `discount_percentage`, `coupon_code`, `expiration_date`, `offer_type`, `action: offer_click`, tomadas de la oferta normalizada. Datos opcionales ausentes se omiten o envían nulos; no fabricar valores económicos.
- **Evento de confirmación:** `offer-redeem` solo tras confirmación explícita y con cupón disponible; propiedades `id`, `offer_id`, `title`, `category`, `store`, `price`, `price_original`, `discount_percentage`, `coupon`, `coupon_code`, `entidad_federativa`, `action: offer_redeem`, `redeemed_at`. Una confirmación pendiente bloquea confirmaciones repetidas de la misma acción. No se pide garantía de entrega exactamente una vez ante incertidumbre de red ni reenvíos automáticos de canjes.
- **Identidad:** sesión anónima persistida y perfil devuelto por el recolector reutilizados entre eventos y recargas, como el modelo de la demo. Usar un espacio de almacenamiento propio de MASTV para sesión, perfil, intereses y región, evitando mezclar el navegador con la demo. Persistencia sin caducidad añadida en esta entrega, equivalente al comportamiento de referencia; si no está disponible, conservar identidad y preferencias en memoria durante la visita. Coordinar el primer envío antes de posteriores eventos para aprovechar el perfil inicial sin crear perfiles distintos por aperturas simultáneas.
- **Supuestos para Gate 1:** el canje registra una confirmación del visitante; no valida consumo, inventario, unicidad del cupón ni aceptación por el comercio. El mensaje de éxito dirá que la confirmación se registró únicamente tras respuesta válida de aceptación de Tracardi, sin atribuir validación comercial. Ante rechazo, respuesta inválida o fallo de red, informar que no pudo confirmarse el registro y permitir continuar; no mostrar éxito ni cambiar identidad con la respuesta fallida. La navegación y la copia de cupón siguen disponibles aunque el tracking falle. No añadir eventos automáticos de vista de página o copia no presentes en el flujo de ofertas de referencia.

## Evidencia del refinamiento

Referencia de solo lectura: `/home/swumplurd/Documentos/devsarrollo/proyectos/tacardi-demo`; contrato y líneas relevantes en `progress/reporte/refinamiento/ref_strapi_tracardi.md`. Configuración y convenciones: `PROJECT.md`. Las respuestas del usuario incluyen personalización por ubicación e intereses y los mismos servicios Strapi/Tracardi. No se ejecutaron servicios en este refinamiento; disponibilidad, lectura desde navegador y recepción efectiva de eventos deben verificarse durante implementación/QA.


Criterios: [feature](../features/US-002-tracking-tracardi.feature)

```gherkin
# language: en
Feature: Registrar consultas y confirmaciones de canje en Tracardi
  Como responsable de beneficios MASTV
  Quiero medir filtros, consultas y confirmaciones de canje asociadas al visitante
  Para comparar el interés y las confirmaciones por oferta sin contar cancelaciones como canjes

  Scenario Outline: Registrar la selección de un filtro
    Given el catálogo ofrece el filtro <categoria>
    When el visitante selecciona <categoria>
    Then Tracardi recibe un evento de <evento> asociado al visitante y esa selección

    Examples:
      | categoria   | evento          |
      | Comida      | comida-seg      |
      | Electronica | electronica-seg |
      | Cine        | cine-seg        |
      | Ropa        | ropa-seg        |
      | Online      | online-seg      |
      | Todos       | category-filter |
      | Viajes      | category-filter |

  Scenario: Registrar la apertura de un beneficio
    Given un beneficio remoto con datos comerciales válidos está disponible en su categoría
    When el visitante abre el detalle del beneficio
    Then Tracardi recibe una consulta y una apertura correspondientes a ese mismo beneficio
    And ambas incluyen su identidad comercial y los datos de oferta publicados

  Scenario: Vincular nuevas interacciones con el perfil recibido
    Given el visitante tiene una sesión anónima y Tracardi aceptó una primera interacción devolviendo un perfil
    When el visitante realiza otra interacción
    Then Tracardi recibe esa interacción con la misma sesión y el perfil recibido

  Scenario: Mantener la identidad al recargar
    Given la sesión y el perfil MASTV del visitante pudieron conservarse en este navegador
    When el visitante recarga MASTV y consulta otro beneficio
    Then la nueva consulta se asocia con la sesión y el perfil conservados

  Scenario: Seguir midiendo durante una visita sin persistencia disponible
    Given el navegador no permite conservar datos entre visitas y ya existe una sesión en la visita actual
    When el visitante realiza otra interacción durante esa visita
    Then la interacción mantiene la sesión y el perfil conocidos durante la visita

  Scenario: Confirmar el registro de un canje
    Given el visitante revisa la confirmación de un beneficio con cupón y Tracardi acepta su registro
    When confirma el canje
    Then Tracardi recibe una confirmación con el identificador, cupón y datos comerciales de ese beneficio
    And el visitante recibe un mensaje de confirmación registrada

  Scenario Outline: Abandonar una confirmación sin registrar canje
    Given el visitante tiene abierta la confirmación de un beneficio
    When abandona la confirmación mediante <salida>
    Then no se registra un canje en Tracardi

    Examples:
      | salida              |
      | cancelar            |
      | cerrar el diálogo   |
      | la tecla de escape  |

  Scenario: Evitar confirmaciones repetidas mientras se procesa una acción
    Given una confirmación de canje ya está en proceso
    When el visitante intenta confirmarla de nuevo antes de recibir el resultado
    Then solo se envía una confirmación para esa acción pendiente

  Scenario Outline: Informar un registro de canje no confirmado
    Given Tracardi devuelve <resultado> al registrar un canje
    When el visitante confirma el canje de un beneficio con cupón
    Then se informa que no pudo confirmarse el registro
    And no se muestra un mensaje de canje registrado

    Examples:
      | resultado                         |
      | rechazo del registro              |
      | respuesta sin aceptación válida   |
      | fallo de comunicación             |

  Scenario: Continuar consultando si falla la medición
    Given las ofertas están cargadas y el servicio de tracking no está disponible
    When el visitante abre un beneficio desde su categoría
    Then puede consultar el detalle y copiar el cupón disponible

  Scenario: Actualizar el catálogo sin contar otra interacción
    Given el visitante ya seleccionó una categoría y su interacción fue registrada
    When el catálogo se actualiza por una respuesta de personalización
    Then no se registra otra selección de filtro ni apertura de oferta por esa actualización
```

## US-003

Historia: [archivo](../stories/US-003.md)

# US-003: Descubrir beneficios según los intereses del visitante

**Estado:** Refinada

**Como** visitante de MASTV
**Quiero** ver recomendaciones ajustadas a mis intereses y explorar otras categorías
**Para** encontrar primero beneficios afines sin perder el acceso a categorías nuevas

## Criterios de aceptación

Ver escenarios completos en: `features/US-003-personalizacion-intereses.feature`

### Resumen de escenarios

- [ ] Ordenar recomendaciones por afinidad
- [ ] Excluir categorías sin afinidad suficiente
- [ ] Reconocer un visitante sin recomendaciones
- [ ] Explorar una categoría sin interés previo
- [ ] Aplicar nuevos intereses recibidos
- [ ] Eliminar recomendaciones tras recibir intereses vacíos
- [ ] Conservar los últimos intereses válidos
- [ ] Recuperar recomendaciones al volver al sitio
- [ ] Ignorar preferencias conservadas que no pueden interpretarse

## Definición de Done

- [ ] Código implementado y revisado
- [ ] Todos los escenarios Gherkin pasan con evidencia; los no ejecutados se identifican como pendientes
- [ ] Sin regresiones en navegación, filtros, copia, diálogos, teclado y accesibilidad existentes
- [ ] Documentación de configuración y verificación actualizada
- [ ] Evidencia con datos sintéticos; no se incluyen credenciales, perfiles reales ni coordenadas

## Notas de refinamiento

- **Estimación:** L (1 día); más de cuatro comportamientos y reglas de integración
- **Prioridad:** Alta
- **Dependencias:** US-001, US-002
- **Aprobación:** alcance refinado para Gate 1; pendiente de aprobación explícita de esta revisión
- **Regla de la demo:** «Todos» es una vista de recomendaciones, no el catálogo completo. Solo categorías con afinidad numérica estrictamente mayor que 1; orden descendente, manteniendo orden del catálogo para empates. Comparar categorías e intereses sin distinguir mayúsculas ni espacios exteriores. Categoría sin afinidad o con valor inválido/no finito equivale a 0. Se aceptan valores numéricos en texto como en la referencia.
- **Categoría explícita:** muestra todas las ofertas de esa categoría con independencia de la afinidad; mantiene elegibilidad regional definida en US-004. Ninguna categoría desaparece de los filtros porque no tenga afinidad; las categorías se derivan del catálogo remoto válido.
- **Actualización:** consumir `profile.interests` de respuestas válidas y aceptadas de Tracardi, incluidas las de región. Reemplazar el mapa completo cuando esté presente; un mapa vacío elimina recomendaciones previas. Si el campo está ausente o la petición falla, mantener el último mapa válido. Una respuesta con intereses malformados no sustituye un mapa válido. Volver a calcular resultados inmediatamente sin emitir nuevas interacciones por el render.
- **Supuestos para Gate 1:** sin intereses, o con todos los pesos menores o iguales a 1, «Todos» estará vacío aunque Strapi tenga ofertas. Mostrar mensaje específico de recomendaciones aún no disponibles y accesos a categorías para generar interacciones. No asignar afinidades artificiales ni entrenar reglas o workflows de Tracardi desde el frontend. Su servicio calcula los intereses; el frontend consume las respuestas y puede mostrar el último mapa guardado hasta recibir otro.
- **Persistencia:** guardar intereses válidos junto al perfil MASTV conocido definido en US-002. Datos guardados corruptos se ignoran. Si no pueden persistirse se usan en memoria; no mezclar recomendaciones de perfiles distintos. Al adoptar otro perfil, invalidar los intereses anteriores salvo los que aporte la misma respuesta válida.
- **Composición:** aplicar primero elegibilidad regional de US-004 y luego afinidad u opción explícita. La personalización solo actualiza el listado; no cierra un detalle o diálogo abierto. En una nueva apertura se respeta el catálogo y la elegibilidad actuales.

## Evidencia del refinamiento

Referencia de solo lectura: `/home/swumplurd/Documentos/devsarrollo/proyectos/tacardi-demo`; contrato y líneas relevantes en `progress/reporte/refinamiento/ref_strapi_tracardi.md`. Configuración y convenciones: `PROJECT.md`. Las respuestas del usuario incluyen personalización por ubicación e intereses y los mismos servicios Strapi/Tracardi. No se ejecutaron servicios en este refinamiento; disponibilidad, lectura desde navegador y recepción efectiva de eventos deben verificarse durante implementación/QA.


Criterios: [feature](../features/US-003-personalizacion-intereses.feature)

```gherkin
# language: en
Feature: Descubrir beneficios según los intereses del visitante
  Como visitante de MASTV
  Quiero ver recomendaciones ajustadas a mis intereses y explorar otras categorías
  Para encontrar primero beneficios afines sin perder el acceso a categorías nuevas

  Scenario: Ordenar recomendaciones por afinidad
    Given el visitante sin región registrada tiene afinidad 4 en Comida, 2 en Cine y 1 en Ropa con ofertas publicadas en esas categorías
    When consulta Todos
    Then ve las ofertas de Comida antes que las de Cine
    And no ve las ofertas de Ropa en las recomendaciones

  Scenario Outline: Excluir categorías sin afinidad suficiente
    Given un beneficio pertenece a una categoría cuyo interés del visitante es <interes>
    When el visitante consulta Todos
    Then ese beneficio no aparece en las recomendaciones

    Examples:
      | interes              |
      | ausente              |
      | cero                 |
      | uno                  |
      | negativo             |
      | no numérico          |

  Scenario: Reconocer un visitante sin recomendaciones
    Given Strapi publica ofertas y el visitante no tiene intereses registrados
    When consulta Todos
    Then se informa que todavía no hay recomendaciones personalizadas
    And se ofrecen las categorías disponibles para explorar ofertas

  Scenario: Explorar una categoría sin interés previo
    Given el visitante no tiene afinidad en Cine y hay ofertas de Cine elegibles para su región
    When selecciona Cine
    Then ve las ofertas elegibles de Cine sin exclusión por afinidad

  Scenario: Aplicar nuevos intereses recibidos
    Given el visitante consulta Todos con un mapa de intereses anterior
    When Tracardi acepta una interacción y devuelve un nuevo mapa válido de intereses
    Then las recomendaciones se recalculan con el nuevo mapa completo
    And reflejan las nuevas afinidades sin recargar la página

  Scenario: Eliminar recomendaciones tras recibir intereses vacíos
    Given el visitante tiene recomendaciones basadas en intereses anteriores
    When Tracardi devuelve un mapa de intereses vacío en una interacción aceptada
    Then Todos muestra el estado sin recomendaciones personalizadas

  Scenario Outline: Conservar los últimos intereses válidos
    Given el visitante tiene un mapa válido de intereses
    When la siguiente interacción devuelve <resultado>
    Then las recomendaciones conservan el último mapa válido

    Examples:
      | resultado                        |
      | aceptación sin intereses         |
      | aceptación con intereses inválidos |
      | rechazo del registro             |
      | fallo de comunicación            |

  Scenario: Recuperar recomendaciones al volver al sitio
    Given el navegador conserva un perfil MASTV y sus intereses válidos
    When el visitante vuelve a MASTV y finaliza la carga del catálogo
    Then Todos aplica los intereses conservados para ese perfil

  Scenario: Ignorar preferencias conservadas que no pueden interpretarse
    Given los intereses conservados del visitante no se pueden interpretar
    When el visitante consulta Todos después de cargar las ofertas
    Then ve el estado sin recomendaciones y puede explorar categorías
```

## US-004

Historia: [archivo](../stories/US-004.md)

# US-004: Consultar beneficios disponibles en la región consentida

**Estado:** Refinada

**Como** visitante de MASTV
**Quiero** compartir o retirar mi ubicación para consultar beneficios nacionales y de mi región
**Para** evitar recomendaciones regionales que no puedo utilizar y conservar el acceso si no comparto mi ubicación

## Criterios de aceptación

Ver escenarios completos en: `features/US-004-personalizacion-ubicacion.feature`

### Resumen de escenarios

- [ ] Esperar una decisión antes de solicitar ubicación
- [ ] Aplicar una región resuelta con consentimiento
- [ ] Asociar región al visitante sin coordenadas
- [ ] Continuar sin compartir ubicación
- [ ] Continuar cuando no puede determinarse la región
- [ ] Restaurar una región consentida
- [ ] Sustituir la región por una nueva decisión
- [ ] Retirar una región conservada
- [ ] Conservar la región anterior si falla su actualización
- [ ] Aplicar la región aunque no pueda sincronizarse su evento
- [ ] Combinar afinidad con elegibilidad regional
- [ ] Actualizar afinidades devueltas al sincronizar región

## Definición de Done

- [ ] Código implementado y revisado
- [ ] Todos los escenarios Gherkin pasan con evidencia; los no ejecutados se identifican como pendientes
- [ ] Sin regresiones en navegación, filtros, copia, diálogos, teclado y accesibilidad existentes
- [ ] Documentación de configuración y verificación actualizada
- [ ] Evidencia con datos sintéticos; no se incluyen credenciales, perfiles reales ni coordenadas

## Notas de refinamiento

- **Estimación:** L (1 día); más de cuatro comportamientos y reglas de integración
- **Prioridad:** Alta
- **Dependencias:** US-001, US-002, US-003
- **Aprobación:** alcance refinado para Gate 1; pendiente de aprobación explícita de esta revisión
- **Consentimiento:** antes de solicitar geolocalización, presentar el diálogo con permitir, rechazar y cerrar. Rechazar, cerrar o salir con Escape implica continuar sin ubicación para esta decisión. Añadir acceso visible «Cambiar ubicación» para volver a decidir; rechazar una decisión nueva elimina la región conservada y recupera elegibilidad nacional completa. No implica borrar eventos históricos de Tracardi.
- **Resolución:** misma aproximación de la demo: permiso del navegador y geocodificación inversa con `https://nominatim.openstreetmap.org/reverse`, extrayendo `ISO3166-2-lvl4`, o como alternativa `lvl3`/`lvl6`. Coordenadas solo en memoria y consulta de resolución; no persistirlas, registrarlas en consola ni enviarlas a Tracardi. Esta dependencia externa se documenta como supuesto de Gate 1, sin prometer disponibilidad o límites no verificados.
- **Región y cobertura:** región no vacía normalizada como código ISO; comparar sin distinguir mayúsculas y espacios exteriores. Ofertas sin `entidad_federativa`, nula o vacía son nacionales. Con región válida, mostrar nacionales y coincidentes en «Todos» y categorías; sin región, no aplicar exclusión regional. Intereses de US-003 siguen determinando «Todos».
- **Evento:** tras aceptar y resolver región válida, emitir `geo-location` mediante identidad y colector de US-002: `iso_region`, `ISO3166-2-lvl4`, `country`, `country_code`, `state`, `action: geo_consent_granted`, `consented_at`, sin coordenadas. Usar intereses válidos de la respuesta según US-003. Si falla el envío, conservar la región consentida y el filtro local, informar que no pudo confirmarse la sincronización y no afirmar registro exitoso; no crear un evento sin región resuelta.
- **Persistencia:** conservar únicamente región válida consentida en el espacio MASTV junto a su perfil local; si no hay persistencia, usar memoria. Con región conservada válida, restaurarla sin volver a pedir coordenadas o emitir otro evento solo por recarga. Ofrecer cambiar ubicación. Una resolución nueva correcta sustituye la región anterior; una nueva resolución fallida conserva la última región consentida, si existía, e informa de que no pudo actualizarse. Rechazar/retirar sí elimina la región anterior.
- **Supuestos para Gate 1:** sin permiso, geolocalización no soportada, espera agotada, resolución sin región o servicio de resolución fallido, se puede continuar al catálogo con explicación. No filtrar ofertas por una región inventada ni usar coordenadas aproximadas de respaldo. No adoptar de forma silenciosa una región remota no consentida; la región activa proviene de la decisión local o de su valor local conservado. No ofrecer selección manual de regiones ni configurar geocodificación en el backend en esta entrega.

## Evidencia del refinamiento

Referencia de solo lectura: `/home/swumplurd/Documentos/devsarrollo/proyectos/tacardi-demo`; contrato y líneas relevantes en `progress/reporte/refinamiento/ref_strapi_tracardi.md`. Configuración y convenciones: `PROJECT.md`. Las respuestas del usuario incluyen personalización por ubicación e intereses y los mismos servicios Strapi/Tracardi. No se ejecutaron servicios en este refinamiento; disponibilidad, lectura desde navegador y recepción efectiva de eventos deben verificarse durante implementación/QA.


Criterios: [feature](../features/US-004-personalizacion-ubicacion.feature)

```gherkin
# language: en
Feature: Consultar beneficios disponibles en la región consentida
  Como visitante de MASTV
  Quiero compartir o retirar mi ubicación para consultar beneficios nacionales y de mi región
  Para evitar recomendaciones regionales que no puedo utilizar y conservar el acceso si no comparto mi ubicación

  Scenario: Esperar una decisión antes de solicitar ubicación
    Given el visitante no tiene una región consentida conservada
    When entra a MASTV
    Then se le ofrece permitir o rechazar el uso de ubicación
    And no se solicitan coordenadas hasta que elija permitir

  Scenario: Aplicar una región resuelta con consentimiento
    Given el visitante permite ubicación y hay ofertas de Comida nacionales, de MX-CMX y de MX-JAL
    When su ubicación se resuelve como MX-CMX y consulta Comida
    Then ve las ofertas nacionales y de MX-CMX sin las de MX-JAL
    And el catálogo indica que la región activa es MX-CMX

  Scenario: Asociar región al visitante sin coordenadas
    Given el visitante ha permitido ubicación y Tracardi puede aceptar sus eventos
    When se resuelve una región válida para su ubicación
    Then Tracardi recibe un evento de ubicación con región, consentimiento e identidad del visitante
    And no se incluyen coordenadas en ese evento ni se conservan en el navegador

  Scenario Outline: Continuar sin compartir ubicación
    Given el visitante no tiene región conservada y hay ofertas nacionales y regionales de Comida
    When decide <decision> y consulta Comida
    Then puede explorar todas las ofertas de Comida sin exclusión regional
    And no se solicita ubicación ni se registra un evento de ubicación

    Examples:
      | decision                |
      | rechazar                |
      | cerrar el diálogo       |
      | salir mediante Escape   |

  Scenario Outline: Continuar cuando no puede determinarse la región
    Given el visitante no tiene región conservada y ha elegido permitir ubicación
    When la determinación de región termina con <resultado>
    Then se informa del impedimento y puede explorar categorías sin exclusión regional
    And no se registra una ubicación sin región válida

    Examples:
      | resultado                       |
      | permiso del navegador denegado   |
      | ubicación no soportada          |
      | tiempo de espera agotado        |
      | resolución sin código regional  |
      | servicio de resolución fallido  |

  Scenario: Restaurar una región consentida
    Given el navegador conserva la región consentida MX-CMX del visitante MASTV
    When el visitante vuelve al sitio y consulta Comida
    Then se aplica MX-CMX y están disponibles las ofertas nacionales y de esa región
    And no se solicitan coordenadas ni se registra una nueva ubicación solo por volver

  Scenario: Sustituir la región por una nueva decisión
    Given el visitante tiene MX-CMX como región activa y permite actualizar su ubicación
    When la nueva ubicación se resuelve como MX-JAL
    Then los listados aplican MX-JAL en lugar de MX-CMX
    And se envía la nueva región consentida con la misma identidad del visitante

  Scenario: Retirar una región conservada
    Given el visitante tiene una región consentida y vuelve a abrir Cambiar ubicación
    When rechaza el uso de ubicación
    Then se elimina la región activa y conservada del sitio
    And los listados dejan de aplicar exclusión regional sin modificar sus afinidades

  Scenario: Conservar la región anterior si falla su actualización
    Given el visitante tiene MX-CMX consentida y permite actualizar su ubicación
    When no puede resolverse una nueva región
    Then se informa que no pudo actualizarse y se conserva MX-CMX

  Scenario: Aplicar la región aunque no pueda sincronizarse su evento
    Given el visitante permite ubicación y Tracardi no puede confirmar la recepción del evento
    When su ubicación se resuelve como MX-CMX
    Then el catálogo aplica MX-CMX con las ofertas nacionales y regionales correspondientes
    And se informa que no pudo confirmarse la sincronización sin afirmar que fue registrada

  Scenario: Combinar afinidad con elegibilidad regional
    Given el visitante tiene región MX-CMX y afinidad mayor que 1 en Cine y Comida con ofertas nacionales y de otras regiones
    When consulta Todos
    Then solo ve ofertas afines nacionales o de MX-CMX ordenadas por afinidad

  Scenario: Actualizar afinidades devueltas al sincronizar región
    Given el visitante tiene intereses anteriores y Tracardi acepta el registro de su región
    When la respuesta incluye un nuevo mapa válido de intereses
    Then las recomendaciones reflejan el nuevo mapa y la región consentida
```


## Decisión registrada

[2026-11-05T19:29:50+00:00] Usuario: «acepto». Gate 1 revisión 1 aprobado para US-001 a US-004.
