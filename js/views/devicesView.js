// js/views/combinedView.js
const CombinedView = (function(){
  const root = document.getElementById('view-root');

  function template(){
    return `
      <div class="col-12">
        <!-- Cabeçalho da Seção -->
        <div class="d-flex justify-content-between align-items-center mb-4">
          <div>
            <h2 class="h4 text-dark mb-1">
              <i class="bi bi-people text-primary me-2"></i>Gestão de Recursos Humanos e Dispositivos
            </h2>
            <p class="text-muted mb-0">Cadastro e gerenciamento integrado de colaboradores e equipamentos de monitoramento</p>
          </div>
          <div class="text-end">
            <span class="badge bg-info fs-6">Sistema Acadêmico</span>
          </div>
        </div>

        <div class="row">
          <!-- Formulários de Cadastro -->
          <div class="col-lg-6 mb-4">
            <div class="card border-0 shadow-sm h-100">
              <div class="card-header bg-dark text-white">
                <h5 class="card-title mb-0">
                  <i class="bi bi-person-plus me-2"></i>Cadastro de Colaboradores
                </h5>
              </div>
              <div class="card-body">
                <form id="person-form">
                  <div class="mb-3">
                    <label for="person-name" class="form-label">Nome Completo</label>
                    <input type="text" class="form-control" id="person-name" placeholder="Digite o nome completo" required>
                  </div>
                  <div class="mb-3">
                    <label for="person-role" class="form-label">Função/Cargo</label>
                    <input type="text" class="form-control" id="person-role" placeholder="Ex: Engenheiro Civil, Mestre de Obras" required>
                  </div>
                  <button type="submit" id="btn-add-person" class="btn btn-primary w-100">
                    <i class="bi bi-check-lg me-1"></i>Cadastrar Colaborador
                  </button>
                </form>
              </div>
            </div>
          </div>

          <div class="col-lg-6 mb-4">
            <div class="card border-0 shadow-sm h-100">
              <div class="card-header bg-dark text-white">
                <h5 class="card-title mb-0">
                  <i class="bi bi-tablet me-2"></i>Cadastro de Dispositivos
                </h5>
              </div>
              <div class="card-body">
                <form id="device-form">
                  <div class="mb-3">
                    <label for="device-id" class="form-label">ID do Dispositivo</label>
                    <input type="text" class="form-control" id="device-id" placeholder="Ex: D001, SENSOR_01" required>
                  </div>
                  <div class="mb-3">
                    <label for="device-type" class="form-label">Tipo de Dispositivo</label>
                    <select class="form-select" id="device-type" required>
                      <option value="worker">Dispositivo de Colaborador</option>
                      <option value="sensor">Sensor de Ambiente</option>
                    </select>
                  </div>
                  <button type="submit" id="btn-add-device" class="btn btn-primary w-100">
                    <i class="bi bi-check-lg me-1"></i>Cadastrar Dispositivo
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>

        <!-- Seção de Vinculação -->
        <div class="card border-0 shadow-sm mb-4">
          <div class="card-header bg-secondary text-white">
            <h5 class="card-title mb-0">
              <i class="bi bi-link-45deg me-2"></i>Vinculação de Dispositivos
            </h5>
          </div>
          <div class="card-body">
            <p class="text-muted mb-3">Associe dispositivos aos colaboradores para habilitar o monitoramento em tempo real</p>
            <div class="row g-3">
              <div class="col-md-5">
                <label class="form-label">Selecionar Colaborador</label>
                <select class="form-select" id="link-person">
                  <option value="">-- Selecione um colaborador --</option>
                </select>
              </div>
              <div class="col-md-5">
                <label class="form-label">Selecionar Dispositivo</label>
                <select class="form-select" id="link-device">
                  <option value="">-- Selecione um dispositivo --</option>
                </select>
              </div>
              <div class="col-md-2 d-flex align-items-end">
                <button id="btn-link" class="btn btn-success w-100">
                  <i class="bi bi-link me-1"></i>Vincular
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Listas de Dados -->
        <div class="row">
          <div class="col-md-6 mb-4">
            <div class="card border-0 shadow-sm h-100">
              <div class="card-header bg-primary text-white">
                <h5 class="card-title mb-0">
                  <i class="bi bi-people-fill me-2"></i>Colaboradores Cadastrados
                  <span class="badge bg-light text-primary ms-2" id="people-count">0</span>
                </h5>
              </div>
              <div class="card-body">
                <div class="list" id="people-list"></div>
              </div>
            </div>
          </div>

          <div class="col-md-6 mb-4">
            <div class="card border-0 shadow-sm h-100">
              <div class="card-header bg-success text-white">
                <h5 class="card-title mb-0">
                  <i class="bi bi-tablet-fill me-2"></i>Dispositivos Cadastrados
                  <span class="badge bg-light text-success ms-2" id="devices-count">0</span>
                </h5>
              </div>
              <div class="card-body">
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
    updateCounters();
    bind();
  }

  function updateCounters(){
    document.getElementById('people-count').textContent = PeopleModel.all().length;
    document.getElementById('devices-count').textContent = DevicesModel.all().length;
  }

  function populateLinkSelects(){
    const personSelect = document.getElementById('link-person');
    const deviceSelect = document.getElementById('link-device');
    
    personSelect.innerHTML = '<option value="">-- Selecione um colaborador --</option>';
    const people = PeopleModel.all();
    people.forEach(p => {
      if (!p.deviceId) { // Mostrar apenas pessoas sem dispositivo
        const opt = document.createElement('option');
        opt.value = p.id;
        opt.textContent = `${p.name} - ${p.role}`;
        personSelect.appendChild(opt);
      }
    });
    
    deviceSelect.innerHTML = '<option value="">-- Selecione um dispositivo --</option>';
    const devices = DevicesModel.all();
    devices.forEach(d => {
      const personWithDevice = people.find(p => p.deviceId === d.id);
      if (!personWithDevice) {
        const opt = document.createElement('option');
        opt.value = d.id;
        opt.textContent = `${d.id} (${d.type === 'worker' ? 'Colaborador' : 'Sensor'})`;
        deviceSelect.appendChild(opt);
      }
    });
  }

  function renderPeopleList(){
    const node = document.getElementById('people-list');
    const people = PeopleModel.all();
    
    if (people.length === 0) { 
      node.innerHTML = `
        <div class="text-center py-4">
          <i class="bi bi-people display-4 text-muted mb-3"></i>
          <p class="text-muted">Nenhum colaborador cadastrado</p>
        </div>
      `; 
      return; 
    }
    
    node.innerHTML = '';
    for (const p of people){
      const card = document.createElement('div');
      card.className = 'card mb-3 border';
      card.innerHTML = `
        <div class="card-body">
          <div class="d-flex align-items-start">
            <div class="bg-primary text-white rounded-circle d-flex align-items-center justify-content-center me-3 flex-shrink-0" style="width: 45px; height: 45px;">
              <i class="bi bi-person-fill"></i>
            </div>
            <div class="flex-grow-1">
              <h6 class="card-title mb-1">${p.name}</h6>
              <p class="card-text small text-muted mb-1">
                <i class="bi bi-briefcase me-1"></i>${p.role}
              </p>
              <div class="d-flex align-items-center">
                <span class="badge ${p.deviceId ? 'bg-success' : 'bg-secondary'} me-2">
                  <i class="bi ${p.deviceId ? 'bi-tablet' : 'bi-tablet'} me-1"></i>
                  ${p.deviceId ? p.deviceId : 'Sem dispositivo'}
                </span>
                <small class="text-muted">ID: ${p.id}</small>
              </div>
            </div>
            <div class="btn-group btn-group-sm">
              <button data-id="${p.id}" class="btn btn-outline-primary btn-edit" title="Editar">
                <i class="bi bi-pencil"></i>
              </button>
              ${p.deviceId ? `
                <button data-id="${p.id}" class="btn btn-outline-warning btn-unlink" title="Desvincular dispositivo">
                  <i class="bi bi-link-45deg"></i>
                </button>
              ` : ''}
              <button data-id="${p.id}" class="btn btn-outline-danger btn-remove" title="Remover">
                <i class="bi bi-trash"></i>
              </button>
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
      node.innerHTML = `
        <div class="text-center py-4">
          <i class="bi bi-tablet display-4 text-muted mb-3"></i>
          <p class="text-muted">Nenhum dispositivo cadastrado</p>
        </div>
      `; 
      return; 
    }
    
    node.innerHTML = '';
    for (const d of devices){
      const person = people.find(p => p.deviceId === d.id);
      const card = document.createElement('div');
      card.className = 'card mb-3 border';
      card.innerHTML = `
        <div class="card-body">
          <div class="d-flex align-items-start">
            <div class="bg-success text-white rounded-circle d-flex align-items-center justify-content-center me-3 flex-shrink-0" style="width: 45px; height: 45px;">
              <i class="bi bi-tablet"></i>
            </div>
            <div class="flex-grow-1">
              <h6 class="card-title mb-1">${d.id}</h6>
              <p class="card-text small text-muted mb-1">
                <span class="badge ${d.type === 'worker' ? 'bg-info' : 'bg-warning'} me-1">
                  ${d.type === 'worker' ? 'Colaborador' : 'Sensor'}
                </span>
                <span class="badge ${d.active ? 'bg-success' : 'bg-secondary'}">
                  <i class="bi ${d.active ? 'bi-check-circle' : 'bi-x-circle'} me-1"></i>
                  ${d.active ? 'Ativo' : 'Inativo'}
                </span>
              </p>
              <p class="card-text small text-muted mb-0">
                <i class="bi bi-person me-1"></i>
                ${person ? `Vinculado a: ${person.name}` : 'Sem vínculo'}
              </p>
            </div>
            <div class="btn-group btn-group-sm">
              <button data-id="${d.id}" class="btn ${d.active ? 'btn-outline-warning' : 'btn-outline-success'} btn-edit" title="${d.active ? 'Desativar' : 'Ativar'}">
                <i class="bi ${d.active ? 'bi-pause' : 'bi-play'}"></i>
              </button>
              <button data-id="${d.id}" class="btn btn-outline-danger btn-remove" title="Remover">
                <i class="bi bi-trash"></i>
              </button>
            </div>
          </div>
        </div>
      `;
      node.appendChild(card);
    }
  }

  function bind(){
    // Prevenir submit dos formulários
    document.getElementById('person-form').addEventListener('submit', (e) => e.preventDefault());
    document.getElementById('device-form').addEventListener('submit', (e) => e.preventDefault());

    // Add person
    document.getElementById('btn-add-person').addEventListener('click', () => {
      const name = document.getElementById('person-name').value.trim();
      const role = document.getElementById('person-role').value.trim();
      
      if (!name) { 
        alert('Nome do colaborador é obrigatório'); 
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
        alert('ID do dispositivo é obrigatório'); 
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
        alert('Selecione um colaborador e um dispositivo para vincular');
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
        if (confirm('Tem certeza que deseja remover este colaborador?')) {
          PeopleController.remove(id);
          render();
        }
      }
      
      if (btn.classList.contains('btn-edit')) {
        const person = PeopleModel.find(id);
        const newName = prompt('Nome do colaborador', person.name);
        if (!newName) return;
        
        const newRole = prompt('Função/Cargo', person.role) || person.role;
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
        if (confirm('Tem certeza que deseja remover este dispositivo?')) {
          const person = PeopleModel.findByDevice(id);
          if (person) {
            alert(`Este dispositivo está vinculado ao colaborador ${person.name}. Desvincule primeiro.`);
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