# language: en
Feature: Consultar beneficios vigentes administrados en Strapi
  Como visitante de MASTV
  Quiero consultar el catálogo y el detalle con los datos publicados en Strapi
  Para elegir y utilizar un beneficio con información y cupón coherentes

  Scenario: Consultar la categoría con datos remotos
    Given Strapi publica un beneficio de Comida con título, comercio, descripción, descuento y cupón de prueba
    When el visitante consulta la categoría Comida
    Then la tarjeta muestra los datos publicados de ese beneficio
    And no aparecen las ofertas de ejemplo que ya no publica Strapi

  Scenario: Reconocer una carga de catálogo en curso
    Given la consulta a Strapi aún no ha terminado
    When el visitante accede al catálogo
    Then se informa que las ofertas se están cargando
    And no se presenta la espera como ausencia de promociones

  Scenario: Consultar todas las páginas publicadas
    Given Strapi publica más de una página de ofertas de Comida con identificadores distintos
    When el visitante consulta la categoría Comida tras finalizar la carga
    Then están disponibles las ofertas de todas las páginas publicadas de esa categoría

  Scenario: Abrir un detalle coherente con la tarjeta
    Given un beneficio remoto de Comida tiene un cupón de prueba y condiciones comerciales publicadas
    When el visitante abre su detalle desde la categoría Comida
    Then consulta el título, descripción, cupón y condiciones de ese mismo beneficio
    And la confirmación de canje corresponde a ese beneficio

  Scenario: Copiar el cupón publicado
    Given el visitante consulta un beneficio con cupón de prueba y la copia está permitida
    When solicita copiar el cupón
    Then recibe el código publicado de ese beneficio en el portapapeles
    And se informa que el código fue copiado

  Scenario: Reconocer un catálogo publicado sin ofertas
    Given Strapi responde correctamente con un catálogo sin ofertas
    When el visitante consulta el catálogo
    Then se informa que no hay promociones disponibles

  Scenario: Recuperar una carga fallida
    Given Strapi no pudo entregar el catálogo completo
    When el visitante consulta el catálogo
    Then se informa que no se pudieron cargar las ofertas y se ofrece reintentar
    And no se muestran ofertas de ejemplo o un catálogo parcial como si estuviera completo

  Scenario: Volver a intentar la carga
    Given una carga anterior falló y Strapi ya puede entregar el catálogo
    When el visitante vuelve a intentar la carga
    Then puede consultar las ofertas publicadas mediante sus categorías

  Scenario: Separar ofertas incompletas de ofertas utilizables
    Given Strapi publica una oferta sin identidad y otra oferta de Comida con datos mínimos válidos
    When el visitante consulta la categoría Comida
    Then se muestra la oferta válida y se informa que algunas ofertas no están disponibles
    And no puede abrirse la oferta sin identidad

  Scenario: Consultar una oferta sin cupón
    Given Strapi publica un beneficio de Comida con identidad y título pero sin cupón
    When el visitante abre su detalle desde Comida
    Then se informa que el cupón no está disponible
    And no se permite copiar un código ni confirmar un canje de ese beneficio

  Scenario: Acceder al catálogo desde Inicio
    Given el catálogo remoto no contiene ninguna de las ofertas de ejemplo del Inicio
    When el visitante elige ver un beneficio destacado del Inicio
    Then accede al catálogo remoto sin intentar abrir una oferta fija inexistente
