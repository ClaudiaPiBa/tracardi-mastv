# Evidencia reproducible US-005

Entorno usado: Node 24.16.0 y Google Chrome 156.0.8078.79 en Linux. No requiere dependencias npm. El helper conserva el sandbox de Chrome.

Copiar `us005.mjs`, `cdp.mjs` y `fixtures.mjs` juntos a un directorio temporal escribible. `cdp.mjs` fija `projectRoot` al proyecto `/home/swumplurd/Documentos/devsarrollo/repos/tracardi-mastv`; ajustar solo esa constante si cambia la ubicación local. Ejecutar desde el proyecto:

```sh
node --check /tmp/mastv-us005-qa/us005.mjs
node /tmp/mastv-us005-qa/us005.mjs
```

Requiere permiso para escuchar en loopback y lanzar Chrome. En este entorno el sandbox restringe `listen(127.0.0.1)`, por lo que el coordinador ejecuta el comando con autorización shell. El runner levanta y cierra su propio servidor local, abre un perfil temporal independiente por caso y cierra todos los navegadores al terminar. No usar `--no-sandbox`.

El directorio de salida final es `evidence-final/` junto al runner. Contiene `results.json`, capturas, hashes SHA256 antes/después y la información observable de cada caso. La salida de proceso es 0 si los nueve casos pasan y 1 si alguno falla.

Casos 01–03: 320/480/1024 px, dos imágenes sintéticas con marcos y esquinas visibles (horizontal480×120 y vertical120×320). Se mide `naturalWidth/naturalHeight`, caja, contain, límites de tarjeta/documento y árbol AX. La primera imagen usa oferta/media planos y URL absoluta; la segunda usa oferta attributes/media data.attributes y ruta relativa resuelta al origen de Strapi.

Casos 04–06: imagen ausente, URL vacía y HTTP404; iconos esperados Comida/Cine/Ropa sin nodo img roto. Caso07: Tab alcanza la segunda oferta y Enter/Espacio abren su detalle; cada apertura produce exactamente offer-click/offer-view del mismo ID. Casos08–09: recomendaciones y filtro regional/categoría con imágenes; afinidades, elegibilidad y evento existente cine-seg se mantienen.

Las imágenes, Strapi y Tracardi se interceptan mediante CDP; el resto de destinos externos se bloquea, incluido el proveedor de fuentes. Se usa la tipografía de respaldo local. Nunca se envían eventos reales, coordenadas ni cambios a servicios remotos. La disponibilidad de un medio real no nulo queda fuera de la evidencia sintética.

Se conservan aparte `evidence/` (primera pasada incompleta) y `diagnostic-evidence/` (diagnóstico solo480 con `--diagnose`). La primera preparación esperaba únicamente aria-busy false, valor presente ya en el HTML antes de ejecutar scripts defer. El diagnóstico mostró que el click de inicio encontraba el backdrop de ubicación. El runner final espera document.readyState complete, aria-busy false y categorías creadas por app.js antes de cerrar el modal y navegar. No hubo cambio del producto para resolver esa carrera del runner.

La evidencia ejecutada se compone de ocho PASS en `evidence-final/results.json` y el cierre focal del caso07 en `keyboard-evidence/results.json`. El primer intento de07 tenía el botón enfocado pero Enter sin carácter de retorno no generaba click nativo. El helper definitivo envía keyDown/keyUp por CDP, Enter con código virtual/nativo13 y text/unmodifiedText de retorno, y Espacio con código32 y carácter espacio. `--keyboard` selecciona únicamente el caso07, conserva su ID y escribe un directorio independiente:

```sh
node /tmp/mastv-us005-qa/us005.mjs --keyboard
```

El registro `keyboardEvents` permite revisar keydown/keypress/keyup/click con `isTrusted`; no se llama al manejador del botón ni a su click de DOM. La pasada completa conserva el fallo original del helper para trazabilidad. No hace falta repetir los ocho PASS cuando sus hashes y los de la repetición focal coinciden.
