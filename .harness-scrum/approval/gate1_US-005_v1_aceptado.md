# Gate 1 — US-005: Reconocer las promociones por su imagen

**Revisión:** 1
**Fecha:** 2026-11-06T14:15:37-06:00
**Estado:** Aprobado por el usuario.
**Historia:** [US-005](../stories/US-005.md)
**Feature:** [Criterios Gherkin](../features/US-005-imagen-promo.feature)

## Historia y alcance propuesto

Como visitante del catálogo MASTV, quiero ver la imagen asociada a `imagen_promo` en lugar del icono de cada tarjeta para reconocer visualmente la promoción antes de consultar el beneficio.

La imagen se mostrará completa y proporcionada, con título y acción legibles, incluidas las tarjetas de recomendaciones y filtros. Si falta, está vacía o no carga, se conserva el icono actual de la categoría y la oferta sigue disponible. El acceso al beneficio mediante teclado se conserva.

## Criterios Gherkin

```gherkin
# language: en
Feature: Reconocer las promociones por su imagen
  Como visitante del catálogo de beneficios MASTV
  Quiero ver la imagen de cada promoción en lugar de su icono genérico
  Para identificar visualmente la promoción antes de consultar el beneficio

  Scenario Outline: Mostrar la imagen de la promoción adaptada a su tarjeta
    Given una promoción disponible con una imagen cargable asociada a imagen_promo
    And un catálogo presentado a un ancho de <ancho> píxeles
    When el visitante consulta la tarjeta de esa promoción
    Then ve la imagen completa y proporcionada dentro de la tarjeta en lugar del icono genérico
    And el título y la acción Ver beneficio permanecen legibles y accesibles sin anunciar el nombre del archivo de imagen

    Examples:
      | ancho |
      | 320   |
      | 480   |
      | 1024  |

  Scenario Outline: Conservar el icono cuando no se puede mostrar la imagen
    Given una promoción disponible cuya imagen está <estado>
    When el visitante consulta la tarjeta de esa promoción
    Then ve el icono genérico correspondiente a su categoría sin una imagen rota
    And conserva la información de la promoción y la acción Ver beneficio

    Examples:
      | estado                          |
      | ausente en imagen_promo          |
      | vacía en imagen_promo            |
      | no disponible para cargar        |

  Scenario: Consultar el beneficio desde una tarjeta con imagen mediante teclado
    Given una tarjeta que muestra la imagen de una promoción disponible
    When el visitante activa Ver beneficio mediante el teclado
    Then accede al detalle de esa misma promoción
```

## Supuestos y comprobaciones pendientes

- El respaldo al icono y la imagen completa, sin deformar, son supuestos revisables en esta aprobación.
- El código actual ignora `imagen_promo`. La oferta consultada con GET básico a Strapi no incluyó el campo; su formato todavía no está confirmado. Durante implementación se verificará su estructura, ruta y necesidad de solicitarlo antes de cerrar la adaptación. No se presupone un formato específico.
- No hay preguntas de negocio bloqueantes con estos supuestos.

## Decisión requerida

Aprobar o rechazar explícitamente el alcance de US-005, revisión 1, incluidos sus criterios y supuestos. Si se aprueba, se planificará el siguiente sprint y se delegará implementación y verificación. La solicitud inicial no sustituye este Gate 1; la aceptación del Sprint 001 corresponde a una revisión anterior.

## Registro de aprobación

- **Fecha:** 2026-11-06T14:17:33-06:00
- **Respuesta literal:** «apruebo».
- **Alcance:** US-005, Gate 1 revisión 1 con sus criterios y supuestos.
