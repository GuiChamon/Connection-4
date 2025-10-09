// js/controllers/peopleController.js
const PeopleController = (function(){
  function init(){ /* nothing for now */ }
  function add(p){ return PeopleModel.add(p); }
  function update(id, patch){ return PeopleModel.update(id, patch); }
  function remove(id){ return PeopleModel.remove(id); }
  return { init, add, update, remove };
})();