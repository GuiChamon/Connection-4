// js/models/peopleModel.js
// Pessoas e vínculo com dispositivos. Persistência em localStorage.
const PeopleModel = (function(){
  const KEY = 'sim_people_v1';
  function load(){
    try { return JSON.parse(localStorage.getItem(KEY) || '[]'); }
    catch(e){ return []; }
  }
  function save(list){ localStorage.setItem(KEY, JSON.stringify(list)); }
  function all(){ return load(); }
  function add(person){
    const list = load();
    person.id = 'P' + (Date.now()%100000);
    list.push(person);
    save(list);
    return person;
  }
  function update(id, patch){
    const list = load();
    const idx = list.findIndex(p=>p.id===id);
    if (idx>=0){ list[idx] = {...list[idx], ...patch}; save(list); return list[idx]; }
    return null;
  }
  function remove(id){
    let list = load();
    list = list.filter(p=>p.id!==id);
    save(list);
  }
  function findByDevice(deviceId){
    return load().find(p=>p.deviceId === deviceId);
  }
  return { all, add, update, remove, findByDevice };
})();