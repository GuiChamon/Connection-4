// js/views/monitoringView.js - SISTEMA DE MONITORAMENTO ESTILO ORIGINAL EM FULLSCREEN
const MonitoringView = (function(){
    const root = document.getElementById('view-root');

    function template(){
        return `
        <div class="col-12">
            <!-- Cabeçalho da Seção - EXATAMENTE igual ao de Gestão de Recursos -->
            <div class="d-flex justify-content-between align-items-center mb-4">
                <div>
                    <h2 class="h4 text-dark mb-1">
                        <i class="bi bi-building text-primary me-2"></i>Sistema de Monitoramento - Canteiro de Obras
                    </h2>
                    <p class="text-muted mb-0">Monitoramento em tempo real de colaboradores e equipamentos de segurança</p>
                </div>
                <div class="text-end">
                    <span class="badge bg-primary fs-6">Sistema Acadêmico</span>
                </div>
            </div>

            <!-- Mapa Fullwidth com Header -->
            <div class="row">
                <div class="col-12">
                    <div class="card shadow-sm border-0">
                        <div class="card-header d-flex justify-content-between align-items-center">
                            <h5 class="card-title mb-0 text-white">
                                <i class="bi bi-geo-alt me-2"></i>Mapa de Monitoramento em Tempo Real
                            </h5>
                            <!-- Indicadores no header do mapa -->
                            <div class="d-flex gap-3 text-white">
                                <div class="text-center">
                                    <div class="fw-bold" id="total-workers">0</div>
                                    <small>Colaboradores</small>
                                </div>
                                <div class="text-center">
                                    <div class="fw-bold" id="total-devices">0</div>
                                    <small>Dispositivos</small>
                                </div>
                                <div class="text-center">
                                    <div class="fw-bold" id="risk-alerts">0</div>
                                    <small>Alertas</small>
                                </div>
                                <div class="text-center">
                                    <button id="toggle-grid" class="btn btn-sm btn-outline-light" title="Mostrar/Esconder grade">Grade</button>
                                </div>
                            </div>
                        </div>
                        <div class="card-body p-0">
                            <div class="map-container position-relative bg-light" style="height: calc(100vh - 300px);">
                                <div class="map-canvas position-absolute w-100 h-100" id="map-canvas">
                                    <!-- mapa será renderizado aqui -->
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Painel de Controle Flutuante -->
            <div class="control-panel-floating position-fixed" style="top: 120px; right: 20px; width: 300px; z-index: 1000;">
                <div class="card shadow border-0">
                    <div class="card-header">
                        <h6 class="card-title mb-0 text-white">
                            <i class="bi bi-people-fill me-2"></i>Painel de Controle
                        </h6>
                    </div>
                    <div class="card-body">
                        <!-- Lista de Colaboradores -->
                        <div class="mb-3">
                            <h6 class="text-primary mb-2 small">
                                <i class="bi bi-people-fill me-1"></i>Colaboradores Ativos
                            </h6>
                            <div id="workers-list" class="workers-list" style="max-height: 200px; overflow-y: auto;"></div>
                        </div>

                        <!-- Alertas de Segurança -->
                        <div class="mb-3">
                            <h6 class="text-danger mb-2 small">
                                <i class="bi bi-exclamation-triangle-fill me-1"></i>Alertas de Segurança
                            </h6>
                            <div id="safety-alerts" class="alerts-list"></div>
                        </div>

                        <!-- Controles -->
                        <div class="mb-2">
                            <h6 class="text-success mb-2 small">
                                <i class="bi bi-gear-fill me-1"></i>Controles
                            </h6>
                            <div class="d-grid gap-1">
                                <button class="btn btn-success btn-sm" onclick="location.reload()">
                                    <i class="bi bi-arrow-clockwise me-1"></i>Atualizar
                                </button>
                                <button class="btn btn-warning btn-sm" onclick="Router.show('cadastro')">
                                    <i class="bi bi-person-gear me-1"></i>Gestão
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
        
        // Adicionar grid sobre a planta (estilo original)
        const grid = document.createElement('div');
        grid.className = 'map-grid';
        canvas.appendChild(grid);
        
        // Áreas completas do canteiro de obras (tentar carregar de AreasModel se disponível)
        let workAreas = [];
        try {
            if (typeof AreasModel !== 'undefined' && AreasModel.getAreas) {
                workAreas = AreasModel.getAreas();
            }
        } catch (e) {
            console.warn('AreasModel não disponível, usando áreas internas');
        }

        if (!workAreas || workAreas.length === 0) {
            workAreas = [
                { x: 0.1, y: 0.1, w: 0.15, h: 0.1, name: 'Portaria/Entrada', color: '#28a745', icon: '🚪' },
                { x: 0.2, y: 0.15, w: 0.2, h: 0.15, name: 'Escritório de Obras', color: '#17a2b8', icon: '🏢' },
                { x: 0.8, y: 0.1, w: 0.15, h: 0.15, name: 'Almoxarifado', color: '#6c757d', icon: '📦' },
                { x: 0.45, y: 0.35, w: 0.25, h: 0.2, name: 'Área de Construção Principal', color: '#fd7e14', icon: '🏗️' },
                { x: 0.25, y: 0.55, w: 0.15, h: 0.15, name: 'Central de Concreto', color: '#6f42c1', icon: '🚚' },
                { x: 0.75, y: 0.55, w: 0.2, h: 0.15, name: 'Oficina de Manutenção', color: '#20c997', icon: '🔧' },
                { x: 0.05, y: 0.75, w: 0.2, h: 0.15, name: 'Refeitório', color: '#ffc107', icon: '🍽️' },
                { x: 0.15, y: 0.85, w: 0.15, h: 0.1, name: 'Vestiário', color: '#e83e8c', icon: '👔' },
                { x: 0.35, y: 0.15, w: 0.15, h: 0.15, name: 'Zona de Risco - Guindastes', color: '#dc3545', icon: '⚠️' },
                { x: 0.65, y: 0.35, w: 0.15, h: 0.15, name: 'Zona de Risco - Soldas', color: '#dc3545', icon: '⚠️' }
            ];
        }
        
        // Desenhar todas as áreas de trabalho
        for (const area of workAreas) {
            const areaEl = document.createElement('div');
            areaEl.className = 'work-area position-absolute';
            areaEl.style.left = (area.x * 100) + '%';
            areaEl.style.top = (area.y * 100) + '%';
            areaEl.style.width = (area.w * 100) + '%';
            areaEl.style.height = (area.h * 100) + '%';
            areaEl.style.background = area.color + '20'; // Transparência
            areaEl.style.border = `2px solid ${area.color}`;
            areaEl.style.borderRadius = '8px';
            areaEl.style.zIndex = '1';
            
            // Label da área
            const label = document.createElement('div');
            label.className = 'area-label position-absolute d-flex align-items-center justify-content-center text-center';
            label.style.left = '0';
            label.style.top = '0';
            label.style.width = '100%';
            label.style.height = '100%';
            label.style.background = area.color + '90';
            label.style.color = 'white';
            label.style.fontSize = '11px';
            label.style.fontWeight = 'bold';
            label.style.borderRadius = '6px';
            label.style.flexDirection = 'column';
            label.style.gap = '2px';
            label.innerHTML = `
                <div style="font-size: 16px;">${area.icon}</div>
                <div style="line-height: 1.1;">${area.name}</div>
            `;
            
            areaEl.appendChild(label);
            canvas.appendChild(areaEl);
        }
        
    // Legenda estilo original melhorada
        const legend = document.createElement('div');
        legend.className = 'map-legend-enhanced';
        legend.innerHTML = `
            <div class="legend-title">🗺️ MAPA DO CANTEIRO DE OBRAS</div>
            <div class="legend-section">
                <div class="legend-subtitle">👥 Colaboradores</div>
                <div class="legend-item">
                    <div class="legend-color bg-success"></div>
                    <span>Colaborador Seguro</span>
                </div>
                <div class="legend-item">
                    <div class="legend-color bg-danger"></div>
                    <span>Colaborador em Risco</span>
                </div>
            </div>
            <div class="legend-section">
                <div class="legend-subtitle">🏗️ Áreas de Trabalho</div>
                <div class="legend-item">
                    <div class="legend-color" style="background: #28a745;"></div>
                    <span>Áreas Administrativas</span>
                </div>
                <div class="legend-item">
                    <div class="legend-color" style="background: #fd7e14;"></div>
                    <span>Área de Construção</span>
                </div>
                <div class="legend-item">
                    <div class="legend-color" style="background: #dc3545;"></div>
                    <span>Zonas de Perigo</span>
                </div>
            </div>
        `;
        canvas.appendChild(legend);
        
        // Carregar zonas de perigo adicionais do MapModel
        try {
            const zones = await MapModel.loadZones();
            
            for (const zone of zones){
                const el = document.createElement('div');
                el.className = 'danger-zone position-absolute';
                el.style.left = (zone.x * 100) + '%';
                el.style.top = (zone.y * 100) + '%';
                el.style.width = (zone.r * 2 * 100) + '%';
                el.style.height = (zone.r * 2 * 100) + '%';
                el.style.background = 'rgba(220, 53, 69, 0.2)';
                el.style.border = '2px dashed #dc3545';
                el.style.borderRadius = '50%';
                el.style.zIndex = '2';
                
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
                
                el.appendChild(label);
                canvas.appendChild(el);
            }
        } catch (error) {
            console.log('Usando zonas padrão do sistema...');
        }

        // grid toggle: manter referência e estado
        const gridEl = canvas.querySelector('.map-grid');
        let gridVisible = true;
        const toggleBtn = document.getElementById('toggle-grid');
        if (toggleBtn && gridEl) {
            toggleBtn.addEventListener('click', () => {
                gridVisible = !gridVisible;
                gridEl.style.display = gridVisible ? 'block' : 'none';
            });
        }

        await renderWorkers();
    }

    function checkProximityToRiskAreas(position) {
        // Definir áreas de alto risco
        const riskAreas = [
            { x: 0.35, y: 0.15, w: 0.15, h: 0.15, name: 'Zona de Guindastes' },
            { x: 0.65, y: 0.35, w: 0.15, h: 0.15, name: 'Zona de Soldas' }
        ];
        
        for (const area of riskAreas) {
            if (position.x >= area.x && position.x <= (area.x + area.w) &&
                position.y >= area.y && position.y <= (area.y + area.h)) {
                return true;
            }
        }
        return false;
    }

    async function renderWorkers(){
        const canvas = document.getElementById('map-canvas');
        const workersList = document.getElementById('workers-list');
        
        if (!canvas || !workersList) return;

        // Remover workers existentes
        canvas.querySelectorAll('.worker-marker').forEach(el => el.remove());
        workersList.innerHTML = '';

        try {
            const people = await PeopleController.getAll();
            const devices = await DevicesController.getAll();
            const positions = await MapModel.getDevicePositions();

            let workersCount = 0;
            let alertsCount = 0;

            for (const person of people) {
                if (!person.deviceId) continue;

                const device = devices.find(d => d.id === person.deviceId);
                if (!device || !device.active) continue;

                const position = positions[person.deviceId];
                if (!position) continue;

                workersCount++;

                // Verificar se está em zona de perigo (áreas específicas)
                const inDangerZone = 
                    // Zona de Guindastes
                    (position.x > 0.35 && position.x < 0.50 && position.y > 0.15 && position.y < 0.30) ||
                    // Zona de Soldas  
                    (position.x > 0.65 && position.x < 0.80 && position.y > 0.35 && position.y < 0.50) ||
                    // Verificar proximidade com áreas de risco
                    checkProximityToRiskAreas(position);
                
                if (inDangerZone) alertsCount++;

                // Criar marker no mapa (estilo original)
                const worker = document.createElement('div');
                worker.className = `worker-marker position-absolute ${inDangerZone ? 'worker-danger' : 'worker-safe'}`;
                worker.style.left = (position.x * 100) + '%';
                worker.style.top = (position.y * 100) + '%';
                worker.style.transform = 'translate(-50%, -50%)';
                worker.innerHTML = `
                    <div class="worker-icon" style="width: 35px; height: 35px; border-radius: 50%; 
                         background: ${inDangerZone ? '#dc3545' : '#198754'}; color: white; 
                         display: flex; align-items: center; justify-content: center; 
                         border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);">
                        <i class="bi bi-person-fill"></i>
                    </div>
                `;
                worker.title = `${person.name} - ${person.role}\nDispositivo: ${device.id}\nStatus: ${inDangerZone ? 'EM RISCO' : 'SEGURO'}`;
                canvas.appendChild(worker);

                // Adicionar na lista lateral
                const workerItem = document.createElement('div');
                workerItem.className = `worker-item border rounded p-2 mb-2 ${inDangerZone ? 'border-danger bg-light' : 'border-success bg-white'}`;
                workerItem.innerHTML = `
                    <div class="d-flex justify-content-between align-items-center">
                        <div>
                            <div class="fw-bold small">${person.name}</div>
                            <div class="text-muted small">${person.role}</div>
                            <div class="text-muted small">ID: ${device.id}</div>
                        </div>
                        <span class="badge ${inDangerZone ? 'bg-danger' : 'bg-success'} small">
                            ${inDangerZone ? '⚠️ RISCO' : '✅ OK'}
                        </span>
                    </div>
                `;
                workersList.appendChild(workerItem);
            }

            // Atualizar contadores
            document.getElementById('total-workers').textContent = workersCount;
            document.getElementById('total-devices').textContent = devices.filter(d => d.active).length;
            document.getElementById('risk-alerts').textContent = alertsCount;

            await renderSafetyAlerts(alertsCount);

        } catch (error) {
            console.error('Erro ao renderizar workers:', error);
        }
    }

    async function renderSafetyAlerts(alertsCount) {
        const alertsContainer = document.getElementById('safety-alerts');
        if (!alertsContainer) return;

        if (alertsCount === 0) {
            alertsContainer.innerHTML = `
                <div class="alert alert-success alert-sm">
                    <i class="bi bi-check-circle me-2"></i>
                    Todos os colaboradores em área segura
                </div>
            `;
        } else {
            alertsContainer.innerHTML = `
                <div class="alert alert-danger alert-sm">
                    <i class="bi bi-exclamation-triangle me-2"></i>
                    <strong>${alertsCount} colaborador(es) em zona de risco!</strong>
                    <br><small>Verifique a localização no mapa</small>
                </div>
            `;
        }
    }

    async function render(){
        if (!root) {
            console.error('Elemento view-root não encontrado');
            return;
        }
        
        root.innerHTML = template();
        await renderMap();
        
        // Atualizar a cada 3 segundos
        setInterval(async () => {
            await renderWorkers();
        }, 3000);
    }

    return { render };
})();