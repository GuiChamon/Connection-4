// js/controllers/devicesController.js - VERSÃO ASSÍNCRONA
const DevicesController = (function(){
    function init(){
        console.log('DevicesController inicializado');
    }

    async function add(deviceData){
        try {
            if (!deviceData.id || deviceData.id.trim() === '') {
                throw new Error('ID do dispositivo é obrigatório');
            }
            
            const id = await DevicesModel.add({
                id: deviceData.id.trim().toUpperCase(),
                type: deviceData.type || 'worker',
                active: true
            });
            
            console.log('Dispositivo adicionado:', id);
            return { success: true, id: id };
        } catch (error) {
            console.error('Erro ao adicionar dispositivo:', error);
            return { success: false, error: error.message };
        }
    }

    async function update(id, updates){
        try {
            const success = await DevicesModel.update(id, updates);
            return { success: success };
        } catch (error) {
            console.error('Erro ao atualizar dispositivo:', error);
            return { success: false, error: error.message };
        }
    }

    async function remove(id){
        try {
            // Verificar se o dispositivo está vinculado a alguém
            const person = await PeopleModel.findByDevice(id);
            if (person) {
                throw new Error(`Dispositivo está vinculado a ${person.name}. Desvincule primeiro.`);
            }
            
            await DevicesModel.remove(id);
            return { success: true };
        } catch (error) {
            console.error('Erro ao remover dispositivo:', error);
            return { success: false, error: error.message };
        }
    }

    async function getAll(){
        try {
            console.log('🔍 [DevicesController.getAll] Buscando devices do backend...');
            const devices = await DevicesModel.all();
            console.log('📦 [DevicesController.getAll] Retornado:', devices);
            return devices;
        } catch (error) {
            console.error('❌ [DevicesController.getAll] Erro ao buscar dispositivos:', error);
            return [];
        }
    }

    return { 
        init, 
        add, 
        update, 
        remove, 
        getAll 
    };
})();