// js/controllers/peopleController.js - VERSÃO ASSÍNCRONA
const PeopleController = (function(){
    function init(){
        console.log('PeopleController inicializado');
    }

    async function add(personData){
        try {
            if (!personData.name || personData.name.trim() === '') {
                throw new Error('Nome é obrigatório');
            }
            
            const id = await PeopleModel.add({
                name: personData.name.trim(),
                role: personData.role || 'Não informado',
                deviceId: personData.deviceId || null
            });
            
            console.log('Pessoa adicionada:', id);
            return { success: true, id: id };
        } catch (error) {
            console.error('Erro ao adicionar pessoa:', error);
            return { success: false, error: error.message };
        }
    }

    async function update(id, updates){
        try {
            const success = await PeopleModel.update(id, updates);
            return { success: success };
        } catch (error) {
            console.error('Erro ao atualizar pessoa:', error);
            return { success: false, error: error.message };
        }
    }

    async function remove(id){
        try {
            await PeopleModel.remove(id);
            return { success: true };
        } catch (error) {
            console.error('Erro ao remover pessoa:', error);
            return { success: false, error: error.message };
        }
    }

    async function getAll(){
        return await PeopleModel.all();
    }

    return { 
        init, 
        add, 
        update, 
        remove, 
        getAll 
    };
})();