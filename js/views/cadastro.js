// js/views/cadastro.js - VERSÃO FINAL CORRIGIDA
const CombinedView = (function(){
    const root = document.getElementById('view-root');
    let refreshInterval = null; // Controla o intervalo de atualização automática

    function template(){
        return `
        <div class="col-12">
            <!-- Cabeçalho da Seção -->
            <div class="d-flex justify-content-between align-items-center mb-4">
                <div>
                    <h2 class="h4 text-dark mb-1">
                        <i class="bi bi-person-gear text-primary me-2"></i>Gestão de Recursos Humanos e Dispositivos
                    </h2>
                    <p class="text-muted mb-0">Cadastro e gerenciamento integrado de colaboradores e equipamentos de monitoramento</p>
                </div>
                <div class="text-end">
                    <span class="badge bg-primary fs-6">Sistema Acadêmico</span>
                </div>
            </div>

            <div class="row">
                <!-- Formulários de Cadastro -->
                <div class="col-lg-6 mb-4">
                    <div class="card border-0 shadow-sm h-100">
                        <div class="card-header">
                            <h5 class="card-title mb-0 text-white">
                                <i class="bi bi-person-plus me-2"></i>Cadastro de Colaboradores
                            </h5>
                        </div>
                        <div class="card-body">
                            <form id="person-form">
                                <div class="mb-3">
                                    <label for="person-name" class="form-label">Nome Completo *</label>
                                    <input type="text" class="form-control" id="person-name" placeholder="Digite o nome completo" required>
                                </div>
                                <div class="mb-3">
                                    <label for="person-role" class="form-label">Função/Cargo *</label>
                                    <input type="text" class="form-control" id="person-role" placeholder="Ex: Engenheiro Civil, Mestre de Obras" required>
                                </div>
                                <div class="mb-3">
                                    <label for="person-access-level" class="form-label">Nível de Acesso *</label>
                                    <select class="form-select" id="person-access-level" required>
                                        <option value="1" selected>Nível 1 - Portaria e áreas comuns</option>
                                        <option value="2">Nível 2 - Áreas comuns + Risco 1</option>
                                        <option value="3">Nível 3 - Todas as áreas</option>
                                    </select>
                                    <small class="text-muted">Defina quais zonas RFID este colaborador pode acessar</small>
                                </div>
                                <button type="submit" class="btn btn-primary w-100">
                                    <i class="bi bi-check-lg me-1"></i>Cadastrar Colaborador
                                </button>
                            </form>
                        </div>
                    </div>
                </div>

                <div class="col-lg-6 mb-4">
                    <div class="card border-0 shadow-sm h-100">
                        <div class="card-header">
                            <h5 class="card-title mb-0 text-white">
                                <i class="bi bi-tablet me-2"></i>Cadastro de Dispositivos
                            </h5>
                        </div>
                        <div class="card-body">
                            <form id="device-form">
                                <div class="mb-3">
                                    <label for="device-id" class="form-label">ID do Dispositivo *</label>
                                    <input type="text" class="form-control" id="device-id" placeholder="Ex: D001, SENSOR_01" required>
                                    <div class="form-text">Use letras e números (ex: D001, SENSOR_01)</div>
                                </div>
                                <div class="mb-3">
                                    <label for="device-type" class="form-label">Tipo de Dispositivo *</label>
                                    <select class="form-select" id="device-type" required>
                                        <option value="worker">Dispositivo de Colaborador</option>
                                        <option value="sensor">Sensor de Ambiente</option>
                                    </select>
                                </div>
                                <button type="submit" class="btn btn-primary w-100">
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
                        <div class="card-header">
                            <h5 class="card-title mb-0 text-white">
                                <i class="bi bi-people-fill me-2"></i>Colaboradores Cadastrados
                                <span class="badge bg-light text-primary ms-2" id="people-count">0</span>
                            </h5>
                        </div>
                        <div class="card-body">
                            <div id="people-list">
                                <!-- Lista será preenchida dinamicamente -->
                            </div>
                        </div>
                    </div>
                </div>

                <div class="col-md-6 mb-4">
                    <div class="card border-0 shadow-sm h-100">
                        <div class="card-header">
                            <h5 class="card-title mb-0 text-white">
                                <i class="bi bi-tablet-fill me-2"></i>Dispositivos Cadastrados
                                <span class="badge bg-light text-primary ms-2" id="devices-count">0</span>
                            </h5>
                        </div>
                        <div class="card-body">
                            <div id="devices-list">
                                <!-- Lista será preenchida dinamicamente -->
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        `;
    }

    async function renderPeopleList(){
        const node = document.getElementById('people-list');
        const people = await PeopleController.getAll();
        
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
        for (const person of people){
            const card = document.createElement('div');
            card.className = 'card mb-3 border';
            card.innerHTML = `
                <div class="card-body">
                    <div class="d-flex align-items-start">
                        <div class="bg-primary text-white rounded-circle d-flex align-items-center justify-content-center me-3 flex-shrink-0" style="width: 45px; height: 45px;">
                            ${person.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                        </div>
                        <div class="flex-grow-1">
                            <h6 class="card-title mb-1">${person.name}</h6>
                            <p class="card-text small text-muted mb-1">
                                <i class="bi bi-briefcase me-1"></i>${person.role}
                                <span class="badge bg-dark ms-2">Nível ${person.accessLevel || 1}</span>
                            </p>
                            <div class="d-flex align-items-center">
                                <span class="badge ${person.deviceId ? 'bg-success' : 'bg-secondary'} me-2">
                                    <i class="bi ${person.deviceId ? 'bi-tablet' : 'bi-tablet'} me-1"></i>
                                    ${person.deviceId ? person.deviceId : 'Sem dispositivo'}
                                </span>
                                <small class="text-muted">ID: ${person.id}</small>
                            </div>
                        </div>
                        <div class="btn-group btn-group-sm">
                            ${person.deviceId ? `
                                <button data-id="${person.id}" class="btn btn-outline-warning btn-unlink" title="Desvincular dispositivo">
                                    <i class="bi bi-link-45deg"></i>
                                </button>
                            ` : ''}
                            <button data-id="${person.id}" class="btn btn-outline-danger btn-remove-person" title="Remover">
                                <i class="bi bi-trash"></i>
                            </button>
                        </div>
                    </div>
                </div>
            `;
            node.appendChild(card);
        }
    }

    async function renderDevicesList(){
        console.log('🔄 [renderDevicesList] Iniciando...');
        const node = document.getElementById('devices-list');
        const devices = await DevicesController.getAll();
        const people = await PeopleController.getAll();
        
        console.log('📦 [renderDevicesList] Devices:', devices.map(d => ({id: d.id, active: d.active, connectionStatus: d.connectionStatus})));
        
        // ✅ BUSCAR ZONAS PARA VERIFICAR currentlyActive
        const zonesResponse = await fetch('http://localhost:3000/api/zones', {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        const zonesData = await zonesResponse.json();
        const zones = zonesData.success ? zonesData.data : [];
        
        console.log('🗺️ [renderDevicesList] Zones:', zones.map(z => ({id: z.id, name: z.name, deviceId: z.deviceId, currentlyActive: z.currentlyActive, connectionStatus: z.connectionStatus})));
        
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
        for (const device of devices){
            const person = people.find(p => p.deviceId === device.id);
            
            // ✅ VERIFICAR SE A ÁREA DESTE DISPOSITIVO ESTÁ currentlyActive
            const deviceZone = zones.find(z => z.deviceId && z.deviceId.toLowerCase() === device.id.toLowerCase());
            // Primeiro respeitar o flag device.active: se false => considerado offline/desativado
            const isPhysicallyActive = device.active === true;
            const zoneOnline = deviceZone ? (deviceZone.currentlyActive === true && deviceZone.connectionStatus === 'online') : false;
            const isOnline = isPhysicallyActive && zoneOnline;

            const statusIcon = isOnline ? 'bi-circle-fill' : 'bi-circle';
            const statusColor = isOnline ? 'bg-success' : (isPhysicallyActive ? 'bg-secondary' : 'bg-dark');
            const statusText = !isPhysicallyActive ? 'DESATIVADO' : (isOnline ? 'ONLINE' : 'Offline');

            console.log(`📱 [renderDevicesList] Device ${device.id}:`, {
                'device.active': device.active,
                'isPhysicallyActive': isPhysicallyActive,
                'deviceZone': deviceZone?.name,
                'zone.currentlyActive': deviceZone?.currentlyActive,
                'zone.connectionStatus': deviceZone?.connectionStatus,
                'zoneOnline': zoneOnline,
                'isOnline': isOnline,
                'statusText': statusText
            });
            
            const card = document.createElement('div');
            card.className = 'card mb-3 border';
            card.innerHTML = `
                <div class="card-body">
                    <div class="d-flex align-items-start">
                        <div class="${isOnline ? 'bg-success' : 'bg-secondary'} text-white rounded-circle d-flex align-items-center justify-content-center me-3 flex-shrink-0" style="width: 45px; height: 45px;">
                            <i class="bi bi-tablet"></i>
                        </div>
                        <div class="flex-grow-1">
                            <h6 class="card-title mb-1">
                                ${device.id}
                                <span class="badge ${statusColor} ms-2">
                                    <i class="bi ${statusIcon} me-1"></i>${statusText}
                                </span>
                            </h6>
                            <p class="card-text small text-muted mb-1">
                                <span class="badge ${device.type === 'worker' ? 'bg-info' : 'bg-warning'} me-1">
                                    ${device.type === 'worker' ? 'Colaborador' : 'Sensor'}
                                </span>
                                ${deviceZone ? `<span class="badge bg-primary">Área: ${deviceZone.name}</span>` : ''}
                            </p>
                            <p class="card-text small text-muted mb-0">
                                <i class="bi bi-person me-1"></i>
                                ${person ? `Vinculado a: ${person.name}` : 'Sem vínculo'}
                            </p>
                        </div>
                        <div class="btn-group btn-group-sm">
                            <button data-id="${device.id}" class="btn ${device.active ? 'btn-outline-warning' : 'btn-outline-success'} btn-toggle-device" title="${device.active ? 'Desativar' : 'Ativar'}">
                                <i class="bi ${device.active ? 'bi-pause' : 'bi-play'}"></i>
                            </button>
                            <button data-id="${device.id}" class="btn btn-outline-danger btn-remove-device" title="Remover">
                                <i class="bi bi-trash"></i>
                            </button>
                        </div>
                    </div>
                </div>
            `;
            node.appendChild(card);
        }
    }

    async function populateLinkSelects(){
        const personSelect = document.getElementById('link-person');
        const deviceSelect = document.getElementById('link-device');
        
        const people = await PeopleController.getAll();
        const devices = await DevicesController.getAll();
        
        // Pessoas sem dispositivo
        personSelect.innerHTML = '<option value="">-- Selecione um colaborador --</option>';
        people.forEach(person => {
            if (!person.deviceId) {
                const opt = document.createElement('option');
                opt.value = person.id;
                opt.textContent = `${person.name} - ${person.role}`;
                personSelect.appendChild(opt);
            }
        });
        
        // Dispositivos sem vínculo
        deviceSelect.innerHTML = '<option value="">-- Selecione um dispositivo --</option>';
        devices.forEach(device => {
            const personWithDevice = people.find(p => p.deviceId === device.id);
            if (!personWithDevice && device.active) {
                const opt = document.createElement('option');
                opt.value = device.id;
                opt.textContent = `${device.id} (${device.type === 'worker' ? 'Colaborador' : 'Sensor'})`;
                deviceSelect.appendChild(opt);
            }
        });
    }

    async function updateCounters(){
        const people = await PeopleController.getAll();
        const devices = await DevicesController.getAll();
        
        document.getElementById('people-count').textContent = people.length;
        document.getElementById('devices-count').textContent = devices.length;
    }

    function showAlert(message, type = 'success') {
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
        alertDiv.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        
        // Insere no início do conteúdo principal
        const main = document.querySelector('main');
        main.insertBefore(alertDiv, main.firstChild);
        console.log('🔍 [cadastro] devices fetched:', devices);
        console.log('🔍 [cadastro] zones fetched:', zones.map(z=>({id:z.id,name:z.name,currentlyActive:z.currentlyActive,connectionStatus:z.connectionStatus})));
        
        // Remove automaticamente após 5 segundos
        setTimeout(() => {
            if (alertDiv.parentNode) {
                alertDiv.remove();
            }
        }, 5000);
    }

    function bindEvents(){
        // Cadastrar pessoa
        document.getElementById('person-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = document.getElementById('person-name').value.trim();
            const role = document.getElementById('person-role').value.trim();
            const accessLevel = Number(document.getElementById('person-access-level').value) || 1;
            
            const result = await PeopleController.add({ name, role, accessLevel });
            if (result.success) {
                showAlert('Colaborador cadastrado com sucesso!');
                document.getElementById('person-form').reset();
                document.getElementById('person-access-level').value = '1';
                await render(); // Recarrega a view
            console.log(`📱 [cadastro] Device ${device.id}: full=`, device, 'deviceZone=', deviceZone, 'isPhysicallyActive=', isPhysicallyActive, 'zoneOnline=', zoneOnline, 'isOnline=', isOnline);
                showAlert(`Erro: ${result.error}`, 'danger');
            }
        });

        // Cadastrar dispositivo
        document.getElementById('device-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const id = document.getElementById('device-id').value.trim().toUpperCase();
            const type = document.getElementById('device-type').value;
            
            const result = await DevicesController.add({ id, type });
            if (result.success) {
                showAlert('Dispositivo cadastrado com sucesso!');
                document.getElementById('device-form').reset();
                await render(); // Recarrega a view
            } else {
                showAlert(`Erro: ${result.error}`, 'danger');
            }
        });

        // Vincular dispositivo
        document.getElementById('btn-link').addEventListener('click', async () => {
            const personId = document.getElementById('link-person').value;
            const deviceId = document.getElementById('link-device').value;
            
            if (!personId || !deviceId) {
                showAlert('Selecione um colaborador e um dispositivo para vincular', 'warning');
                return;
            }
            
            const person = await PeopleModel.find(personId);
            if (person) {
                const result = await PeopleController.update(personId, { deviceId: deviceId });
                if (result.success) {
                    showAlert('Dispositivo vinculado com sucesso!');
                    await render(); // Recarrega a view
                } else {
                    showAlert(`Erro: ${result.error}`, 'danger');
                }
            }
        });

        // Remover pessoa
        document.getElementById('people-list').addEventListener('click', async (e) => {
            if (e.target.closest('.btn-remove-person')) {
                const btn = e.target.closest('.btn-remove-person');
                const id = btn.getAttribute('data-id');
                const person = await PeopleModel.find(id);
                
                if (confirm(`Tem certeza que deseja remover ${person.name}?`)) {
                    const result = await PeopleController.remove(id);
                    if (result.success) {
                        showAlert('Colaborador removido com sucesso!');
                        await render();
                    } else {
                        showAlert(`Erro: ${result.error}`, 'danger');
                    }
                }
            }
            
            // Desvincular dispositivo
            if (e.target.closest('.btn-unlink-device')) {
                const btn = e.target.closest('.btn-unlink-device');
                const id = btn.getAttribute('data-id');
                const person = await PeopleModel.find(id);
                
                if (confirm(`Desvincular dispositivo ${person.deviceId} de ${person.name}?`)) {
                    const result = await PeopleController.update(id, { deviceId: null });
                    if (result.success) {
                        showAlert('Dispositivo desvinculado com sucesso!');
                        await render();
                    } else {
                        showAlert(`Erro: ${result.error}`, 'danger');
                    }
                }
            }
        });

        // Ações de dispositivos
        document.getElementById('devices-list').addEventListener('click', async (e) => {
            // Remover dispositivo
            if (e.target.closest('.btn-remove-device')) {
                const btn = e.target.closest('.btn-remove-device');
                const id = btn.getAttribute('data-id');
                const device = await DevicesModel.find(id);
                
                if (confirm(`Tem certeza que deseja remover o dispositivo ${device.id}?`)) {
                    const result = await DevicesController.remove(id);
                    if (result.success) {
                        showAlert('Dispositivo removido com sucesso!');
                        await render();
                    } else {
                        showAlert(`Erro: ${result.error}`, 'danger');
                    }
                }
            }
            
            // Ativar/Desativar dispositivo
            if (e.target.closest('.btn-toggle-device')) {
                const btn = e.target.closest('.btn-toggle-device');
                const id = btn.getAttribute('data-id');
                const device = await DevicesModel.find(id);
                console.log(`🔁 [cadastro] Toggle requested for device ${id} (current active=${device.active})`);
                const result = await DevicesController.update(id, { active: !device.active });
                console.log(`🔁 [cadastro] Toggle result for device ${id}:`, result);
                if (result.success) {
                    showAlert(`Dispositivo ${!device.active ? 'ativado' : 'desativado'} com sucesso!`);
                    await render();
                } else {
                    showAlert(`Erro: ${result.error}`, 'danger');
                }
            }
        });
    }

    async function render(){
        if (!root) {
            console.error('Elemento view-root não encontrado');
            return;
        }
        
        root.innerHTML = template();
        await renderPeopleList();
        await renderDevicesList();
        await populateLinkSelects();
        await updateCounters();
        bindEvents();
        
        // ✅ Iniciar auto-refresh a cada 3 segundos
        if (refreshInterval) {
            clearInterval(refreshInterval);
        }
        
        console.log('🚀 [render] Configurando auto-refresh...');
        refreshInterval = setInterval(async () => {
            console.log('🔄 [auto-refresh] Executando atualização automática...');
            try {
                await renderPeopleList();
                await renderDevicesList();
                await updateCounters();
                console.log('✅ [auto-refresh] Atualização concluída');
            } catch (error) {
                console.error('❌ [auto-refresh] Erro:', error);
            }
        }, 3000);
        console.log('✅ Auto-refresh iniciado (3s) para Gestão de Recursos');
    }
    
    // Função de cleanup - parar auto-refresh ao sair da view
    function cleanup() {
        console.log('🧹 Limpando CombinedView...');
        if (refreshInterval) {
            clearInterval(refreshInterval);
            refreshInterval = null;
            console.log('⏹️ Auto-refresh parado');
        }
    }

    return { render, cleanup };
})();