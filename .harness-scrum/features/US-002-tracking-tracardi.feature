# language: en
Feature: Registrar consultas y confirmaciones de canje en Tracardi
  Como responsable de beneficios MASTV
  Quiero medir filtros, consultas y confirmaciones de canje asociadas al visitante
  Para comparar el interés y las confirmaciones por oferta sin contar cancelaciones como canjes

  Scenario Outline: Registrar la selección de un filtro
    Given el catálogo ofrece el filtro <categoria>
    When el visitante selecciona <categoria>
    Then Tracardi recibe un evento de <evento> asociado al visitante y esa selección

    Examples:
      | categoria   | evento          |
      | Comida      | comida-seg      |
      | Electronica | electronica-seg |
      | Cine        | cine-seg        |
      | Ropa        | ropa-seg        |
      | Online      | online-seg      |
      | Todos       | category-filter |
      | Viajes      | category-filter |

  Scenario: Registrar la apertura de un beneficio
    Given un beneficio remoto con datos comerciales válidos está disponible en su categoría
    When el visitante abre el detalle del beneficio
    Then Tracardi recibe una consulta y una apertura correspondientes a ese mismo beneficio
    And ambas incluyen su identidad comercial y los datos de oferta publicados

  Scenario: Vincular nuevas interacciones con el perfil recibido
    Given el visitante tiene una sesión anónima y Tracardi aceptó una primera interacción devolviendo un perfil
    When el visitante realiza otra interacción
    Then Tracardi recibe esa interacción con la misma sesión y el perfil recibido

  Scenario: Mantener la identidad al recargar
    Given la sesión y el perfil MASTV del visitante pudieron conservarse en este navegador
    When el visitante recarga MASTV y consulta otro beneficio
    Then la nueva consulta se asocia con la sesión y el perfil conservados

  Scenario: Seguir midiendo durante una visita sin persistencia disponible
    Given el navegador no permite conservar datos entre visitas y ya existe una sesión en la visita actual
    When el visitante realiza otra interacción durante esa visita
    Then la interacción mantiene la sesión y el perfil conocidos durante la visita

  Scenario: Confirmar el registro de un canje
    Given el visitante revisa la confirmación de un beneficio con cupón y Tracardi acepta su registro
    When confirma el canje
    Then Tracardi recibe una confirmación con el identificador, cupón y datos comerciales de ese beneficio
    And el visitante recibe un mensaje de confirmación registrada

  Scenario Outline: Abandonar una confirmación sin registrar canje
    Given el visitante tiene abierta la confirmación de un beneficio
    When abandona la confirmación mediante <salida>
    Then no se registra un canje en Tracardi

    Examples:
      | salida              |
      | cancelar            |
      | cerrar el diálogo   |
      | la tecla de escape  |

  Scenario: Evitar confirmaciones repetidas mientras se procesa una acción
    Given una confirmación de canje ya está en proceso
    When el visitante intenta confirmarla de nuevo antes de recibir el resultado
    Then solo se envía una confirmación para esa acción pendiente

  Scenario Outline: Informar un registro de canje no confirmado
    Given Tracardi devuelve <resultado> al registrar un canje
    When el visitante confirma el canje de un beneficio con cupón
    Then se informa que no pudo confirmarse el registro
    And no se muestra un mensaje de canje registrado

    Examples:
      | resultado                         |
      | rechazo del registro              |
      | respuesta sin aceptación válida   |
      | fallo de comunicación             |

  Scenario: Continuar consultando si falla la medición
    Given las ofertas están cargadas y el servicio de tracking no está disponible
    When el visitante abre un beneficio desde su categoría
    Then puede consultar el detalle y copiar el cupón disponible

  Scenario: Actualizar el catálogo sin contar otra interacción
    Given el visitante ya seleccionó una categoría y su interacción fue registrada
    When el catálogo se actualiza por una respuesta de personalización
    Then no se registra otra selección de filtro ni apertura de oferta por esa actualización
