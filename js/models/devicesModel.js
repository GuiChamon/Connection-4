// js/models/devicesModel.js
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
})();