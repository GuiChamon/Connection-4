// js/views/combinedView.js
const CombinedView = (function(){
  const root = document.getElementById('view-root');

  function template(){
    return `
      <div class="col-12">
        <div class="card shadow-sm border-0">
          <div class="card-header bg-white py-3">
            <h4 class="card-title mb-0">👥 Cadastro de Pessoas e Dispositivos</h4>
            <p class="text-muted mb-0 small">Cadastre pessoas e dispositivos em um único local</p>
          </div>
          <div class="card-body">
            
            <!-- Cadastro de Pessoa -->
            <div class="mb-5">
              <h5 class="text-primary mb-3">➕ Cadastrar Pessoa</h5>
              <div class="row g-3">
                <div class="col-md-5">
                  <input type="text" class="form-control" id="person-name" placeholder="Nome completo">
                </div>
                <div class="col-md-4">
                  <input type="text" class="form-control" id="person-role" placeholder="Função">
                </div>
                <div class="col-md-3">
                  <button id="btn-add-person" class="btn btn-primary w-100">Adicionar Pessoa</button>
                </div>
              </div>
            </div>

            <hr>

            <!-- Cadastro de Dispositivo -->
            <div class="mb-5">
              <h5 class="text-primary mb-3">📱 Cadastrar Dispositivo</h5>
              <div class="row g-3">
                <div class="col-md-5">
                  <input type="text" class="form-control" id="device-id" placeholder="ID do dispositivo (ex: D123)">
                </div>
                <div class="col-md-4">
                  <select class="form-select" id="device-type">
                    <option value="worker">👷 Worker</option>
                    <option value="sensor">📊 Sensor</option>
                  </select>
                </div>
                <div class="col-md-3">
                  <button id="btn-add-device" class="btn btn-primary w-100">Adicionar Dispositivo</button>
                </div>
              </div>
            </div>

            <hr>

            <!-- Vincular Pessoa a Dispositivo -->
            <div class="mb-4">
              <h5 class="text-primary mb-3">🔗 Vincular Pessoa a Dispositivo</h5>
              <div class="row g-3">
                <div class="col-md-5">
                  <select class="form-select" id="link-person">
                    <option value="">-- Selecione uma pessoa --</option>
                  </select>
                </div>
                <div class="col-md-5">
                  <select class="form-select" id="link-device">
                    <option value="">-- Selecione um dispositivo --</option>
                  </select>
                </div>
                <div class="col-md-2">
                  <button id="btn-link" class="btn btn-success w-100">Vincular</button>
                </div>
              </div>
            </div>

            <hr>

            <!-- Listas -->
            <div class="row">
              <div class="col-md-6">
                <h5 class="text-primary mb-3">👤 Pessoas Cadastradas</h5>
                <div class="list" id="people-list"></div>
              </div>
              <div class="col-md-6">
                <h5 class="text-primary mb-3">📱 Dispositivos Cadastrados</h5>
                <div class="list" id="devices-list"></div>
              </div>
            </div>

          </div>
        </div>
      </div>
    `;
  }

  function render(){
    root.innerHTML = template();
    renderPeopleList();
    renderDevicesList();
    populateLinkSelects();
    bind();
  }

  function populateLinkSelects(){
    const personSelect = document.getElementById('link-person');
    const deviceSelect = document.getElementById('link-device');
    
    personSelect.innerHTML = '<option value="">-- Selecione uma pessoa --</option>';
    const people = PeopleModel.all();
    people.forEach(p => {
      const opt = document.createElement('option');
      opt.value = p.id;
      opt.textContent = `${p.name} (${p.role})`;
      personSelect.appendChild(opt);
    });
    
    deviceSelect.innerHTML = '<option value="">-- Selecione um dispositivo --</option>';
    const devices = DevicesModel.all();
    devices.forEach(d => {
      const personWithDevice = people.find(p => p.deviceId === d.id);
      if (!personWithDevice) {
        const opt = document.createElement('option');
        opt.value = d.id;
        opt.textContent = `${d.id} (${d.type})`;
        deviceSelect.appendChild(opt);
      }
    });
  }

  function renderPeopleList(){
    const node = document.getElementById('people-list');
    const people = PeopleModel.all();
    
    if (people.length === 0) { 
      node.innerHTML = '<div class="alert alert-info">Nenhuma pessoa cadastrada.</div>'; 
      return; 
    }
    
    node.innerHTML = '';
    for (const p of people){
      const card = document.createElement('div');
      card.className = 'card mb-3';
      card.innerHTML = `
        <div class="card-body">
          <div class="d-flex align-items-center">
            <div class="bg-primary text-white rounded-circle d-flex align-items-center justify-content-center me-3" style="width: 40px; height: 40px;">
              ${p.name.split(' ').map(s => s[0]).slice(0, 2).join('')}
            </div>
            <div class="flex-grow-1">
              <h6 class="card-title mb-1">${p.name}</h6>
              <p class="card-text small text-muted mb-1">${p.role}</p>
              <p class="card-text small mb-0">
                <span class="badge ${p.deviceId ? 'bg-success' : 'bg-secondary'}">
                  ${p.deviceId ? `Device: ${p.deviceId}` : 'Sem dispositivo'}
                </span>
              </p>
            </div>
            <div class="btn-group">
              <button data-id="${p.id}" class="btn btn-outline-primary btn-sm btn-edit">Editar</button>
              ${p.deviceId ? `<button data-id="${p.id}" class="btn btn-outline-warning btn-sm btn-unlink">Desvincular</button>` : ''}
              <button data-id="${p.id}" class="btn btn-outline-danger btn-sm btn-remove">Remover</button>
            </div>
          </div>
        </div>
      `;
      node.appendChild(card);
    }
  }

  function renderDevicesList(){
    const node = document.getElementById('devices-list');
    const devices = DevicesModel.all();
    const people = PeopleModel.all();
    
    if (devices.length === 0) { 
      node.innerHTML = '<div class="alert alert-info">Nenhum dispositivo cadastrado.</div>'; 
      return; 
    }
    
    node.innerHTML = '';
    for (const d of devices){
      const person = people.find(p => p.deviceId === d.id);
      const card = document.createElement('div');
      card.className = 'card mb-3';
      card.innerHTML = `
        <div class="card-body">
          <div class="d-flex justify-content-between align-items-center">
            <div>
              <h6 class="card-title mb-1">${d.id}</h6>
              <p class="card-text small text-muted mb-1">
                <span class="badge ${d.type === 'worker' ? 'bg-info' : 'bg-warning'}">${d.type}</span>
                <span class="badge ${d.active ? 'bg-success' : 'bg-secondary'} ms-1">${d.active ? 'Ativo' : 'Inativo'}</span>
              </p>
              <p class="card-text small text-muted mb-0">
                ${person ? `Vinculado a: ${person.name}` : 'Sem vínculo'}
              </p>
            </div>
            <div class="btn-group">
              <button data-id="${d.id}" class="btn btn-outline-primary btn-sm btn-edit">${d.active ? 'Desativar' : 'Ativar'}</button>
              <button data-id="${d.id}" class="btn btn-outline-danger btn-sm btn-remove">Remover</button>
            </div>
          </div>
        </div>
      `;
      node.appendChild(card);
    }
  }

  function bind(){
    // Add person
    document.getElementById('btn-add-person').addEventListener('click', () => {
      const name = document.getElementById('person-name').value.trim();
      const role = document.getElementById('person-role').value.trim();
      
      if (!name) { 
        alert('Nome obrigatório'); 
        return; 
      }
      
      PeopleController.add({ name, role, deviceId: null });
      document.getElementById('person-name').value = '';
      document.getElementById('person-role').value = '';
      render();
    });

    // Add device
    document.getElementById('btn-add-device').addEventListener('click', () => {
      const id = document.getElementById('device-id').value.trim();
      const type = document.getElementById('device-type').value;
      
      if (!id) { 
        alert('ID obrigatório'); 
        return; 
      }
      
      DevicesController.add({ id, type, active: true });
      document.getElementById('device-id').value = '';
      render();
    });

    // Link person to device
    document.getElementById('btn-link').addEventListener('click', () => {
      const personId = document.getElementById('link-person').value;
      const deviceId = document.getElementById('link-device').value;
      
      if (!personId || !deviceId) {
        alert('Selecione uma pessoa e um dispositivo para vincular');
        return;
      }
      
      const person = PeopleModel.find(personId);
      if (person) {
        PeopleController.update(personId, { ...person, deviceId });
        render();
      }
    });

    // People list actions
    document.getElementById('people-list').addEventListener('click', (e) => {
      const btn = e.target.closest('button');
      if (!btn) return;
      
      const id = btn.getAttribute('data-id');
      
      if (btn.classList.contains('btn-remove')) {
        if (confirm('Remover pessoa?')) {
          PeopleController.remove(id);
          render();
        }
      }
      
      if (btn.classList.contains('btn-edit')) {
        const person = PeopleModel.find(id);
        const newName = prompt('Nome', person.name);
        if (!newName) return;
        
        const newRole = prompt('Função', person.role) || person.role;
        PeopleController.update(id, { name: newName, role: newRole });
        render();
      }
      
      if (btn.classList.contains('btn-unlink')) {
        const person = PeopleModel.find(id);
        if (person && confirm(`Desvincular dispositivo ${person.deviceId} de ${person.name}?`)) {
          PeopleController.update(id, { ...person, deviceId: null });
          render();
        }
      }
    });

    // Devices list actions
    document.getElementById('devices-list').addEventListener('click', (e) => {
      const btn = e.target.closest('button');
      if (!btn) return;
      
      const id = btn.getAttribute('data-id');
      
      if (btn.classList.contains('btn-remove')) {
        if (confirm('Remover dispositivo?')) {
          const person = PeopleModel.findByDevice(id);
          if (person) {
            alert(`Este dispositivo está vinculado a ${person.name}. Desvincule primeiro.`);
            return;
          }
          DevicesController.remove(id);
          render();
        }
      }
      
      if (btn.classList.contains('btn-edit')) {
        const device = DevicesModel.find(id);
        const newAct = !device.active;
        DevicesController.update(id, { active: newAct });
        render();
      }
    });
  }

  return { render };
})();