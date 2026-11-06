# Configuración del Proyecto

## Identificación

- **Nombre:** MASTV — Catálogo de ofertas
- **Descripción:** Frontend de beneficios y promociones MASTV con catálogo, detalle y flujo de confirmación de canje.
- **Ruta absoluta:** /home/swumplurd/Documentos/devsarrollo/repos/tracardi-mastv

## Stack tecnológico

- **Lenguaje principal:** HTML, CSS, JavaScript
- **Framework / runtime:** ninguno
- **Gestor de paquetes / dependencias:** N/A
- **Entorno de ejecución:** Navegador web; archivos estáticos sin runtime de servidor declarado.

## Comandos clave

```
build:      N/A
test:       N/A
typecheck:  N/A
lint:       N/A
dev:        N/A
```

## Convenciones de código

- **Indentación:** 2 espacios en HTML y bloques JavaScript; el código existente también contiene funciones y CSS compactados en una línea.
- **Estilo de nombres:** camelCase en JavaScript; clases CSS en kebab-case con variantes BEM.
- **Otras convenciones:** JavaScript en modo estricto, comillas simples y punto y coma; interfaz y contenido en español; conservar navegación, diálogos y accesibilidad existentes.

## Estructura de directorios relevante

```
index.html       Entrada de la interfaz y diálogos.
js/app.js        Integración de catálogo, tracking, recomendaciones y región consentida.
js/config.js     Endpoints públicos de Strapi, Tracardi y resolver regional.
js/catalog.js    Normalización y paginación del catálogo remoto.
js/tracking.js   Eventos e identidad de visitante MASTV.
js/interests.js  Afinidades y recomendaciones asociadas al perfil.
js/location.js   Consentimiento, resolución y cobertura regional.
tests/           Pruebas sintéticas Node sin dependencias nuevas.
css/styles.css   Estilos adaptables de la interfaz.
img/             Recursos SVG de marcas e ilustraciones.
.harness-scrum/  Datos y evidencias del proceso Scrum.
```

## Notas para el developer

- Los comandos N/A conservan lo declarado inicialmente por el usuario. Se añadieron comprobaciones Node sin dependencias en tests/; comandos de verificación y servidor estático local documentados en README.md.
- Referencia de integración de solo lectura: /home/swumplurd/Documentos/devsarrollo/proyectos/tacardi-demo. No modificarla ni copiar credenciales o datos de perfiles.
- Alcance US-001 a US-004 refinado y aprobado en Gate 1 revisión 1 con respuesta «acepto». Ver approval/gate1_v1_aceptado.md. La aceptación final requiere Gate 2.
- Decisión del usuario del 2026-11-05: incluir personalización por ubicación e intereses y reutilizar los mismos servicios Strapi y Tracardi de tacardi-demo. Referencias locales del código: Strapi http://localhost:1337/api/offers y Tracardi http://localhost:8686; verificar acceso y configuración efectiva antes de declarar integración operativa. No copiar secretos al frontend.
- El catálogo consume Strapi; Tracardi recibe interacciones y confirmaciones del visitante. Un task acredita recepción del recolector, no validación comercial del cupón ni procesamiento final de workflows. Las preferencias y la región se usan según las historias aprobadas.
- Nominatim público tiene límites de uso y atribución documentados en README.md. La separación de solicitudes por página no impone un límite global entre visitantes; no se incluye despliegue productivo.
