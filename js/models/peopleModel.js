// js/models/peopleModel.js
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
})();