# Reporte QA: US-002 — revisión 1

**Fecha:** 2026-11-05
**Veredicto:** ❌ FALLA

Los 21 casos expandidos se ejecutaron en Chrome con fixtures sintéticos. El runner termina20PASS/1FAIL: el bloqueo de duplicados del caso16 funciona, pero su extensión de respuesta tardía deja un mensaje de operación pendiente falso en otro beneficio. El coordinador confirmó el defecto de estado; requiere corrección antes de demo. La recepción real y la regresión LONG asíncrona pasan.

## Comandos y evidencia

**Directorio:** `/home/swumplurd/Documentos/devsarrollo/repos/tracardi-mastv`. Node24.16.0, Chrome156 headless/CDP con sandbox normal; servidor/origen local efímero. Ejecución mediante `exec_command require_escalated`.

| Comando | Salida | Resultado |
|---|---:|---|
| `node /tmp/tracardi-qa/us002.mjs` | 1 | 21 casos;20PASS/1FAIL, sin excepciones Runtime capturadas. |
| `node /tmp/tracardi-qa/us002-real.mjs` | 0 | 2POST reales sintéticos;200 y aceptación semántica en ambos; CORS `*`; misma sesión y perfil recibido reutilizado. |
| `node /tmp/tracardi-qa/us002-long.mjs` | 0 | LONG320 con scroll, teclado, mensaje pendiente y éxito solo tras aceptación. |

Leídos historia/feature, informe final `impl_US-002.md`, módulo tracking y su integración. No se repitieron unidades del developer ni el catálogo entero: se verificó comportamiento independiente de UI/red. Cada caso controlado usa perfil Chrome nuevo; recarga conserva el mismo perfil sintético únicamente en el escenario correspondiente. Se responden preflights sin desactivar seguridad del navegador. Red ajena a fixtures bloqueada. Los hashes del código entregado están en `evidencia/US-002/source-hashes.json`.

Evidencia persistente: `evidencia/US-002/results.json` contiene payloads sintéticos, resultados y errores por caso. `16-failure.png` muestra el fallo; `12.png` el éxito y `18.png` el error controlado. `long.json`, `long-pending-320.png` y `long-success-320.png` documentan la regresión; `us002-real.json` contiene recepción real sin identificadores de perfil devueltos. Runners y fixtures se conservan en la misma carpeta.

## Resultado por escenario

La tabla resume Given configurado, When ejecutado y Then comprobado; los IDs corresponden a `results.json`. Los siete filtros y tres salidas/errores de los Scenario Outline se ejecutaron completos. No hay Background.

| ID | Escenario / Given | When | Then observado | Resultado |
|---|---|---|---|---|
|01|Filtro Comida disponible|Seleccionar Comida|1comida-seg, categoría/fecha/acción correctas, visitante asociado|✅|
|02|Filtro Electronica disponible|Seleccionar Electronica|1electronica-seg con identidad y selección|✅|
|03|Filtro Cine disponible|Seleccionar Cine|1cine-seg con identidad y selección|✅|
|04|Filtro Ropa disponible|Seleccionar Ropa|1ropa-seg con identidad y selección|✅|
|05|Filtro Online disponible|Seleccionar Online|1online-seg con identidad y selección|✅|
|06|Filtro Todos disponible|Seleccionar Todos|1category-filter con categoría Todos|✅|
|07|Filtro Viajes disponible|Seleccionar Viajes|1category-filter con categoría Viajes|✅|
|08|Beneficio remoto QA completo|Abrir detalle|Una offer-click y una offer-view, mismos ID/título/categoría/comercio/precios/descuento/cupón/fecha/tipo publicados|✅|
|09|Primera interacción retenida sin perfil|Abrir antes de respuesta inicial y liberar|Solo primer envío mientras espera; siguiente conserva sesión y adopta perfil recibido|✅|
|10|Identidad MASTV conservada|Recargar y abrir otro beneficio|Sesión y perfil iguales en filtro y consulta posteriores|✅|
|11|localStorage arroja SecurityError|Filtrar y abrir en la misma visita|Identidad y perfil conservados en memoria|✅|
|12|Confirmación con cupón, aceptación retenida|Confirmar y liberar respuesta válida|1offer-redeem con datos/cupón/fecha; sin éxito antes de aceptación, luego mensaje registrado|✅|
|13|Confirmación abierta|Cancelar|0offer-redeem|✅|
|14|Confirmación abierta|Cerrar diálogo|0offer-redeem|✅|
|15|Confirmación abierta|Escape|0offer-redeem|✅|
|16|CanjeA pendiente|Intentar duplicar; después cerrar y abrirB, liberarA|1offer-redeem y ninguna interrupción/modal de éxito enB; **queda mensaje pendiente falso enB**|❌ extensión de estado|
|17|Recolector devuelve rechazo semántico y perfil intruso|Confirmar|Mensaje no confirmado, sin éxito, identidad anterior intacta, controles recuperados|✅|
|18|HTTP200 sin aceptación válida; luego JSON malformado|Confirmar e intentar de nuevo explícitamente|Ambas respuestas producen error sin éxito ni cambio de identidad|✅|
|19|Fallo de comunicación|Confirmar|Mensaje no confirmado, sin éxito ni cambio de identidad|✅|
|20|Tracking siempre falla|Abrir detalle y copiar|Consulta disponible y Clipboard API real contiene cupón publicado|✅|
|21|Filtro seleccionado y respuesta aceptada con interests retenida|Liberar respuesta y observar DOM|Reemplazo real de tarjetas detectado por MutationObserver; sin nuevo filtro ni apertura|✅|

## Defecto reproducible — caso 16

- **Paso fallido:** al resolver la confirmación anterior, el detalle actualmente abierto debe conservar un estado coherente; no debe seguir indicando una operación pendiente finalizada.
- **Reproducción:** filtrar Comida; abrir ofertaA; abrir confirmación y confirmar con respuesta de offer-redeem retenida. Intentar confirmar de nuevo (se bloquea correctamente). Salir con Escape, volver al catálogo y abrir ofertaB. Liberar aceptación válida deA y dejar completar la consultaB.
- **Resultado real:** detalleB conserva exactamente `Hay una confirmación en proceso.` después de concluirA; no hay otra operación pendiente. El runner esperaba ausencia de ese estado. No se abrió éxito enB y no se duplicó el canje: esas guardas sí funcionan.
- **Causa en código:** completion pone `pendingRedemption=null` y restaura controles, pero actualiza `redemptionFeedback` únicamente cuando `selectedOffer===action.offer`; el mensaje temporal que `openOffer` escribió paraB queda sin limpiar.
- **Evidencia:** `results.json` caso16 registra el texto real y cuatro POST controlados: filtro, aperturaA, canjeA y aperturaB; `16-failure.png`. No fue fallo del runner ni se cambió implementación.

## Recepción real, separada de fixtures

Strapi se sustituyó íntegramente por una oferta sintética. Solo se permitieron los POST/OPTIONS del recolector `http://localhost:8686/track`, fuente pública `demo-source`, con sesión anónima nueva. Primera petición comida-seg con perfil null; segunda con offer-click/offer-view de `QA-REAL-QA-SYNTHETIC`, misma sesión y perfil devuelto en la primera respuesta. Ambas respondieron200 con task no vacío y profile.id válido, sin error explícito; CORS permitió al navegador leer la respuesta. Se conservaron solo tipos de eventos, marcadores de presencia/continuidad y esquema; ningún ID de perfil real se publica.

Esto demuestra **recepción/aceptación por el recolector**, no procesamiento final de workflows, cálculo de afinidades, validación comercial ni consumo del cupón. No hubo canje real, consultas administrativas, lectura de perfiles existentes ni modificación de servicios.

## Regresión y límites

LONG320×568 pasó: diálogo y18..550, scrollTop0→467, contenido completo y acciones alcanzables por rueda/Tab; Cancelar/Cerrar funcionan. Durante registro retenido el mensaje añade altura desplazable sin desbordar el cuadro; no aparece éxito hasta aceptar, y luego Escape vuelve al catálogo.0 excepciones Runtime.

Sin auditoría completa de lector de pantalla, gesto táctil físico ni otros navegadores (**NO VERIFICADOS**). Los servicios y fuentes reales se limitaron a la prueba de recepción anterior; el comportamiento negativo y de concurrencia se demuestra mediante fixtures. No se reclaman afinidades/región, propias de historias posteriores. Sin cambios de producto, estados, commits, despliegue o publicación.

## Recomendaciones

Limpiar el mensaje temporal pendiente del detalleB cuando finaliceA, manteniendo la guarda que evita mostrar éxito o información comercial deA enB. Repetir solo caso16 y controles afectados; conservar esta evidencia de los otros casos, recepción real y LONG.

## Decisión

- [ ] Aprobado para demo con usuario
- [x] Requiere corrección antes de demo (estado pendiente incorrecto tras respuesta tardía)
