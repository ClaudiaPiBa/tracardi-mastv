# Gate 2 — US-005: Reconocer las promociones por su imagen

**Revisión:** 1
**Fecha:** 2026-11-06T15:17:01-06:00
**Estado:** Pendiente de aceptación afirmativa explícita del usuario.
**Historia:** [US-005](../stories/US-005.md), En Review, Sprint 002.
**Gate 1:** revisión 1 aprobada con «apruebo», [registro](gate1_US-005_v1_aceptado.md).

## Resultado concreto

Las tarjetas del catálogo, recomendaciones y filtros usan la imagen asociada a `imagen_promo` en lugar del icono. Solicitan el campo a Strapi, muestran el medio completo y proporcionado dentro del espacio de cabecera y conservan el título y «Ver beneficio». Si falta, está vacío o el archivo no carga, se conserva el icono de la categoría y la oferta sigue disponible. Enter y Espacio abren el detalle de la misma promoción.

## Demo visual y reproducción

Capturas de navegador con ofertas e imágenes sintéticas, no datos de promociones reales:

- [Tarjetas a 320 px](../progress/reporte/qa/evidencia/US-005/evidence-final/01.png).
- [Tarjetas a 480 px](../progress/reporte/qa/evidencia/US-005/evidence-final/02.png).
- [Tarjetas a 1024 px](../progress/reporte/qa/evidencia/US-005/evidence-final/03.png).
- [Respaldo ante imagen no disponible](../progress/reporte/qa/evidencia/US-005/evidence-final/06.png).
- [Detalle abierto con Enter](../progress/reporte/qa/evidencia/US-005/keyboard-evidence/07-detail-Enter.png) y [Espacio](../progress/reporte/qa/evidencia/US-005/keyboard-evidence/07-detail-Space.png).

Las imágenes de prueba horizontal y vertical incluyen borde y esquinas para comprobar que se muestran completas. Reproducción sintética documentada en [REPRODUCIR.md](../progress/reporte/qa/evidencia/US-005/REPRODUCIR.md).

Para consultar el catálogo real, seguir README.md del proyecto: servir los archivos con `python3 -m http.server 8080 --bind 127.0.0.1` desde el proyecto y abrir http://127.0.0.1:8080 con Strapi/Tracardi disponibles. Explorar una categoría si «Todos» no tiene afinidades. En la consulta realizada, las siete ofertas tienen `imagen_promo: null`; por ello el catálogo real conserva sus iconos actuales. La funcionalidad mostrará imágenes cuando las ofertas expongan un medio compatible.

## Evidencia y veredicto QA

**⚠️ PASA CON OBSERVACIONES**, [reporte completo](../progress/reporte/qa/qa_US-005.md).

- Siete casos Gherkin expandidos verificados: tres anchos, tres respaldos y acceso por teclado.
- Dos regresiones focales verificadas: recomendaciones y región/categoría con imágenes.
- Resultado combinado de ocho PASS conservados y repetición focal 07 PASS; hashes de ocho fuentes iguales antes/después y entre pasadas.
- Cero excepciones Runtime en los casos aprobados; cada apertura por teclado registra el par de consulta existente; cargar imágenes no genera esos eventos.
- Developer: sintaxis correcta, 64/64 pruebas Node y carga real de siete ofertas sin omisiones.
- Los intentos iniciales, diagnóstico y fallo del helper de Enter quedan archivados. Se corrigió únicamente el runner, sin cambios del producto para superar esas ejecuciones.
- Reporte y artefactos instalados con hashes verificados; manifiesto artifact-hashes.json en evidencia/US-005.

## Observaciones y límites que deben mostrarse al aceptar

- **Integración visual real NO VERIFICADA:** las siete ofertas reales consultadas tienen `imagen_promo: null`. No hay un archivo real asociado que permita verificar su forma efectiva y carga. La consulta real con población funciona; las imágenes no nulas se verificaron con fixtures planos y Strapi v4, con URL absoluta y relativa al origen de Strapi. No se modificaron registros remotos para crear evidencia.
- QA de interfaz ejecutado en Chrome, con imágenes y servicios externos interceptados. Otros navegadores, dispositivos físicos y lectura auditiva con lector de pantalla no están verificados. Se comprobaron teclado y árbol de accesibilidad de Chrome.
- La imagen completa se ajusta al espacio visual de la cabecera, de hasta 90×80 px.
- No se realizaron commits, merge, despliegue ni publicación.

## Decisión requerida

Aceptar o rechazar explícitamente US-005, Gate 2 revisión 1, con la demo y las observaciones anteriores. Solo tras aceptación se marcará Done y se cerrará Sprint 002. Si hay rechazo de implementación, volverá a developer; un cambio de alcance requiere PO y nueva revisión de Gate 1.
