# language: en
Feature: Descubrir beneficios según los intereses del visitante
  Como visitante de MASTV
  Quiero ver recomendaciones ajustadas a mis intereses y explorar otras categorías
  Para encontrar primero beneficios afines sin perder el acceso a categorías nuevas

  Scenario: Ordenar recomendaciones por afinidad
    Given el visitante sin región registrada tiene afinidad 4 en Comida, 2 en Cine y 1 en Ropa con ofertas publicadas en esas categorías
    When consulta Todos
    Then ve las ofertas de Comida antes que las de Cine
    And no ve las ofertas de Ropa en las recomendaciones

  Scenario Outline: Excluir categorías sin afinidad suficiente
    Given un beneficio pertenece a una categoría cuyo interés del visitante es <interes>
    When el visitante consulta Todos
    Then ese beneficio no aparece en las recomendaciones

    Examples:
      | interes              |
      | ausente              |
      | cero                 |
      | uno                  |
      | negativo             |
      | no numérico          |

  Scenario: Reconocer un visitante sin recomendaciones
    Given Strapi publica ofertas y el visitante no tiene intereses registrados
    When consulta Todos
    Then se informa que todavía no hay recomendaciones personalizadas
    And se ofrecen las categorías disponibles para explorar ofertas

  Scenario: Explorar una categoría sin interés previo
    Given el visitante no tiene afinidad en Cine y hay ofertas de Cine elegibles para su región
    When selecciona Cine
    Then ve las ofertas elegibles de Cine sin exclusión por afinidad

  Scenario: Aplicar nuevos intereses recibidos
    Given el visitante consulta Todos con un mapa de intereses anterior
    When Tracardi acepta una interacción y devuelve un nuevo mapa válido de intereses
    Then las recomendaciones se recalculan con el nuevo mapa completo
    And reflejan las nuevas afinidades sin recargar la página

  Scenario: Eliminar recomendaciones tras recibir intereses vacíos
    Given el visitante tiene recomendaciones basadas en intereses anteriores
    When Tracardi devuelve un mapa de intereses vacío en una interacción aceptada
    Then Todos muestra el estado sin recomendaciones personalizadas

  Scenario Outline: Conservar los últimos intereses válidos
    Given el visitante tiene un mapa válido de intereses
    When la siguiente interacción devuelve <resultado>
    Then las recomendaciones conservan el último mapa válido

    Examples:
      | resultado                        |
      | aceptación sin intereses         |
      | aceptación con intereses inválidos |
      | rechazo del registro             |
      | fallo de comunicación            |

  Scenario: Recuperar recomendaciones al volver al sitio
    Given el navegador conserva un perfil MASTV y sus intereses válidos
    When el visitante vuelve a MASTV y finaliza la carga del catálogo
    Then Todos aplica los intereses conservados para ese perfil

  Scenario: Ignorar preferencias conservadas que no pueden interpretarse
    Given los intereses conservados del visitante no se pueden interpretar
    When el visitante consulta Todos después de cargar las ofertas
    Then ve el estado sin recomendaciones y puede explorar categorías
