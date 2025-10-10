<<<<<<< HEAD
const MapModel = (function(){
  const ZONES_KEY = 'safety_zones';
  const POSITIONS_KEY = 'device_positions';

  function loadZones(){
    const saved = localStorage.getItem(ZONES_KEY);
    if (saved) return JSON.parse(saved);
    
    // Zonas padrão
    const defaultZones = [
      { id: 'z1', name: 'Área de Risco 1', x: 0.3, y: 0.3, r: 0.1 },
      { id: 'z2', name: 'Área de Risco 2', x: 0.7, y: 0.7, r: 0.15 }
    ];
    localStorage.setItem(ZONES_KEY, JSON.stringify(defaultZones));
    return defaultZones;
  }

  function getDevicePositions(){
    const saved = localStorage.getItem(POSITIONS_KEY);
    return saved ? JSON.parse(saved) : {};
  }

  function setDevicePosition(deviceId, x, y){
    const positions = getDevicePositions();
    positions[deviceId] = { x, y };
    localStorage.setItem(POSITIONS_KEY, JSON.stringify(positions));
  }

  function resetDevicePositions(){
    localStorage.setItem(POSITIONS_KEY, JSON.stringify({}));
  }

  function pointInZone(x, y, zone){
    const dx = x - zone.x;
    const dy = y - zone.y;
    return Math.sqrt(dx*dx + dy*dy) <= zone.r;
  }

  return {
    loadZones,
    getDevicePositions,
    setDevicePosition,
    resetDevicePositions,
    pointInZone
  };
})();
=======
// js/models/mapModel.js
// Simulação do mapa: possui zonas de risco definidas em coordenadas relativas (0..1)
// e posições de dispositivos (x,y em 0..1). Não usa API externa.
const MapModel = (function(){
  // sample zones: {id, x, y, radius (0..0.5)}
  const ZONES_KEY = 'sim_zones_v1';
  const DEVICES_POS_KEY = 'sim_devices_pos_v1';

  function defaultZones(){
    return [
      {id:'Z1', name:'Zona A - Escavação', x:0.28, y:0.33, r:0.14},
      {id:'Z2', name:'Zona B - Guindaste', x:0.68, y:0.22, r:0.12},
      {id:'Z3', name:'Zona C - Furação', x:0.55, y:0.68, r:0.16}
    ];
  }

  function loadZones(){
    try {
      const raw = localStorage.getItem(ZONES_KEY);
      if (!raw) {
        const def = defaultZones();
        localStorage.setItem(ZONES_KEY, JSON.stringify(def));
        return def;
      }
      return JSON.parse(raw);
    } catch (e){
      return defaultZones();
    }
  }

  function saveZones(zones){
    localStorage.setItem(ZONES_KEY, JSON.stringify(zones));
  }

  function getDevicePositions(){
    try {
      return JSON.parse(localStorage.getItem(DEVICES_POS_KEY) || '{}');
    } catch(e){ return {}; }
  }

  function setDevicePosition(deviceId, x, y){
    const obj = getDevicePositions();
    obj[deviceId] = {x, y, at: new Date().toISOString()};
    localStorage.setItem(DEVICES_POS_KEY, JSON.stringify(obj));
  }

  function resetDevicePositions(){
    localStorage.removeItem(DEVICES_POS_KEY);
  }

  // helper: check if point in zone (relative coords)
  function pointInZone(x,y,zone){
    const dx = x - zone.x, dy = y - zone.y;
    return Math.sqrt(dx*dx + dy*dy) <= zone.r;
  }

  return { loadZones, saveZones, getDevicePositions, setDevicePosition, resetDevicePositions, pointInZone };
})();
>>>>>>> a5381eaa66b4b6bec5de2fee1078cebd06da2871
