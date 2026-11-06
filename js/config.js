'use strict';

// Configuración pública: nunca añadir tokens ni credenciales a estos archivos.
window.MASTV_CONFIG = Object.freeze({
  offersApi: 'http://localhost:1337/api/offers',
  trackingApi: 'http://localhost:8686/track',
  trackingSource: 'demo-source',
  geocodingApi: 'https://nominatim.openstreetmap.org/reverse'
});
