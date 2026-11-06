# Preparación QA US-004 y regresión final

Fecha: 2026-11-05. **SOLO PREPARACIÓN. Ningún caso de US-004 o regresión final se ha ejecutado con esta entrega. Sin veredicto.**

Proyecto: `/home/swumplurd/Documentos/devsarrollo/repos/tracardi-mastv`.
Harness: `/home/swumplurd/Documentos/devsarrollo/repos/tracardi-mastv/.harness-scrum`.
Entradas leídas: historia/feature US-004, PROJECT.md, módulo y pruebas aislados del developer, smoke propuesto, ui-chain y notas técnicas Nominatim del coordinador. Se conserva el rol QA y no se delega ni modifica producto.

## Runner US-004

`/tmp/tracardi-qa/us004.mjs`: 18 casos expandidos, cada uno con perfil Chrome independiente. Reutiliza cdp.mjs y fixtures.mjs. Está preparado para los selectores anunciados por el developer: locationModal, allowLocation, declineLocation, closeLocation, changeLocation, regionStatus, locationFeedback y filtros/listado existentes.

1. Decisión previa: cero llamadas antes de permitir; permitir deshabilitado durante espera; coordenadas tardías ignoradas tras cerrar, rechazar y Escape.
2. Región CMX: nacionales sin campo/null/vacío y coincidencia normalizada; JAL excluida.
3. Evento geo único con identidad/consentimiento/campos regionales; ausencia de coordenadas en tracking, localStorage, sessionStorage y consola.
4–6. Rechazar, cerrar y Escape sin permitir: catálogo completo y ningún evento geo.
7–11. Permiso del navegador denegado, geolocalización no soportada, timeout, dirección sin ISO y resolver HTTP503; explicación en catálogo, sin exclusión ni evento de región inventada. Caso11 añade cierre mientras el resolver está pendiente y descarte de su respuesta tardía.
12. Restauración y recarga real de CMX: sin solicitud de coordenadas, resolución ni nuevo geo; acceso Cambiar ubicación.
13. Sustitución CMX→JAL, fallback lvl3, normalización y misma identidad.
14. Retirada de región guardada: elimina persistencia, conserva afinidades y recupera regiones completas.
15. Fallo al actualizar: conserva CMX y explica el impedimento.
16. Fallos HTTP/semántico/red de tracking: conserva región local, feedback persistente sin afirmar registro; aceptación tardía no restaura región retirada.
17. Región antes de afinidad: nacionales/CMX, >1, orden y empate estables; categorías explícitas respetan región aunque no tengan afinidad.
18. Intereses aceptados por geo reemplazan mapa anterior y mapa vacío elimina recomendaciones; fallback lvl6 y ningún evento generado por render.

Éxito y permiso denegado usan permiso/geolocalización real del navegador controlados mediante CDP con posición sintética fija. No soportado, timeout y callback tardío se simulan explícitamente antes de scripts. Todas las respuestas externas de la batería funcional son interceptadas o bloqueadas; ningún POST real. Evidencia no guarda consulta ni coordenadas del resolver. La comprobación de consola no almacena sus textos: solo detecta fugas.

**Ejecución pendiente**, desde PROJECT_PATH, por el coordinador con permiso para navegador/servidor:

```sh
node /tmp/tracardi-qa/us004.mjs
```

Salida prevista: `/tmp/tracardi-qa/us004-evidence/` con results.json, capturas por caso y hashes de ocho archivos del producto. No hay archivos de resultados creados por esta preparación.

## Regresión propuesta por cambios concretos

La integración modifica render regional, respuesta del tracker, arranque y consentimiento, HTML/CSS del bloque regional y diálogos. Se prepararon copias focales de runners anteriores, conservando sus evidencias originales:

| Origen | Casos originales seleccionados | Riesgo cubierto |
|---|---|---|
| US-001 | 02 carga, 04 detalle/Tab/Shift+Tab/Escape/foco, 05 Clipboard, 07 fallo de página, 08 reintento, 11 entradas desde Inicio | Arranque asíncrono, ruta al catálogo, DOM del listado y navegación/diálogos tras añadir región. |
| US-002 revisión2 | 09 cola y perfil inicial, 12 canje pendiente→aceptado en móvil320, 16 duplicado/respuesta tardía en otra oferta, 17 rechazo semántico | La nueva suscripción geo/afinidad no rompe identidad, serialización ni confirmación ya corregida. |
| US-003 | 09 reemplazo asíncrono con detalle/confirmación abiertos y cambios de perfil, 15 recarga, 16 corrupción/storage denegado | El filtrado regional y nuevo arranque conservan actualización del listado, persistencia y degradación en memoria. |

Total: **13 casos focales**; no se repiten variantes del normalizador/paginación ni todos los Examples ya validados si sus módulos permanecen sin cambios. US-004 cubre composición regional/afinidad, vacío por mapa geo y consentimiento, evitando duplicarlos en esta selección.

Copias preparadas: final-us001.mjs (6 casos), final-us002.mjs (4), final-us003.mjs (3). `prepare-final-regression.mjs` documenta la selección a partir de los runners anteriores; se ejecutó únicamente para crear estas copias, salida0. No ejecuta pruebas.

Tras QA US-004 y baseline final, comando privilegiado pendiente:

```sh
node /tmp/tracardi-qa/final-regression.mjs
```

Ejecuta secuencialmente los tres runners, conserva resultados/capturas en final-us00N-evidence y crea resumen y ocho hashes en final-regression-evidence. QA revisará los resultados antes de cualquier conclusión. Si el delta final afecta módulos no previstos, se reevaluará esta selección por evidencia del cambio.

## Comprobación real opcional del resolver

Preparado `/tmp/tracardi-qa/real-resolver.mjs`, **NO EJECUTADO**. Hace una sola solicitud desde Chrome/origen local a un punto público sintético, con Referer de origen válido y credenciales omitidas; jamás pide GPS del usuario. Bloquea todos los demás accesos externos y no carga catálogo ni perfiles reales. Sirve únicamente para disponibilidad/CORS del resolver, no para demostrar los escenarios funcionales ni disponibilidad futura.

Guarda solo número de solicitudes, HTTP, Access-Control-Allow-Origin, legibilidad de fetch y presencia de dirección/código regional; no guarda URL, query, coordenadas ni cuerpo de respuesta. Una marca de intento exclusivo evita repetirlo accidentalmente. No hay bucles ni reintentos y las baterías funcionales no hacen solicitudes reales al resolver.

Comando opcional, solo si el coordinador decide ejecutarlo con permisos apropiados: `node /tmp/tracardi-qa/real-resolver.mjs` desde PROJECT_PATH. Resultado esperado en real-resolver-evidence/results.json. Los límites del proveedor y el uso local ya constan en las notas técnicas; no se autoriza despliegue con esta preparación.

## Estado y dependencias

`node --check` de us004.mjs, final-regression.mjs, las tres copias focales y real-resolver.mjs: **salida0** desde PROJECT_PATH. No se repitieron unidades del developer ni se ejecutó Chrome. Sin cambios de producto/estados, commits, publicación o despliegues.

Pendientes antes de ejecutar: informe developer final, transición En Review, lectura del delta final y confirmación de selectores/feedback definitivos. No hay duda de negocio nueva; si cambian selectores se ajustará solo sincronización del runner. El runner de US-004 presupone que durante resolver el usuario conserva la posibilidad aprobada de cerrar/rechazar/Escape; detectará un incumplimiento si esa salida deja de funcionar.
