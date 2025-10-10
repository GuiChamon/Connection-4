// js/views/mapView.js
const MapView = (function(){
    const root = document.getElementById('view-root');

    function template(){
        return `
        <div class="col-12">
            <div class="row">
                <!-- Mapa -->
                <div class="col-lg-8 mb-4">
                    <div class="card shadow-sm border-0 h-100">
                        <div class="card-header">
                            <h5 class="card-title mb-0 text-white">
                                <i class="bi bi-geo-alt me-2"></i>Mapa de Monitoramento
                            </h5>
                        </div>
                        <div class="card-body p-0">
                            <div class="map-container position-relative bg-light border rounded" style="height: 500px;">
                                <div class="map-canvas position-absolute w-100 h-100" id="map-canvas">
                                    <!-- zonas e marcadores serão injetados aqui -->
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Controles -->
                <div class="col-lg-4">
                    <div class="card shadow-sm border-0">
                        <div class="card-header">
                            <h5 class="card-title mb-0 text-white">
                                <i class="bi bi-sliders me-2"></i>Controles de Simulação
                            </h5>
                        </div>
                        <div class="card-body">
                            <p class="text-muted small mb-3">Atualize posições dos dispositivos manualmente para simular movimento no ambiente de obra.</p>
                            
                            <div class="mb-4">
                                <h6 class="text-primary mb-3">
                                    <i class="bi bi-tablet me-2"></i>Dispositivos Monitorados
                                </h6>
                                <div id="devices-list" class="list"></div>
                            </div>

                            <hr>

                            <div class="mb-4">
                                <h6 class="text-primary mb-3">
                                    <i class="bi bi-arrow-right-circle me-2"></i>Mover Dispositivo
                                </h6>
                                <div class="row g-2 mb-2">
                                    <div class="col-12">
                                        <input type="text" class="form-control form-control-sm" id="sim-device-id" placeholder="ID do dispositivo (ex: D123)">
                                    </div>
                                    <div class="col-6">
                                        <input type="number" class="form-control form-control-sm" id="sim-x" placeholder="Coordenada X (0-1)" step="0.01" min="0" max="1">
                                    </div>
                                    <div class="col-6">
                                        <input type="number" class="form-control form-control-sm" id="sim-y" placeholder="Coordenada Y (0-1)" step="0.01" min="0" max="1">
                                    </div>
                                    <div class="col-12">
                                        <button id="btn-sim-move" class="btn btn-primary btn-sm w-100">
                                            <i class="bi bi-check-lg me-1"></i>Mover Dispositivo
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div class="d-grid gap-2">
                                <button id="btn-reset-positions" class="btn btn-warning btn-sm">
                                    <i class="bi bi-arrow-clockwise me-1"></i>Resetar Posições
                                </button>
                                <button id="btn-randomize" class="btn btn-secondary btn-sm">
                                    <i class="bi bi-shuffle me-1"></i>Posições Aleatórias
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        `;
    }

    function renderMap(){
    const canvas = document.getElementById('map-canvas');
    if (!canvas) return;
    
    canvas.innerHTML = '';
    
    // Adicionar grid sobre a planta
    const grid = document.createElement('div');
    grid.className = 'map-grid';
    canvas.appendChild(grid);
    
    // Adicionar legenda
    const legend = document.createElement('div');
    legend.className = 'map-legend';
    legend.innerHTML = `
        <div class="legend-title">LEGENDA DO MAPA</div>
        <div class="legend-item">
            <div class="legend-color bg-success"></div>
            <span>Colaborador Seguro</span>
        </div>
        <div class="legend-item">
            <div class="legend-color bg-danger"></div>
            <span>Colaborador em Risco</span>
        </div>
        <div class="legend-item">
            <div class="legend-color" style="background: rgba(220, 53, 69, 0.3); border-color: #dc3545;"></div>
            <span>Zona de Perigo</span>
        </div>
    `;
    canvas.appendChild(legend);
    
    // Carregar zonas do MapModel
    const zones = MapModel.loadZones();
    
    // Desenhar zonas de risco
    for (const zone of zones){
        const el = document.createElement('div');
        el.className = 'zone position-absolute';
        el.style.left = (zone.x * 100) + '%';
        el.style.top = (zone.y * 100) + '%';
        el.style.width = (zone.r * 2 * 100) + '%';
        el.style.height = (zone.r * 2 * 100) + '%';
        
        // Adicionar label da zona
        const label = document.createElement('div');
        label.className = 'position-absolute text-white fw-bold small';
        label.style.left = '50%';
        label.style.top = '50%';
        label.style.transform = 'translate(-50%, -50%)';
        label.style.background = 'rgba(220, 53, 69, 0.9)';
        label.style.padding = '2px 8px';
        label.style.borderRadius = '4px';
        label.style.whiteSpace = 'nowrap';
        label.textContent = zone.name;
        label.title = `Raio: ${(zone.r * 100).toFixed(0)}% da área`;
        
        el.appendChild(label);
        el.title = `${zone.name}\nCentro: (${zone.x.toFixed(2)}, ${zone.y.toFixed(2)})\nRaio: ${zone.r.toFixed(2)}`;
        canvas.appendChild(el);
    }

    // Carregar dispositivos e posições
    const devices = DevicesModel.all();
    const positions = MapModel.getDevicePositions();

    // Desenhar marcadores dos colaboradores
    for (const device of devices){
        if (!device.active) continue;
        
        const pos = positions[device.id];
        if (!pos) continue;
        
        const person = PeopleModel.findByDevice(device.id);
        const el = document.createElement('div');
        el.className = 'marker position-absolute d-flex align-items-center justify-content-center';
        el.style.left = (pos.x * 100) + '%';
        el.style.top = (pos.y * 100) + '%';
        
        // Verificar se está em zona de risco
        const inZone = zones.some(zone => MapModel.pointInZone(pos.x, pos.y, zone));
        
        if (inZone) {
            el.classList.add('bg-danger', 'text-white');
            el.innerHTML = `<span class="fw-bold">${person ? getInitials(person.name) : device.id}</span>`;
        } else {
            el.classList.add('bg-success', 'text-white');
            el.innerHTML = `<span class="fw-bold">${person ? getInitials(person.name) : device.id}</span>`;
        }
        
        const personName = person ? person.name : 'Dispositivo não vinculado';
        const status = inZone ? 'EM ZONA DE RISCO ⚠️' : 'Em área segura ✅';
        el.title = `👤 ${personName}\n📱 ${device.id}\n📍 Posição: (${pos.x.toFixed(2)}, ${pos.y.toFixed(2)})\n🛡️ ${status}`;
        canvas.appendChild(el);
    }
}

    function getInitials(name) {
        return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
    }

    function renderDevicesList(){
        const node = document.getElementById('devices-list');
        if (!node) return;
        
        const devices = DevicesModel.all();
        const positions = MapModel.getDevicePositions();
        const zones = MapModel.loadZones();
        
        if (devices.length === 0){ 
            node.innerHTML = '<div class="alert alert-info py-2">Nenhum dispositivo cadastrado.</div>'; 
            return; 
        }
        
        node.innerHTML = '';
        for (const device of devices){
            const pos = positions[device.id];
            const person = PeopleModel.findByDevice(device.id);
            const inZone = pos ? zones.some(zone => MapModel.pointInZone(pos.x, pos.y, zone)) : false;
            
            const div = document.createElement('div');
            div.className = `d-flex justify-content-between align-items-center p-2 mb-2 border rounded ${inZone ? 'bg-danger text-white' : 'bg-light'}`;
            div.innerHTML = `
                <div>
                    <strong class="small">${device.id}</strong>
                    <div class="extra-small">${person ? person.name : 'Sem pessoa vinculada'}</div>
                </div>
                <div class="text-end">
                    <span class="badge ${inZone ? 'bg-warning' : 'bg-success'}">${inZone ? 'PERIGO' : 'SAFE'}</span>
                    <div class="extra-small">${pos ? `x:${pos.x.toFixed(2)} y:${pos.y.toFixed(2)}` : 'Sem posição'}</div>
                </div>
            `;
            node.appendChild(div);
        }
    }

    function showAlert(message, type = 'info') {
        // Remove alertas existentes
        const existingAlerts = document.querySelectorAll('.alert');
        existingAlerts.forEach(alert => alert.remove());
        
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type} alert-dismissible fade show mt-3`;
        alertDiv.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        
        // Insere após o título principal
        const main = document.querySelector('main');
        const firstCard = main.querySelector('.card');
        if (firstCard) {
            firstCard.parentNode.insertBefore(alertDiv, firstCard);
        } else {
            main.insertBefore(alertDiv, main.firstChild);
        }
        
        // Remove automaticamente após 3 segundos
        setTimeout(() => {
            if (alertDiv.parentNode) {
                alertDiv.remove();
            }
        }, 3000);
    }

    function bindControls(){
        // Mover dispositivo específico
        document.getElementById('btn-sim-move').addEventListener('click', () => {
            const deviceId = document.getElementById('sim-device-id').value.trim().toUpperCase();
            const x = parseFloat(document.getElementById('sim-x').value);
            const y = parseFloat(document.getElementById('sim-y').value);
            
            if (!deviceId) {
                showAlert('Informe o ID do dispositivo', 'warning');
                return;
            }
            
            if (isNaN(x) || isNaN(y) || x < 0 || x > 1 || y < 0 || y > 1) {
                showAlert('Coordenadas devem ser números entre 0 e 1', 'warning');
                return;
            }
            
            const device = DevicesModel.find(deviceId);
            if (!device) {
                showAlert(`Dispositivo ${deviceId} não encontrado`, 'danger');
                return;
            }
            
            MapModel.setDevicePosition(deviceId, x, y);
            showAlert(`Dispositivo ${deviceId} movido para (${x.toFixed(2)}, ${y.toFixed(2)})`, 'success');
            renderMap();
            renderDevicesList();
            
            // Limpar campos
            document.getElementById('sim-device-id').value = '';
            document.getElementById('sim-x').value = '';
            document.getElementById('sim-y').value = '';
        });

        // Resetar posições
        document.getElementById('btn-reset-positions').addEventListener('click', () => {
            if (confirm('Deseja resetar todas as posições dos dispositivos?')) {
                MapModel.resetDevicePositions();
                showAlert('Posições resetadas com sucesso', 'info');
                renderMap();
                renderDevicesList();
            }
        });

        // Posições aleatórias
        document.getElementById('btn-randomize').addEventListener('click', () => {
            const devices = DevicesModel.all().filter(d => d.active);
            
            for (const device of devices) {
                const x = Math.random() * 0.9 + 0.05; // Entre 0.05 e 0.95
                const y = Math.random() * 0.9 + 0.05; // Entre 0.05 e 0.95
                MapModel.setDevicePosition(device.id, x, y);
            }
            
            // Atualiza silenciosamente sem mostrar alerta
            renderMap();
            renderDevicesList();
        });

        // Enter para mover dispositivo
        document.getElementById('sim-device-id').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                document.getElementById('btn-sim-move').click();
            }
        });
    }

    function render(){
        if (!root) {
            console.error('Elemento view-root não encontrado');
            return;
        }
        
        root.innerHTML = template();
        renderMap();
        renderDevicesList();
        bindControls();
    }

    return { render };
})();