// js/models/peopleModel.js
<<<<<<< HEAD
const PeopleModel = (function(){
    const STORAGE_KEY = 'safety_people';

    function all(){
        const saved = localStorage.getItem(STORAGE_KEY);
        return saved ? JSON.parse(saved) : [];
    }

    function find(id){
        return all().find(p => p.id === id);
    }

    function findByDevice(deviceId){
        return all().find(p => p.deviceId === deviceId);
    }

    function save(people){
        localStorage.setItem(STORAGE_KEY, JSON.stringify(people));
    }

    function add(personData){
        const people = all();
        const newPerson = {
            id: 'p' + Date.now(),
            name: personData.name,
            role: personData.role,
            deviceId: personData.deviceId || null,
            createdAt: new Date().toISOString()
        };
        people.push(newPerson);
        save(people);
        return newPerson.id;
    }

    function update(id, updates){
        const people = all();
        const index = people.findIndex(p => p.id === id);
        if (index !== -1) {
            people[index] = { ...people[index], ...updates };
            save(people);
            return true;
        }
        return false;
    }

    function remove(id){
        const people = all().filter(p => p.id !== id);
        save(people);
    }

    return { 
        all, 
        find, 
        findByDevice, 
        add, 
        update, 
        remove 
    };
=======
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
>>>>>>> a5381eaa66b4b6bec5de2fee1078cebd06da2871
})();