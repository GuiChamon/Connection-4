// js/models/areasModel.js
// Centraliza as áreas do canteiro para que front e simulador possam usar a mesma referência (frontend).
const AreasModel = (function(){
    // Retorna um array de áreas com layout profissional do canteiro de obras
    function getAreas(){
        return [
            // LINHA 1 - ENTRADA E ADMINISTRAÇÃO (y: 0.02 - 0.20)
            { id: 'entrada', x: 0.02, y: 0.02, w: 0.12, h: 0.16, name: 'Portaria Principal', color: '#198754', icon: '🚪' },
            { id: 'escritorio', x: 0.16, y: 0.02, w: 0.20, h: 0.16, name: 'Escritório de Obras', color: '#0d6efd', icon: '🏢' },
            { id: 'zona_perigo_1', x: 0.38, y: 0.02, w: 0.22, h: 0.16, name: 'Área de Guindastes', color: '#dc3545', icon: '🏗️' },
            { id: 'almoxarifado', x: 0.62, y: 0.02, w: 0.18, h: 0.16, name: 'Almoxarifado Geral', color: '#6c757d', icon: '📦' },
            { id: 'estacionamento', x: 0.82, y: 0.02, w: 0.16, h: 0.16, name: 'Estacionamento', color: '#495057', icon: '🚗' },
            
            // LINHA 2 - ÁREA PRODUTIVA (y: 0.22 - 0.42)  
            { id: 'area_construcao', x: 0.02, y: 0.22, w: 0.28, h: 0.20, name: 'Construção Principal', color: '#fd7e14', icon: '🏗️' },
            { id: 'zona_perigo_2', x: 0.35, y: 0.22, w: 0.34, h: 0.20, name: 'Área de Soldas', color: '#dc3545', icon: '⚡' },
            { id: 'deposito', x: 0.80, y: 0.22, w: 0.18, h: 0.20, name: 'Depósito Material', color: '#6f42c1', icon: '📋' },
            
            // LINHA 3 - ÁREA SOCIAL E SERVIÇOS (y: 0.46 - 0.66)
            { id: 'betoneira', x: 0.02, y: 0.46, w: 0.22, h: 0.20, name: 'Central de Concreto', color: '#e83e8c', icon: '🚚' },
            { id: 'refeitorio', x: 0.26, y: 0.46, w: 0.26, h: 0.20, name: 'Refeitório', color: '#ffc107', icon: '🍽️' },
        
            // LINHA 4 - APOIO E VESTIÁRIOS (y: 0.70 - 0.88)
            { id: 'vestiario_masc', x: 0.02, y: 0.70, w: 0.18, h: 0.18, name: 'Vestiário Masculino', color: '#0dcaf0', icon: '👔' },
            { id: 'vestiario_fem', x: 0.22, y: 0.70, w: 0.18, h: 0.18, name: 'Vestiário Feminino', color: '#f8d7da', icon: '👗' },
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
