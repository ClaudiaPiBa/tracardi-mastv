# Reporte QA: US-001 — revisión 2

**Fecha:** 2026-11-05
**Veredicto:** ✅ PASA

El defecto de confirmación con contenido remoto extenso queda corregido. Se conserva el reporte de fallo como `qa_US-001_r1.md` y toda la evidencia original en `evidencia/US-001/`. Esta revisión agrega evidencia focal en `evidencia/US-001/r2/`; no borra ni cambia el fallo histórico.

## Delta y alcance

Se leyó la sección de corrección de `impl_US-001.md` y el CSS final. Solo cambió `css/styles.css`: límite de altura vh/dvh según padding del backdrop, `overflow-y:auto` y `overscroll-behavior:contain` para diálogos. Los SHA256 de index.html, app.js, catalog.js y config.js coinciden con el baseline de revisión1; el archivo `r2/results.json` registra esa comparación. No se modificó implementación durante QA.

Se reutilizan los once escenarios base PASS, la regresión de formatos/omitidos/opcionales/navegación y la lectura real de Strapi HTTP200/CORS con7registros documentados en `qa_US-001_r1.md`. No se repitieron esos escenarios ni GET real, por mantenerse el mismo código funcional. La variante que falló en revisión1 se ejecutó nuevamente con el mismo fixture LONG.

## Ejecución

**Comando:** `node /tmp/tracardi-qa/us001-revision2.mjs`.
**Directorio:** `/home/swumplurd/Documentos/devsarrollo/repos/tracardi-mastv`.
**Código de salida:** 0. **Resultado:** 3 grupos PASS,0FAIL,0 excepciones Runtime.
**Entorno:** Node24.16.0, Chrome156 headless/CDP con sandbox normal, servidor local y fixtures sintéticos; ejecución con `require_escalated`. Servicios externos interceptados/bloqueados, sin POST ni consultas a datos reales.

La primera ejecución focal pasó scroll y diálogos normales pero el evento Enter del runner carecía de código virtual/caracter requerido por CDP. Se completó exclusivamente el helper de teclado con código13 y carácter de retorno, sin cambios de producto; la repetición de los tres grupos pasó. No se atribuye esa incidencia del runner a la implementación.

## Resultado por escenario afectado y regresión

### ✅ Abrir un detalle coherente con la tarjeta — variante LONG320
- **Given** oferta QA con título200, descripción460 y cupón140, viewport320×568 → verificado; texto completo conservado.
- **When** se abre la confirmación, se desplaza mediante rueda real y se vuelve al inicio del diálogo → ejecutado.
- **Then** diálogo acotado entre y18 y550, altura532; contenido desplazable de999; scrollTop pasa0→467. Cancelar y Cerrar quedan alcanzables mediante desplazamiento y funcionan con puntero, restaurando foco en Canjear → cumplido.
- **Evidencia:** `r2/results.json` grupo1, `long-top-320.png`, `long-actions-320.png`.

### ✅ Acceso por teclado a la confirmación extensa
- **Given** mismo beneficio LONG y diálogo abierto → verificado.
- **When** Tab alcanza Cerrar, Confirmar y Cancelar; Shift+Tab vuelve a Confirmar y Enter activa la acción; también se ensaya Escape → ejecutado.
- **Then** cada control enfocado queda visible por el desplazamiento del diálogo; Enter abre éxito local, Escape lo cierra, y Escape en confirmación restaura el foco al botón de canje → cumplido.
- **Evidencia:** `r2/results.json` grupo2 con geometría de cada control; `long-confirmed-320.png`.

### ✅ Regresión de diálogos normales tras cambio global CSS
- **Given** oferta sintética normal, tamaños320×568,430×932 y1024×768 → verificado.
- **When** se opera ubicación con Tab/Shift+Tab/Escape, confirmación con Escape y confirmación/éxito con puntero → ejecutado.
- **Then** los tres diálogos quedan dentro del viewport; no se solicita geolocalización; navegación y foco de confirmación se conservan, y éxito vuelve al catálogo → cumplido.
- **Evidencia:** `r2/results.json` grupo3 y `normal-catalog-*.png`.

## Observaciones y límites

- El arreglo permite desplazamiento; no exige mostrar todo el texto y todos los controles simultáneamente.
- Conserva los límites de la revisión1: comprobación en Chrome, sin auditoría completa de lector de pantalla ni navegadores adicionales (**NO VERIFICADOS**). Se ejercitaron rueda y teclado reales por CDP; gesto táctil físico **NO VERIFICADO**. El cumplimiento ejecutado no depende de suponer ese gesto.
- Las once comprobaciones base y sus Given/When/Then están en el reporte histórico y `evidencia/US-001/results.json`. El fallo LONG histórico queda resuelto por esta repetición. Sin bloqueantes QA restantes para US-001.
- Sin commits, cambios de estado, despliegue ni publicación. La aceptación humana corresponde al siguiente gate del coordinador.

## Decisión

- [x] Aprobado para demo con usuario
- [ ] Requiere corrección antes de demo
