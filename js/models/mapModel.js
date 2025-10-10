// js/models/mapModel.js
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