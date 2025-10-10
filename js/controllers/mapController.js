// js/controllers/mapController.js
const MapController = (function(){
    function init(){
        console.log('MapController inicializado');
        
        // Dados de exemplo para demonstração
        if (DevicesModel.all().length === 0){
            DevicesModel.add({id:'D100', type:'worker', active:true});
            DevicesModel.add({id:'D200', type:'worker', active:true});
            DevicesModel.add({id:'S01', type:'sensor', active:true});
        }
        if (PeopleModel.all().length === 0){
            PeopleModel.add({name:'Carlos Silva', role:'Operador', deviceId:'D100'});
            PeopleModel.add({name:'Ana Pereira', role:'Supervisor', deviceId:'D200'});
        }
        
        // Posições de exemplo
        const positions = MapModel.getDevicePositions();
        if (!positions['D100']) MapModel.setDevicePosition('D100', 0.25, 0.35);
        if (!positions['D200']) MapModel.setDevicePosition('D200', 0.7, 0.2);
    }

    return { init };
})();