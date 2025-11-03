// js/controllers/mapController.js - VERSÃO COM API REST
const MapController = (function(){
    async function init(){
        console.log('MapController inicializado com API REST');
        
        try {
            // Verificar se existem dispositivos, se não criar dados de exemplo
            const devices = await DevicesModel.all();
            if (devices.length === 0){
                await DevicesModel.add({id:'D100', type:'worker', active:true});
                await DevicesModel.add({id:'D200', type:'worker', active:true});
                await DevicesModel.add({id:'S01', type:'sensor', active:true});
                console.log('Dispositivos de exemplo criados');
            }
            
            // Verificar se existem pessoas, se não criar dados de exemplo
            const people = await PeopleModel.all();
            if (people.length === 0){
                await PeopleModel.add({name:'Carlos Silva', role:'Operador', deviceId:'D100'});
                await PeopleModel.add({name:'Ana Pereira', role:'Supervisor', deviceId:'D200'});
                console.log('Pessoas de exemplo criadas');
            }
            
            // Definir posições iniciais se não existirem
            const positions = await MapModel.getDevicePositions();
            if (!positions['D100']) {
                await MapModel.setDevicePosition('D100', 0.25, 0.35);
            }
            if (!positions['D200']) {
                await MapModel.setDevicePosition('D200', 0.7, 0.2);
            }
            
            console.log('MapController inicializado com sucesso');
        } catch (error) {
            console.error('Erro ao inicializar MapController:', error);
        }
    }

    return { init };
})();