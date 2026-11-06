# Implementación: US-003

**Fecha:** 2026-11-05
**Estado:** Completada
**Proyecto:** MASTV — Catálogo de ofertas @ /home/swumplurd/Documentos/devsarrollo/repos/tracardi-mastv
**Stack:** HTML/CSS/JavaScript / sin framework / sin gestor de paquetes

Implementación terminada para revisión QA independiente; no equivale a aceptación de la historia. Gate 1 revisión1 aprobado según entrada del coordinador. Se conservan las correcciones de diálogos y feedback tardío verificadas en QA de US-001/002.

## Archivos modificados
- `js/interests.js` — normalización de mapas, selección estable de recomendaciones y persistencia de intereses asociada al perfil MASTV.
- `tests/interests.test.cjs` — once pruebas sintéticas sin dependencias ni llamadas de red.
- `js/app.js` — restaura intereses del perfil actual, consume respuestas aceptadas del tracker y aplica selección al listado; estado vacío específico con acceso a categorías existentes.
- `index.html` — carga del módulo antes de la interfaz.
- `README.md` — reglas de recomendación, reemplazo de mapas, persistencia y verificación.

## Decisiones técnicas
- UI conserva la cadena banner → filtros de todas las categorías válidas → avisos → listado/vacío. Solo cambia el contenido del listado; no añade piezas con posiciones o dimensiones nuevas ni altera diálogos.
- «Todos» filtra categorías con afinidad numérica estrictamente mayor que1 y ordena de mayor a menor. Índice original del catálogo resuelve empates; no se muta el catálogo.
- Categorías e intereses se comparan sin mayúsculas ni espacios exteriores. Se acepta texto numérico mediante Number; `2.5` es válido, `2foo` inválido. Pesos ausentes/no finitos/booleanos/objetos/vacíos equivalen a0.
- Mapa válido es un objeto de categorías/pesos; los contenedores null/lista/texto no sustituyen el mapa anterior. Dentro de un objeto, cada peso inválido equivale a0 sin descartar otras categorías. El coordinador confirmó este criterio como parte del alcance aprobado.
- Categoría explícita muestra todas sus ofertas sin restricción por afinidad. Los filtros siempre proceden del catálogo válido, sin desaparecer por recomendaciones vacías. El vacío «Todavía no hay recomendaciones personalizadas» invita a explorar esas categorías.
- La única entrada de actualización es la suscripción a respuestas aceptadas por US-002. Un mapa nuevo reemplaza completo; `{}` elimina recomendaciones. Campo ausente, contenedor inválido o fallo de tracking conserva intereses del mismo perfil. No se asignan afinidades artificiales ni se configuran workflows.
- `mastv.interests.v1` guarda `{profileId,interests}` en almacenamiento propio. Solo restaura con el mismo perfil conocido de `mastv.visitor.v1`; corrupción se ignora y storage denegado usa memoria. Al cambiar perfil se invalida el mapa anterior salvo un mapa válido de la misma respuesta aceptada.
- La suscripción aplica mapa antes de renderizar. Renderizar no envía filtros/aperturas, no cierra detalle/diálogo ni cambia selección. No se implementó elegibilidad regional de US-004; el módulo permite recibir el catálogo elegible previamente filtrado.
- Módulo/pruebas se prepararon aislados durante QA002; el coordinador ejecutó el helper de integración una vez con permiso explícito después de liberar baseline. No se modificaron tracking/config/catalog/CSS.

## Validación ejecutada
- `node --check js/interests.js`, `node --check js/app.js`: salida0 después de integrar. `git diff --check`: salida0.
- `node --test --test-isolation=none tests/interests.test.cjs`: salida0, **11 pruebas, 11 pasan, 0 fallan**, repetidas sobre módulo instalado. Cubren >1/DESC/empate; pesos ausentes/insuficientes/no finitos; numéricos en texto/case/espacios; categoría explícita; reemplazo/vacío; ausente/malformado conservados; cambio de perfil; restore por perfil; corrupción; storage denegado; copias de estado/claves especiales.
- Build/test/typecheck/lint/dev continúan N/A en PROJECT.md; estas son comprobaciones adicionales sin instalar dependencias.
- `node /tmp/mastv-us003/smoke.mjs`: salida0, ejecutado por el coordinador con permiso explícito, Chrome headless con sandbox normal y red interceptada. Cinco comprobaciones PASA: vacío inicial explicativo con categorías; filtro explícito; Todos ordenado y peso1 excluido; mapa vacío elimina recomendaciones sin cerrar detalle/diálogo; sin eventos adicionales por render. Tres POST sintéticos con cuatro eventos (comida-seg, category-filter, offer-click, offer-view); cero excepciones Runtime. Evidencia `/tmp/mastv-us003/smoke.json`.
- Primera ejecución del smoke falló por sincronización del runner: comprobó el aria-busy=false inicial del HTML antes de finalizar carga. Se cambió solo el runner para esperar también los cuatro filtros derivados del catálogo y la repetición pasó; no se corrigió producto por ese fallo.
- Los helpers de integración y ejecución de Chrome se revisaron y ejecutaron desde el canal del coordinador con permisos escalados; los archivos siguen siendo autoría de este developer.

## Escenarios Gherkin cubiertos

El feature expande16 casos; las unidades anteriores no sustituyen su ejecución completa en navegador. QA independiente cubrirá variantes completas.

- [x] Ordenar recomendaciones por afinidad — unidad y smoke verifican Comida4 antes de Cine2 y excluyen Ropa1.
- [ ] Excluir categorías sin afinidad suficiente — cinco variantes y valores adicionales pasan en unidad; navegador completo pendiente QA.
- [x] Reconocer un visitante sin recomendaciones — smoke verificó cero tarjetas, mensaje específico y todas las categorías consultables.
- [ ] Explorar una categoría sin interés previo — unidad pasa; smoke parcial de integración pasa, variante completa pendiente QA.
- [x] Aplicar nuevos intereses recibidos — unidad de reemplazo y actualización inmediata del listado desde respuesta aceptada verificadas en smoke.
- [x] Eliminar recomendaciones tras recibir intereses vacíos — unidad y smoke verifican listado vacío tras mapa aceptado vacío, conservando detalle/diálogo.
- [ ] Conservar los últimos intereses válidos — unidad para ausente/malformado pasa; rechazos/red no notifican desde US-002; cuatro variantes browser pendientes QA.
- [ ] Recuperar recomendaciones al volver al sitio — unidad por perfil pasa; recarga real de navegador pendiente QA.
- [ ] Ignorar preferencias conservadas que no pueden interpretarse — unidad pasa; navegador con storage corrupto pendiente QA.

## Instrucciones para QA

Desde PROJECT_PATH:

```sh
node --check js/interests.js
node --check js/app.js
node --test --test-isolation=none tests/interests.test.cjs
python3 -m http.server 8080 --bind 127.0.0.1
```

Abrir http://127.0.0.1:8080 con catálogo/track sintéticos. Visitante sin perfil/intereses empieza con Todos vacío, pero categorías explícitas consultables. Para restore, sembrar `mastv.visitor.v1={sessionId,profileId}` y `mastv.interests.v1={profileId,interests}` del mismo perfil. Mapas válidos llegan dentro de la aceptación de US-002: `{task:'tarea-QA',response:{},profile:{id:'perfil-QA',interests:{Comida:4,Cine:2,Ropa:1}}}`.

Selectores existentes `#offerList`, `#emptyState`, `#categoryFilters`, `#detailView`, `#confirmModal`. `interestStore.getState()` permite observar snapshot; el almacenamiento no usa claves de la demo. Probar mapas completo/nuevo/vacío/ausente/inválido; cambio de perfil con y sin mapa; pesos0/1/negativos/no numéricos/no finitos; case/espacios/texto numérico; orden estable; explícitas sin afinidad; recarga/corrupción/storage denegado. Retener respuesta de apertura, abrir confirmación y liberar mapa nuevo para comprobar que solo se actualiza listado sin cerrar detalle/diálogo ni producir eventos adicionales.

## Bloqueantes y límites
- Sin bloqueantes de implementación. Pendiente QA independiente de los16 casos; no se reclaman todos ejecutados por pruebas de unidad o smoke breve.
- No hubo POST reales ni cambios en servicios durante US-003. El frontend consume intereses devueltos por Tracardi; no demuestra que workflows reales calculen una afinidad concreta ni la inventa si el servicio devuelve vacío.
- Sin integración regional aún; no se hicieron commits, despliegues ni publicaciones. Solo el reporte propio se instalará en el harness.
