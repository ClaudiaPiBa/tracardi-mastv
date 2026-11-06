# language: en
Feature: Consultar beneficios disponibles en la región consentida
  Como visitante de MASTV
  Quiero compartir o retirar mi ubicación para consultar beneficios nacionales y de mi región
  Para evitar recomendaciones regionales que no puedo utilizar y conservar el acceso si no comparto mi ubicación

  Scenario: Esperar una decisión antes de solicitar ubicación
    Given el visitante no tiene una región consentida conservada
    When entra a MASTV
    Then se le ofrece permitir o rechazar el uso de ubicación
    And no se solicitan coordenadas hasta que elija permitir

  Scenario: Aplicar una región resuelta con consentimiento
    Given el visitante permite ubicación y hay ofertas de Comida nacionales, de MX-CMX y de MX-JAL
    When su ubicación se resuelve como MX-CMX y consulta Comida
    Then ve las ofertas nacionales y de MX-CMX sin las de MX-JAL
    And el catálogo indica que la región activa es MX-CMX

  Scenario: Asociar región al visitante sin coordenadas
    Given el visitante ha permitido ubicación y Tracardi puede aceptar sus eventos
    When se resuelve una región válida para su ubicación
    Then Tracardi recibe un evento de ubicación con región, consentimiento e identidad del visitante
    And no se incluyen coordenadas en ese evento ni se conservan en el navegador

  Scenario Outline: Continuar sin compartir ubicación
    Given el visitante no tiene región conservada y hay ofertas nacionales y regionales de Comida
    When decide <decision> y consulta Comida
    Then puede explorar todas las ofertas de Comida sin exclusión regional
    And no se solicita ubicación ni se registra un evento de ubicación

    Examples:
      | decision                |
      | rechazar                |
      | cerrar el diálogo       |
      | salir mediante Escape   |

  Scenario Outline: Continuar cuando no puede determinarse la región
    Given el visitante no tiene región conservada y ha elegido permitir ubicación
    When la determinación de región termina con <resultado>
    Then se informa del impedimento y puede explorar categorías sin exclusión regional
    And no se registra una ubicación sin región válida

    Examples:
      | resultado                       |
      | permiso del navegador denegado   |
      | ubicación no soportada          |
      | tiempo de espera agotado        |
      | resolución sin código regional  |
      | servicio de resolución fallido  |

  Scenario: Restaurar una región consentida
    Given el navegador conserva la región consentida MX-CMX del visitante MASTV
    When el visitante vuelve al sitio y consulta Comida
    Then se aplica MX-CMX y están disponibles las ofertas nacionales y de esa región
    And no se solicitan coordenadas ni se registra una nueva ubicación solo por volver

  Scenario: Sustituir la región por una nueva decisión
    Given el visitante tiene MX-CMX como región activa y permite actualizar su ubicación
    When la nueva ubicación se resuelve como MX-JAL
    Then los listados aplican MX-JAL en lugar de MX-CMX
    And se envía la nueva región consentida con la misma identidad del visitante

  Scenario: Retirar una región conservada
    Given el visitante tiene una región consentida y vuelve a abrir Cambiar ubicación
    When rechaza el uso de ubicación
    Then se elimina la región activa y conservada del sitio
    And los listados dejan de aplicar exclusión regional sin modificar sus afinidades

  Scenario: Conservar la región anterior si falla su actualización
    Given el visitante tiene MX-CMX consentida y permite actualizar su ubicación
    When no puede resolverse una nueva región
    Then se informa que no pudo actualizarse y se conserva MX-CMX

  Scenario: Aplicar la región aunque no pueda sincronizarse su evento
    Given el visitante permite ubicación y Tracardi no puede confirmar la recepción del evento
    When su ubicación se resuelve como MX-CMX
    Then el catálogo aplica MX-CMX con las ofertas nacionales y regionales correspondientes
    And se informa que no pudo confirmarse la sincronización sin afirmar que fue registrada

  Scenario: Combinar afinidad con elegibilidad regional
    Given el visitante tiene región MX-CMX y afinidad mayor que 1 en Cine y Comida con ofertas nacionales y de otras regiones
    When consulta Todos
    Then solo ve ofertas afines nacionales o de MX-CMX ordenadas por afinidad

  Scenario: Actualizar afinidades devueltas al sincronizar región
    Given el visitante tiene intereses anteriores y Tracardi acepta el registro de su región
    When la respuesta incluye un nuevo mapa válido de intereses
    Then las recomendaciones reflejan el nuevo mapa y la región consentida
