// js/controllers/devicesController.js
const DevicesController = (function(){
  function init(){ /* nothing for now */ }
  function add(d){ return DevicesModel.add(d); }
  function update(id, patch){ return DevicesModel.update(id, patch); }
  function remove(id){ return DevicesModel.remove(id); }
  return { init, add, update, remove };
})();