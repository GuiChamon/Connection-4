// js/controllers/mapController.js
const MapController = (function(){
<<<<<<< HEAD
    function init(){
        console.log('MapController inicializado');
    }

    return { init };
=======
  function init(){
    // ensure some sample devices and people exist for demo
    if (DevicesModel.all().length === 0){
      DevicesModel.add({id:'D100', type:'worker', active:true});
      DevicesModel.add({id:'D200', type:'worker', active:true});
      DevicesModel.add({id:'S01', type:'sensor', active:true});
    }
    if (PeopleModel.all().length === 0){
      PeopleModel.add({name:'Carlos Silva', role:'Operador', deviceId:'D100'});
      PeopleModel.add({name:'Ana Pereira', role:'Supervisor', deviceId:'D200'});
    }
    // place sample positions
    const positions = MapModel.getDevicePositions();
    if (!positions['D100']) MapModel.setDevicePosition('D100', 0.25, 0.35);
    if (!positions['D200']) MapModel.setDevicePosition('D200', 0.7, 0.2);
  }
  return { init };
>>>>>>> a5381eaa66b4b6bec5de2fee1078cebd06da2871
})();