// js/models/devicesModel.js
<<<<<<< HEAD
const DevicesModel = (function(){
    const STORAGE_KEY = 'safety_devices';

    function all(){
        const saved = localStorage.getItem(STORAGE_KEY);
        return saved ? JSON.parse(saved) : [];
    }

    function find(id){
        return all().find(d => d.id === id);
    }

    function save(devices){
        localStorage.setItem(STORAGE_KEY, JSON.stringify(devices));
    }

    function add(deviceData){
        const devices = all();
        
        // Verificar se ID já existe
        if (devices.find(d => d.id === deviceData.id)) {
            throw new Error('ID do dispositivo já existe');
        }
        
        const newDevice = {
            id: deviceData.id,
            type: deviceData.type,
            active: true,
            createdAt: new Date().toISOString()
        };
        
        devices.push(newDevice);
        save(devices);
        return newDevice.id;
    }

    function update(id, updates){
        const devices = all();
        const index = devices.findIndex(d => d.id === id);
        if (index !== -1) {
            devices[index] = { ...devices[index], ...updates };
            save(devices);
            return true;
        }
        return false;
    }

    function remove(id){
        const devices = all().filter(d => d.id !== id);
        save(devices);
    }

    return { 
        all, 
        find, 
        add, 
        update, 
        remove 
    };
=======
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
>>>>>>> a5381eaa66b4b6bec5de2fee1078cebd06da2871
})();