// js/controllers/peopleController.js
const PeopleController = (function(){
    function init(){
        console.log('PeopleController inicializado');
    }

    function add(personData){
        try {
            if (!personData.name || personData.name.trim() === '') {
                throw new Error('Nome é obrigatório');
            }
            
            const id = PeopleModel.add({
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

    function update(id, updates){
        try {
            const success = PeopleModel.update(id, updates);
            return { success: success };
        } catch (error) {
            console.error('Erro ao atualizar pessoa:', error);
            return { success: false, error: error.message };
        }
    }

    function remove(id){
        try {
            PeopleModel.remove(id);
            return { success: true };
        } catch (error) {
            console.error('Erro ao remover pessoa:', error);
            return { success: false, error: error.message };
        }
    }

    function getAll(){
        return PeopleModel.all();
    }

    return { 
        init, 
        add, 
        update, 
        remove, 
        getAll 
    };
})();