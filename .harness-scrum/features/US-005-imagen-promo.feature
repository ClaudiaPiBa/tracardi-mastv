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
