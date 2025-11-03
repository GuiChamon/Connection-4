// js/models/areasModel.js
// Centraliza as áreas do canteiro para que front e simulador possam usar a mesma referência (frontend).
const AreasModel = (function(){
    // Retorna um array de áreas com chave (id), coordenadas relativas e estilos
    function getAreas(){
        return [
            { id: 'entrada', x: 0.06, y: 0.08, w: 0.16, h: 0.10, name: 'Portaria/Entrada', color: '#28a745', icon: '🚪' },
            { id: 'escritorio', x: 0.20, y: 0.12, w: 0.22, h: 0.14, name: 'Escritório de Obras', color: '#17a2b8', icon: '🏢' },
            { id: 'almoxarifado', x: 0.80, y: 0.08, w: 0.14, h: 0.12, name: 'Almoxarifado', color: '#6c757d', icon: '📦' },
            { id: 'area_construcao', x: 0.45, y: 0.34, w: 0.28, h: 0.22, name: 'Área de Construção Principal', color: '#fd7e14', icon: '🏗️' },
            { id: 'betoneira', x: 0.25, y: 0.52, w: 0.16, h: 0.14, name: 'Central de Concreto', color: '#6f42c1', icon: '🚚' },
            { id: 'oficina', x: 0.72, y: 0.54, w: 0.22, h: 0.16, name: 'Oficina de Manutenção', color: '#20c997', icon: '🔧' },
            { id: 'refeitorio', x: 0.06, y: 0.72, w: 0.24, h: 0.16, name: 'Refeitório', color: '#ffc107', icon: '🍽️' },
            { id: 'vestiario', x: 0.16, y: 0.84, w: 0.16, h: 0.10, name: 'Vestiário', color: '#e83e8c', icon: '👔' },
            { id: 'zona_perigo_1', x: 0.36, y: 0.16, w: 0.18, h: 0.16, name: 'Zona de Risco - Guindastes', color: '#dc3545', icon: '⚠️' },
            { id: 'zona_perigo_2', x: 0.64, y: 0.32, w: 0.18, h: 0.18, name: 'Zona de Risco - Soldas', color: '#dc3545', icon: '⚠️' }
        ];
    }

    function getAreaById(id){
        return getAreas().find(a => a.id === id) || null;
    }

    return {
        getAreas,
        getAreaById
    };
})();
