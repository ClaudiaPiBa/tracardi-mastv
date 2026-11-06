# Reporte QA: regresión final tras US-004

**Fecha:** 2026-11-05 (UTC 2026-11-06T04:10).
**Veredicto:** ✅ PASA — 13/13 casos, 0 fallos, 0 excepciones Runtime.

La integración de ubicación modifica arranque, consentimiento, render regional y consumidores de respuestas del tracker, además del bloque HTML/CSS regional. Se seleccionaron las superficies afectadas de los runners existentes, conservando sus evidencias previas. No se repitieron por costumbre todas las variantes de normalización o paginación de módulos que permanecen sin cambios.

**Comando:** `node /tmp/tracardi-qa/final-regression.mjs`.
**Directorio:** `/home/swumplurd/Documentos/devsarrollo/repos/tracardi-mastv`.
**Salida:** 0; subcomandos final-us001.mjs, final-us002.mjs y final-us003.mjs también salida0.
**Entorno:** Node24.16.0, Chrome156 headless con sandbox normal, fixtures sintéticos y red externa interceptada/bloqueada; ningún POST real. Cada caso funcional inicia perfil Chrome independiente.

## Resultados

| Evidencia / caso | Given y When ejecutados | Then observado |
|---|---|---|
| ✅ US-001/01 | Respuesta de catálogo retenida; entrar y liberar | Cargando visible y sin estado vacío engañoso durante espera. |
| ✅ US-001/02 | Dos ofertas publicadas; abrir segunda, confirmar y usar Tab/Shift+Tab/Escape | Detalle/condiciones/confirmación coherentes, foco contenido y restaurado; vuelve al catálogo. |
| ✅ US-001/03 | Cupón sintético publicado; copiar con permiso y foco reales | Clipboard API contiene exactamente el cupón y muestra confirmación. |
| ✅ US-001/04 | Primera página válida y segunda fallida; cargar | Cero tarjetas parciales y reintento disponible. |
| ✅ US-001/05 | Primer intento fallido; pulsar reintento | Segunda petición recupera la oferta y oculta reintento. |
| ✅ US-001/06 | Inicio con tres destacados; usar sus accesos | Los tres llevan al catálogo sin abrir un detalle fijo. |
| ✅ US-002/01 | Primera respuesta retenida; filtrar y abrir oferta | Solo una solicitud pendiente; la siguiente usa perfil recibido y misma sesión. |
| ✅ US-002/02 | Canje en móvil320 y respuesta retenida; confirmar y liberar aceptación | Un canje; éxito solo después de aceptación; diálogo dentro del viewport. |
| ✅ US-002/03 | CanjeA pendiente; repetir, cerrar y abrirB antes de liberarA | Sin duplicado, detalleB intacto, sin éxito tardío intrusivo; aviso pendiente limpio y B puede confirmar. |
| ✅ US-002/04 | Canje con rechazo semántico y perfil distinto; confirmar | Sin éxito ni cambio de identidad; permite volver a intentar. |
| ✅ US-003/01 | Intereses previos y respuesta retenida; actualizar con detalle/confirmación abiertos, después cambiar perfiles | Reemplazo completo sin recarga/cierres/eventos extra; perfiles no mezclan afinidades. |
| ✅ US-003/02 | Perfil e intereses válidos guardados; recargar | Restaura mapa del perfil y no registra por render/recarga. |
| ✅ US-003/03 | Storage corrupto, malformado, de otro perfil o denegado; recargar/interactuar | Ignora datos inválidos, permite categoría explícita y usa mapa aceptado en memoria si no puede persistir. |

## Evidencia y trazabilidad

`evidencia/regresion-final/results.json` conserva comandos, cwd, exit y resultados; subdirectorios US-001, US-002 y US-003 contienen resultados completos, capturas y hashes de cada runner. Los IDs de esta tabla corresponden a la numeración focal, no sustituyen los IDs originales del feature. La selección exacta se conserva en prepare-final-regression.mjs:6+4+3 casos.

Los ocho hashes del manifiesto final coinciden con baseline-before y resultados de US-004, así como con los archivos actuales del producto al cerrar QA. Los manifiestos de los tres runners focales coinciden también. catalog.js, tracking.js e interests.js conservan los hashes previamente probados; sus nuevas conexiones quedan ejercitadas por estas pruebas. Se revisaron visualmente el éxito móvil320 (US-002/02) y el catálogo con bloque regional (US-001/02).

## Decisión y límites

Regresión final suficiente para el delta integrado: sin defectos ni bloqueantes nuevos. Los 18 casos específicos de ubicación y la consulta real separada del resolver están documentados en qa_US-004.md. Se conserva evidencia previa de los escenarios no seleccionados; no se afirma que se hayan repetido todos en este cierre.

La recepción real anterior de eventos no demuestra workflows o afinidades calculadas. No se certifican otros navegadores/dispositivos físicos ni auditoría integral de accesibilidad. Sin cambios de implementación o estados ni acciones de publicación. Aprobado para demo; aceptación final pendiente del gate humano.
