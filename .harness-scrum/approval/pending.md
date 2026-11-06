# Gate 2 — Aceptación de MASTV con Strapi, Tracardi y personalización

**Revisión:** 1
**Fecha:** 2026-11-05
**Estado:** Pendiente de aceptación afirmativa explícita del usuario.
**Historias:** US-001, US-002, US-003, US-004.
**Gate 1:** alcance revisión 1 aceptado por el usuario con «acepto»; registro en approval/gate1_v1_aceptado.md.

## Resultado entregado

El frontend MASTV carga ofertas publicadas desde el mismo Strapi de la demo, registra interacciones y confirmaciones del visitante en el mismo recolector Tracardi, consume los intereses devueltos y aplica la región obtenida con consentimiento. Mantiene catálogo, detalle, copia, navegación y diálogos adaptables. La confirmación con contenido remoto extenso permite desplazarse hasta sus controles en móvil.

## Resultados QA

| Historia | Resultado | Veredicto | Evidencia |
|---|---|---|---|
| US-001 | Consultar beneficios vigentes administrados en Strapi | ✅ PASA | [QA](../progress/reporte/qa/qa_US-001.md) |
| US-002 | Registrar consultas y confirmaciones de canje en Tracardi | ✅ PASA | [QA](../progress/reporte/qa/qa_US-002.md) |
| US-003 | Descubrir beneficios según los intereses del visitante | ✅ PASA | [QA](../progress/reporte/qa/qa_US-003.md) |
| US-004 | Consultar beneficios disponibles en la región consentida | ✅ PASA | [QA](../progress/reporte/qa/qa_US-004.md) |

Las historias reúnen 66 casos Gherkin expandidos verificados durante el trabajo (11+21+16+18). Tras la integración final se ejecutó una regresión focal adicional de 13 casos: 13/13 PASA, cero excepciones Runtime. Ver [regresión final](../progress/reporte/qa/qa_regresion_final.md).

Los reportes distinguen fixtures sintéticos ejecutados en Chrome y pruebas contra servicios reales. Los fallos iniciales de US-001 y US-002 y sus correcciones permanecen archivados; no se ocultan resultados anteriores. Los escenarios o entornos no ejecutados se identifican en los reportes.

Comprobación actual de demo, solo lectura: frontend HTTP200, Strapi HTTP200 con siete registros y CORS permitido para http://127.0.0.1:8080, Tracardi /healthcheck HTTP200. La recepción real sintética de eventos y continuidad de identidad está en QA US-002. La consulta real de un punto público sintético al resolver fue un único GET HTTP200, con CORS válido y código regional; no solicitó GPS del usuario.

## Demo local

Abrir http://127.0.0.1:8080 con los servicios Strapi y Tracardi disponibles según README.

1. Permitir ubicación para resolver región, o rechazar para continuar sin filtro regional.
2. Consultar «Todos». Solo incluye categorías con afinidad mayor que 1; un visitante nuevo puede ver el estado sin recomendaciones. Elegir una categoría para explorar ofertas.
3. Abrir una oferta y comprobar datos publicados, condiciones y cupón; copiar el cupón disponible.
4. Abrir confirmación de canje. Cancelar no registra canje; confirmar espera aceptación del recolector y solo entonces muestra confirmación registrada.
5. Volver y consultar «Todos» con las afinidades que devuelva Tracardi. La región consentida y las preferencias del perfil se conservan cuando el navegador lo permite.
6. Usar «Cambiar ubicación» para actualizar o retirar la región y comprobar el listado.

## Límites y observaciones para aceptar

- El canje representa una confirmación del visitante recibida por Tracardi. No valida comercialmente el cupón, inventario ni consumo y no garantiza entrega exactamente una vez ante una interrupción de red.
- El identificador de tarea del recolector acredita recepción, no procesamiento final de sus workflows. Las afinidades las calcula el servicio; el frontend no crea ni cambia esas reglas.
- «Todos» puede quedar vacío sin afinidades suficientes aunque haya ofertas. Las categorías específicas permiten explorarlas y respetan la región consentida.
- La identidad local de MASTV es independiente de la almacenada por la demo, aunque comparten servicios.
- Nominatim público está sujeto a uso moderado, máximo una solicitud por segundo agregado por aplicación, identificación y atribución. El frontend controla sus solicitudes por página y permite configurar proveedor; no impone un límite global entre navegadores. No se incluye despliegue o capacidad de tráfico productivo. [Política del proveedor](https://operations.osmfoundation.org/policies/nominatim/).
- Geolocalización requiere permiso y un contexto permitido por el navegador; ante fallos se explica el resultado y se conserva el acceso al catálogo. Las coordenadas no se persisten ni se envían a Tracardi.
- QA se ejecutó en Chrome con los límites descritos en cada reporte; no equivale a certificar todos los navegadores, dispositivos físicos o tecnologías de asistencia.
- No se realizaron commits, merge, despliegue ni publicación.

## Decisión requerida

Aceptar o rechazar explícitamente el resultado de esta revisión para US-001 a US-004. Solo tras aceptación de Gate 2 el Scrum Master marcará Done y cerrará los contadores correspondientes. Si se rechaza, registrar la causa y devolver a developer; un cambio de alcance requiere Product Owner y una nueva revisión de Gate 1.
