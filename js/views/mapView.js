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
                                        <input type="number" class="form-control form-control-sm" id="sim-x" placeholder="Coordenada X (0-1)" step="any" min="0" max="1" inputmode="decimal">
                                    </div>
                                    <div class="col-6">
                                        <input type="number" class="form-control form-control-sm" id="sim-y" placeholder="Coordenada Y (0-1)" step="any" min="0" max="1" inputmode="decimal">
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
                                    <i class="bi bi-shuffle me-1"></i>Redistribuir Inteligente
                                </button>
                                <button id="btn-auto-simulate" class="btn btn-success btn-sm">
                                    <i class="bi bi-play-circle me-1"></i>Simulação Auto
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        `;
    }

    async function renderMap(){
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
    
    // Carregar zonas do MapModel com await
    const zones = await MapModel.loadZones();
    
    // Desenhar zonas de risco (suporta polígonos)
    for (const zone of zones){
        if (zone.coordinates && zone.coordinates.length > 0) {
            // Zona tipo polígono - renderizar como DIV com bordas
            const coords = zone.coordinates;
            
            // Calcular bounding box
            const minX = Math.min(...coords.map(c => c.x));
            const maxX = Math.max(...coords.map(c => c.x));
            const minY = Math.min(...coords.map(c => c.y));
            const maxY = Math.max(...coords.map(c => c.y));
            
            const width = maxX - minX;
            const height = maxY - minY;
            const centerX = minX + width / 2;
            const centerY = minY + height / 2;
            
            const el = document.createElement('div');
            el.className = 'zone position-absolute border';
            el.style.left = (minX * 100) + '%';
            el.style.top = (minY * 100) + '%';
            el.style.width = (width * 100) + '%';
            el.style.height = (height * 100) + '%';
            el.style.backgroundColor = zone.color || (zone.isRiskZone ? 'rgba(255, 0, 0, 0.2)' : 'rgba(0, 255, 0, 0.2)');
            el.style.borderColor = zone.color || (zone.isRiskZone ? '#ff0000' : '#00ff00');
            el.style.borderWidth = '2px';
            el.style.borderStyle = 'solid';
            el.style.borderRadius = '8px';
            
            // Adicionar label da zona
            const label = document.createElement('div');
            label.className = 'position-absolute text-white fw-bold small';
            label.style.left = '50%';
            label.style.top = '50%';
            label.style.transform = 'translate(-50%, -50%)';
            label.style.background = zone.isRiskZone ? 'rgba(220, 53, 69, 0.9)' : 'rgba(0, 128, 0, 0.9)';
            label.style.padding = '4px 12px';
            label.style.borderRadius = '6px';
            label.style.whiteSpace = 'nowrap';
            label.style.fontSize = '14px';
            label.style.fontWeight = 'bold';
            label.textContent = zone.name;
            
            el.appendChild(label);
            el.title = `${zone.name}\nTipo: ${zone.isRiskZone ? 'Zona de Risco' : 'Zona Segura'}\nÁrea: ${(width * height * 100).toFixed(1)}%`;
            canvas.appendChild(el);
            
        } else if (zone.r) {
            // Zona tipo círculo (compatibilidade antiga)
            const el = document.createElement('div');
            el.className = 'zone position-absolute';
            el.style.left = (zone.x * 100) + '%';
            el.style.top = (zone.y * 100) + '%';
            el.style.width = (zone.r * 2 * 100) + '%';
            el.style.height = (zone.r * 2 * 100) + '%';
            
            const label = document.createElement('div');
            label.className = 'position-absolute text-white fw-bold small';
            label.style.left = '50%';
            label.style.top = '50%';
            label.style.transform = 'translate(-50%, -50%)';
            label.style.background = 'rgba(220, 53, 69, 0.9)';
            label.style.padding = '2px 8px';
            label.style.borderRadius = '4px';
            label.style.whiteSpace = 'nowrap';
            label.style.fontSize = '14px';
            label.textContent = zone.name;
            
            el.appendChild(label);
            el.title = `${zone.name}\nRaio: ${(zone.r * 100).toFixed(0)}%`;
            canvas.appendChild(el);
        }
    }

    // Carregar dispositivos e posições com await
    const devices = await DevicesModel.all();
    const positions = await MapModel.getDevicePositions();

    // Desenhar marcadores dos colaboradores
    for (const device of devices){
        if (!device.active) continue;
        
        const pos = positions[device.id];
        if (!pos) continue;
        
        const person = await PeopleModel.findByDevice(device.id);
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

    async function renderDevicesList(){
        const node = document.getElementById('devices-list');
        if (!node) return;
        
        try {
            const devices = await DevicesModel.all();
            const positions = await MapModel.getDevicePositions();
            const zones = await MapModel.loadZones();
            
            if (devices.length === 0){ 
                node.innerHTML = '<div class="alert alert-info py-2">Nenhum dispositivo cadastrado.</div>'; 
                return; 
            }
            
            node.innerHTML = '';
            for (const device of devices){
                const pos = positions[device.id];
                const person = await PeopleModel.findByDevice(device.id);
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
        } catch (error) {
            console.error('Erro ao renderizar lista de dispositivos:', error);
            node.innerHTML = '<div class="alert alert-danger py-2">Erro ao carregar dispositivos</div>';
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
        document.getElementById('btn-sim-move').addEventListener('click', async () => {
            const deviceId = document.getElementById('sim-device-id').value.trim().toUpperCase();
            const x = parseFloat(String(document.getElementById('sim-x').value).replace(',', '.'));
            const y = parseFloat(String(document.getElementById('sim-y').value).replace(',', '.'));
            
            if (!deviceId) {
                showAlert('Informe o ID do dispositivo', 'warning');
                return;
            }
            
            if (isNaN(x) || isNaN(y) || x < 0 || x > 1 || y < 0 || y > 1) {
                showAlert('Coordenadas devem ser números entre 0 e 1', 'warning');
                return;
            }
            
            try {
                const device = await DevicesModel.find(deviceId);
                if (!device) {
                    showAlert(`Dispositivo ${deviceId} não encontrado`, 'danger');
                    return;
                }
                
                await MapModel.setDevicePosition(deviceId, x, y);
                showAlert(`Dispositivo ${deviceId} movido para (${x.toFixed(2)}, ${y.toFixed(2)})`, 'success');
                await renderMap();
                await renderDevicesList();
            } catch (error) {
                console.error('Erro ao mover dispositivo:', error);
                showAlert('Erro ao mover dispositivo', 'danger');
            }
            
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

        // Posições inteligentes baseadas nas áreas do canteiro
        document.getElementById('btn-randomize').addEventListener('click', () => {
            // Apenas mover dispositivos do tipo 'worker', mantendo sensores fixos
            const devices = DevicesModel.all().filter(d => d.active && d.type === 'worker');
            
            // Obter áreas disponíveis do AreasModel
            const areas = AreasModel ? AreasModel.getAreas() : [];
            
            for (const device of devices) {
                let x, y;
                
                if (areas.length > 0) {
                    // Escolher uma área aleatória
                    const randomArea = areas[Math.floor(Math.random() * areas.length)];
                    
                    // Posicionar dentro da área escolhida com margem de segurança
                    const marginX = randomArea.w * 0.1; // 10% de margem
                    const marginY = randomArea.h * 0.1; // 10% de margem
                    
                    x = randomArea.x + marginX + Math.random() * (randomArea.w - 2 * marginX);
                    y = randomArea.y + marginY + Math.random() * (randomArea.h - 2 * marginY);
                    
                    // Garantir que está dentro dos limites do mapa
                    x = Math.max(0.02, Math.min(0.98, x));
                    y = Math.max(0.02, Math.min(0.98, y));
                } else {
                    // Fallback para posições aleatórias se AreasModel não estiver disponível
                    x = Math.random() * 0.9 + 0.05;
                    y = Math.random() * 0.9 + 0.05;
                }
                
                MapModel.setDevicePosition(device.id, x, y);
            }
            
            // Atualiza silenciosamente sem mostrar alerta
            renderMap();
            renderDevicesList();
            
            console.log(`🎯 Colaboradores redistribuídos inteligentemente pelas ${areas.length} áreas do canteiro`);
        });

        // Simulação automática
        document.getElementById('btn-auto-simulate').addEventListener('click', () => {
            if (isAutoSimulating) {
                stopAutoSimulation();
            } else {
                startAutoSimulation();
            }
        });

        // Enter para mover dispositivo
        document.getElementById('sim-device-id').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                document.getElementById('btn-sim-move').click();
            }
        });
    }

    // Variáveis para controle da simulação automática
    let autoSimulationInterval = null;
    let isAutoSimulating = false;
    
    // Simulação automática inteligente
    function startAutoSimulation() {
        if (autoSimulationInterval) return; // Já está rodando
        
        isAutoSimulating = true;
        const autoBtn = document.getElementById('btn-auto-simulate');
        autoBtn.innerHTML = '<i class="bi bi-stop-circle me-1"></i>Parar Simulação';
        autoBtn.className = 'btn btn-danger btn-sm';
        
        console.log('🎬 Iniciando simulação automática de colaboradores...');
        
        autoSimulationInterval = setInterval(() => {
            const workers = DevicesModel.all().filter(d => d.active && d.type === 'worker');
            const areas = AreasModel ? AreasModel.getAreas() : [];
            
            if (workers.length === 0 || areas.length === 0) return;
            
            // Mover cada colaborador para uma nova área ou dentro da área atual
            workers.forEach(worker => {
                const currentPos = MapModel.getDevicePosition(worker.id) || { x: 0.5, y: 0.5 };
                
                // 70% chance de se mover para área adjacente, 30% de ficar na área atual
                const shouldChangeArea = Math.random() < 0.7;
                
                let targetArea;
                if (shouldChangeArea) {
                    // Escolher nova área (preferir áreas produtivas)
                    const productiveAreas = areas.filter(a => 
                        a.id.includes('construcao') || 
                        a.id.includes('oficina') || 
                        a.id.includes('zona_perigo') ||
                        a.id.includes('betoneira') ||
                        a.id.includes('almoxarifado')
                    );
                    const allAreas = productiveAreas.length > 0 ? productiveAreas : areas;
                    targetArea = allAreas[Math.floor(Math.random() * allAreas.length)];
                } else {
                    // Encontrar área atual ou escolher aleatória
                    targetArea = areas.find(area => 
                        currentPos.x >= area.x && currentPos.x <= (area.x + area.w) &&
                        currentPos.y >= area.y && currentPos.y <= (area.y + area.h)
                    ) || areas[Math.floor(Math.random() * areas.length)];
                }
                
                // Calcular nova posição dentro da área alvo
                const marginX = targetArea.w * 0.15; // 15% de margem
                const marginY = targetArea.h * 0.15;
                
                const newX = targetArea.x + marginX + Math.random() * (targetArea.w - 2 * marginX);
                const newY = targetArea.y + marginY + Math.random() * (targetArea.h - 2 * marginY);
                
                // Garantir limites do mapa
                const finalX = Math.max(0.02, Math.min(0.98, newX));
                const finalY = Math.max(0.02, Math.min(0.98, newY));
                
                MapModel.setDevicePosition(worker.id, finalX, finalY);
            });
            
            // Atualizar visualização
            renderMap();
            
        }, 3000); // Movimento a cada 3 segundos
    }
    
    function stopAutoSimulation() {
        if (autoSimulationInterval) {
            clearInterval(autoSimulationInterval);
            autoSimulationInterval = null;
        }
        
        isAutoSimulating = false;
        const autoBtn = document.getElementById('btn-auto-simulate');
        autoBtn.innerHTML = '<i class="bi bi-play-circle me-1"></i>Simulação Auto';
        autoBtn.className = 'btn btn-success btn-sm';
        
        console.log('⏹️ Simulação automática parada');
    }

    async function render(){
        if (!root) {
            console.error('Elemento view-root não encontrado');
            return;
        }
        
        root.innerHTML = template();
        await renderMap();
        await renderDevicesList();
        bindControls();
    }

    return { render };
})();