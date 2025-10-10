// js/controllers/devicesController.js
const DevicesController = (function(){
    function init(){
        console.log('DevicesController inicializado');
    }

    function add(deviceData){
        try {
            if (!deviceData.id || deviceData.id.trim() === '') {
                throw new Error('ID do dispositivo é obrigatório');
            }
            
            const id = DevicesModel.add({
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

    function update(id, updates){
        try {
            const success = DevicesModel.update(id, updates);
            return { success: success };
        } catch (error) {
            console.error('Erro ao atualizar dispositivo:', error);
            return { success: false, error: error.message };
        }
    }

    function remove(id){
        try {
            // Verificar se o dispositivo está vinculado a alguém
            const person = PeopleModel.findByDevice(id);
            if (person) {
                throw new Error(`Dispositivo está vinculado a ${person.name}. Desvincule primeiro.`);
            }
            
            DevicesModel.remove(id);
            return { success: true };
        } catch (error) {
            console.error('Erro ao remover dispositivo:', error);
            return { success: false, error: error.message };
        }
    }

    function getAll(){
        return DevicesModel.all();
    }

    return { 
        init, 
        add, 
        update, 
        remove, 
        getAll 
    };
})();