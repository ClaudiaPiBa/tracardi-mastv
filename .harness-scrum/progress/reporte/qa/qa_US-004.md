# Reporte QA: US-004

**Fecha:** 2026-11-05 (ejecuciones UTC 2026-11-06).
**Veredicto:** ✅ PASA

Los 18 casos expandidos del feature aprobado pasan en navegador. La regresión final de las superficies afectadas pasa 13/13. QA leyó historia, feature, informe Completada y código final; analizó resultados, capturas y hashes sin modificar implementación.

## Ejecución y evidencia

**Directorio:** `/home/swumplurd/Documentos/devsarrollo/repos/tracardi-mastv`.
**Entorno:** Node 24.16.0, Chrome 156 headless/CDP con sandbox normal, perfiles independientes y servidor local efímero. Viewport funcional 430 × 932; la regresión incluye confirmación en 320 × 568.

| Comando | Salida | Resultado observado |
|---|---:|---|
| `node --check /tmp/tracardi-qa/us004.mjs` | 0 | Runner válido; preflight OPTIONS204 separado del conteo de POST. |
| `node /tmp/tracardi-qa/us004.mjs` | 0 | 18 PASS, 0 FAIL, 0 excepciones Runtime. |
| `node /tmp/tracardi-qa/final-regression.mjs` | 0 | 13 PASS, 0 FAIL, 0 excepciones Runtime; detalle en qa_regresion_final.md. |
| `node /tmp/tracardi-qa/real-resolver.mjs` | 0 | Un único GET real: HTTP200, Referer válido, ACAO `*`, respuesta legible y código regional presente. |
| Comparación de manifiestos SHA256 y producto mediante Node, solo lectura | 0 | 8/8 archivos idénticos antes de US-004, después de la batería, después de regresión y al cerrar QA. Coinciden también los manifiestos focales. |

El coordinador ejecutó los tres comandos de navegador con permisos apropiados; QA revisó sus artefactos y redacta este veredicto. Build/test/typecheck/lint/dev oficiales continúan N/A en PROJECT.md. Las unidades del developer constan en su informe y no se repitieron sin motivo.

Evidencia relativa a este reporte: `evidencia/US-004/results.json`, capturas `01.png` a `18.png`, `baseline-before.json` y `source-hashes.json`; la consulta real está separada en `resolver-real/results.json`. Los datos del catálogo, identidad y respuestas del recolector de la batería son sintéticos. Todas sus peticiones externas se interceptaron o bloquearon; no hubo POST reales.

## Resultado por escenario

Cada fila comprueba Given, ejecuta When y valida Then observable. Los 18 casos tienen perfiles Chrome independientes; las secuencias internas conservan únicamente el estado previsto para recarga, cambio o retirada.

| Caso / escenario | Given verificado | When ejecutado | Then cumplido |
|---|---|---|---|
| ✅ 01 Esperar una decisión antes de solicitar ubicación | Sin región guardada | Entrar; después permitir con callback retenido | Permitir/rechazar/cerrar disponibles; cero solicitudes antes de permitir. Cerrar/rechazar/Escape descartan coordenadas tardías y no resuelven ni emiten geo. |
| ✅ 02 Aplicar una región resuelta con consentimiento | Comida nacional, CMX y JAL | Permitir, resolver CMX y consultar Comida | Muestra nacionales y CMX; excluye JAL; región activa CMX visible. |
| ✅ 03 Asociar región al visitante sin coordenadas | Consentimiento e identidad MASTV conocida | Resolver una región y aceptar evento | Un geo-location con identidad, región y consentimiento; sin coordenadas en evento, almacenamiento o consola. |
| ✅ 04 Continuar sin compartir: rechazar | Sin región; ofertas nacionales y regionales | Rechazar y consultar Comida | Todas las ofertas de Comida; cero solicitudes de coordenadas, resolución o geo. |
| ✅ 05 Continuar sin compartir: cerrar | Mismo contexto independiente | Cerrar diálogo y consultar Comida | Catálogo sin exclusión regional; cero coordenadas/resolución/geo. |
| ✅ 06 Continuar sin compartir: Escape | Mismo contexto independiente | Tecla Escape y consultar Comida | Catálogo sin exclusión regional; cero coordenadas/resolución/geo. |
| ✅ 07 Fallo: permiso del navegador denegado | Sin región y permitir elegido | Navegador deniega permiso | Explicación persistente y categorías explorables sin exclusión; ningún geo. |
| ✅ 08 Fallo: ubicación no soportada | Sin geolocation disponible | Permitir | Explicación persistente, catálogo completo y ningún geo. |
| ✅ 09 Fallo: tiempo agotado | Sin región y permitir elegido | Callback con timeout | Explicación persistente, catálogo completo y ningún geo. |
| ✅ 10 Fallo: resolución sin código regional | Coordenadas sintéticas permitidas | Resolver responde sin ISO | No inventa región; explica impedimento, permite explorar y no emite geo. |
| ✅ 11 Fallo: servicio de resolución fallido | Coordenadas sintéticas permitidas | Resolver HTTP503; después cerrar otra resolución retenida | Explica fallo y mantiene catálogo completo; no emite geo. La respuesta tardía tras cierre no aplica región. |
| ✅ 12 Restaurar una región consentida | CMX guardada con sesión/perfil locales | Volver, recargar realmente y consultar Comida | Nacionales y CMX; Cambiar ubicación visible; sin coordenadas, resolución o nuevo geo por recarga. |
| ✅ 13 Sustituir región por nueva decisión | CMX activa | Cambiar, permitir y resolver JAL | JAL sustituye CMX en listado y persistencia; geo nuevo con misma identidad. |
| ✅ 14 Retirar una región conservada | CMX e intereses válidos | Cambiar y rechazar | Elimina región activa/guardada, recupera ofertas de todas las regiones y conserva afinidades. |
| ✅ 15 Conservar región anterior al fallar actualización | CMX consentida | Nueva resolución sin región válida | Conserva CMX en listado/persistencia y explica que no pudo actualizarse; sin geo inventado. |
| ✅ 16 Aplicar región aunque falle sincronización | Consentimiento y resolución CMX | Recolector HTTP503, rechazo semántico y fallo de red | Mantiene filtro/persistencia CMX; informa sincronización no confirmada sin afirmar registro. Aceptación tardía no restaura una región retirada. |
| ✅ 17 Combinar afinidad y elegibilidad regional | CMX, Cine4, Comida2 y Ropa1 | Consultar Todos y categorías explícitas | Solo afines nacionales/CMX, en orden estable por peso; categoría explícita respeta región aunque su afinidad sea1. |
| ✅ 18 Actualizar afinidades al sincronizar región | Intereses anteriores Cine4 | Geo aceptado devuelve Comida5; después mapa vacío | Reemplaza mapa completo y aplica CMX sin eventos de render; mapa vacío elimina recomendaciones conservando región. |

## Observaciones de calidad

- Los tres valores de decisión y los cinco resultados de fallo del Scenario Outline están ejecutados. Éxito/denegación usan permisos y geolocalización del navegador controlados por CDP; no soportado, timeout y coordenadas tardías son simulaciones explícitas previas a los scripts.
- Nacionales cubre campo ausente, null y vacío; coincidencia regional acepta mayúsculas/espacios exteriores. Se ejercitan ISO lvl4, fallback lvl3 (caso13) y lvl6 (caso18).
- El caso03 exige exactamente los siete campos de región/consentimiento aprobados y asociación de sesión/perfil. En todos los casos se comprueba ausencia de coordenadas en localStorage, sessionStorage, payloads y consola; los resultados y capturas no conservan query ni valores del resolver. El runner funcional reproducible contiene únicamente una posición sintética fija para emulación, nunca GPS del usuario.
- QA inspeccionó visualmente capturas02/07/16: región, cambio, feedback y atribución permanecen en flujo legible. El código final informa del proveedor externo antes de consentir y muestra enlaces de atribución. No se hallaron nuevos bloqueantes ni escenarios ambiguos.

## Límites y recomendaciones

- La única consulta real usa un punto público sintético, sin GPS del usuario, identidad ni datos comerciales. Acredita disponibilidad/CORS puntuales del resolver, no disponibilidad futura ni cobertura exhaustiva. Su evidencia curada conserva solo el resultado sanitizado, sin coordenadas, URL de consulta o cuerpo de respuesta.
- El evento geo se valida con el contrato sintético del recolector ya establecido (`task`, `profile.id`, sin error). No se envió un geo real a Tracardi en esta batería. La recepción real documentada en US-002 no demuestra workflows ni cálculo real de afinidades; no se reclaman aquí.
- Operación con tráfico multiusuario, otros navegadores, dispositivos físicos y auditoría completa con lector de pantalla **NO VERIFICADOS**. Mantener en la demo los límites de uso local/proveedor documentados en README; la separación mínima por página no acredita control global de tráfico.
- La composición regional pendiente en QA US-003 queda verificada aquí por los casos17/18 y la regresión focal. No se recomienda ampliar alcance ni corregir implementación a partir de esta evidencia.

## Decisión

- [x] Aprobado para demo con usuario
- [ ] Requiere corrección antes de demo

Sin cambios de producto, estados Scrum, commits, publicación o despliegues. La aceptación humana corresponde al Gate2 del coordinador; baseline final liberado tras este reporte.
