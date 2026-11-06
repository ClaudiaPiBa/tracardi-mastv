# Reporte QA: US-003

**Fecha:** 2026-11-05 (ejecución UTC 2026-11-06T02:54).
**Veredicto:** ✅ PASA

Los 16 casos expandidos del feature aprobado pasan en navegador real con datos sintéticos. QA leyó historia, feature, informe de implementación y código final de intereses, integración de app y aceptación de tracking. No modificó implementación.

## Ejecución y evidencia

**Directorio:** `/home/swumplurd/Documentos/devsarrollo/repos/tracardi-mastv`.
**Entorno:** Node 24.16.0 y Chrome 156 headless/CDP con sandbox normal, viewport móvil 430 × 932, servidor estático efímero local y perfil Chrome nuevo por caso.

| Comando | Código de salida | Resultado observado |
|---|---:|---|
| `node --check /tmp/tracardi-qa/us003.mjs` | 0 | Runner válido, 16 casos correspondientes al feature y sus Examples. |
| `node --check js/interests.js` y `node --check js/app.js` | 0 cada uno | Sintaxis válida. |
| `node --test --test-isolation=none tests/interests.test.cjs` | 0 | 11 pruebas pasan; 0 fallos. Comprobación complementaria, no sustituto de Gherkin. |
| `node /tmp/tracardi-qa/us003.mjs` | 0 | 16 PASS, 0 FAIL, 0 excepciones Runtime. Ejecutado por el coordinador con permiso escalado; resultados analizados por QA. |

Build/test/typecheck/lint/dev figuran N/A en PROJECT.md; no se instalaron dependencias. `evidencia/US-003/results.json` contiene resultados observados y peticiones sintéticas; `01.png` a `16.png` son capturas finales por caso. Se inspeccionaron visualmente `01.png` y `08.png`, además de las aserciones DOM. `source-hashes.json` identifica siete archivos de producto; QA comparó los siete hashes al finalizar y todos coinciden. El runner y sus helpers quedan junto a la evidencia para reproducción.

## Resultado por escenario

Cada fila verifica Given, ejecuta When por navegador y comprueba Then observable. Los casos parten de perfiles de navegador independientes; las recargas y secuencias internas conservan solo el estado sintético previsto.

| Caso / escenario | Given verificado | When ejecutado | Then cumplido |
|---|---|---|---|
| ✅ 01 Ordenar recomendaciones por afinidad | Sin región; Comida 4, Cine 2, Ropa 1 y catálogo sintético | Consultar Todos y recibir pesos normalizados | Comida antes de Cine; Ropa excluida. Empate conserva orden del catálogo. |
| ✅ 02 Excluir: ausente | Cine sin peso | Consultar Todos | No aparece Cine. |
| ✅ 03 Excluir: cero | Cine 0 | Consultar Todos | No aparece Cine. |
| ✅ 04 Excluir: uno | Cine 1 | Consultar Todos | No aparece Cine. |
| ✅ 05 Excluir: negativo | Cine -2 | Consultar Todos | No aparece Cine. |
| ✅ 06 Excluir: no numérico | Cine `2foo` | Consultar Todos | No aparece Cine. |
| ✅ 07 Reconocer visitante sin recomendaciones | Catálogo con ofertas y sin intereses | Consultar Todos | Mensaje de recomendaciones y categorías Cine, Comida, Ropa y Viajes disponibles. |
| ✅ 08 Explorar categoría sin interés previo | Comida 4, sin afinidad Cine; oferta Cine nacional elegible | Seleccionar Cine | Muestra Cine y oculta estado vacío, sin exclusión por afinidad. |
| ✅ 09 Aplicar nuevos intereses recibidos | Todos con Comida 4 y aceptación retenida | Liberar mapa Cine 3 mientras están abiertos detalle y confirmación | Reemplazo completo inmediato, sin recarga; detalle y confirmación de Comida siguen abiertos; sin eventos por render. |
| ✅ 10 Eliminar recomendaciones tras mapa vacío | Recomendaciones Comida | Interacción aceptada con `{}` | Todos queda sin recomendaciones y muestra mensaje específico. |
| ✅ 11 Conservar: aceptación sin intereses | Mapa Comida 4 válido | Recibir aceptación sin campo interests | Se conservan listado y mapa persistido del mismo perfil. |
| ✅ 12 Conservar: intereses inválidos | Mapa Comida 4 válido | Recibir por separado `null`, array y texto | Ningún contenedor sustituye el mapa válido. |
| ✅ 13 Conservar: rechazo del registro | Mapa Comida 4 válido | Recibir respuesta con errores y perfil diferente | Se conserva mapa y asociación del perfil anterior. |
| ✅ 14 Conservar: fallo de comunicación | Mapa Comida 4 válido | Fallar petición mediante ConnectionFailed | Se conservan recomendaciones y persistencia previa. |
| ✅ 15 Recuperar recomendaciones al volver | Perfil MASTV e intereses guardados coincidentes | Recargar y completar catálogo | Reaplica Comida 4 / Cine 2; recarga sin tracking; interacción posterior usa perfil conservado. |
| ✅ 16 Ignorar preferencias no interpretables | Preferencias corruptas, malformadas o de otro perfil | Recargar, explorar Cine y probar storage denegado | Todos vacío y categoría explícita consultable; mapa aceptado funciona en memoria aun sin storage. |

## Subvariantes y observaciones de calidad

- Caso 01 cubre categorías con mayúsculas/espacios exteriores, `2.5` como texto válido, `2foo` y `Infinity` inválidos dentro de un objeto sin descartar los pesos válidos. Los empates mantienen Cine / Comida-1 / Comida-2 del catálogo original.
- Caso 09 verifica también cambio a otro perfil sin mapa (invalida anteriores), nuevo mapa válido del perfil adoptado (Viajes visible), y cambio de perfil con mapa inválido (no reutiliza afinidades antiguas). Escape y regreso al catálogo funcionan tras la actualización. El marcador del documento permanece, el diálogo conserva su oferta y los recuentos de peticiones descartan eventos adicionales por render.
- Caso 16 incluye JSON ilegible, contenedores guardados null/array/texto y mapa de otro perfil; cada recarga permite explorar Cine. La denegación real de acceso a localStorage se simula con SecurityError antes de scripts; tras aceptación, el mapa se mantiene en memoria ante otra aceptación sin intereses.
- No se hallaron escenarios fallidos ni bloqueantes nuevos. Los cinco valores de exclusión y los cuatro de conservación del Scenario Outline están ejecutados, no solo inspeccionados.

## Límites y recomendaciones

- Toda petición externa de la página se interceptó o bloqueó; no hubo POST reales en US-003. Las respuestas aceptadas respetan el contrato del recolector ya establecido (`task`, `profile.id`, sin error), pero esta evidencia no demuestra workflows reales ni generación real de afinidades. No se asignan intereses artificiales al producto.
- Composición con una región específica **NO VERIFICADA en esta ejecución de US-003**: el catálogo sintético es nacional y US-004 aún está pendiente de integración. Verificar esa composición en QA de US-004 sobre el baseline integrado.
- Otros navegadores, lector de pantalla completo y gestos táctiles físicos **NO VERIFICADOS**; no se reclama auditoría integral de accesibilidad ni regresión completa de US-001/002. Se comprueban aquí las superficies afectadas por el render y las salidas de diálogo utilizadas.

## Decisión

- [x] Aprobado para demo con usuario
- [ ] Requiere corrección antes de demo

La aceptación humana corresponde al gate del coordinador. Baseline US-003 liberado tras el análisis; cualquier integración posterior requiere su validación correspondiente. Sin cambios de estados, commits, despliegues o publicación.
