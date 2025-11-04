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
                // Sensores FIXOS nas áreas de risco
                await DevicesModel.add({id:'SENSOR_GUINDASTES', type:'sensor', active:true});
                await DevicesModel.add({id:'SENSOR_SOLDAS', type:'sensor', active:true});
                console.log('Dispositivos de exemplo criados incluindo sensores fixos');
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
            
            // SENSORES FIXOS - Posições estratégicas DENTRO das áreas de risco atualizadas
            
            // SENSOR_GUINDASTES na nova Área de Guindastes 
            // Nova área: x: 0.38, y: 0.02, w: 0.22, h: 0.16 (de 0.38 a 0.60 horizontalmente, 0.02 a 0.18 verticalmente)
            // Posição: centro-esquerda da zona para monitorar operação dos guindastes
            await MapModel.setDevicePosition('SENSOR_GUINDASTES', 0.42, 0.08);
            
            // SENSOR_SOLDAS na nova Área de Soldas
            // Nova área: x: 0.32, y: 0.22, w: 0.24, h: 0.20 (de 0.32 a 0.56 horizontalmente, 0.22 a 0.42 verticalmente)  
            // Posição: centro da zona para monitorar atividades de soldas
            await MapModel.setDevicePosition('SENSOR_SOLDAS', 0.44, 0.30);
            
            console.log('🔒 Sensores fixos posicionados nas áreas de risco');
            console.log('MapController inicializado com sucesso');
        } catch (error) {
            console.error('Erro ao inicializar MapController:', error);
        }
    }

    return { init };
})();