// js/models/devicesModel.js
// Dispositivos (chips) cadastrados
const DevicesModel = (function(){
  const KEY = 'sim_devices_v1';
  function load(){ try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch(e){ return []; } }
  function save(list){ localStorage.setItem(KEY, JSON.stringify(list)); }
  function all(){ return load(); }
  function add(device){
    const list = load();
    device.id = device.id || ('D' + (Date.now()%100000));
    list.push(device);
    save(list);
    return device;
  }
  function update(id, patch){
    const list = load();
    const idx = list.findIndex(d=>d.id===id);
    if (idx>=0){ list[idx] = {...list[idx], ...patch}; save(list); return list[idx]; }
    return null;
  }
  function remove(id){ let list = load(); list = list.filter(d=>d.id!==id); save(list); }
  return { all, add, update, remove };
})();