// js/views/monitoringView.js - SISTEMA DE MONITORAMENTO ESTILO ORIGINAL EM FULLSCREEN
const MonitoringView = (function(){
    const root = document.getElementById('view-root');
    let monitoringInterval = null; // Controla o intervalo de atualização de trabalhadores
    let mapRefreshInterval = null; // Controla o intervalo de atualização do mapa (áreas)
    let editingEnabled = false; // Controla se as áreas podem ser movidas/redimensionadas

    function template(){
        return `
        <div class="col-12">
            <!-- Cabeçalho da Seção - EXATAMENTE igual ao de Gestão de Recursos -->
            <div class="d-flex justify-content-between align-items-center mb-4">
                <div>
                    <h2 class="h4 text-dark mb-1">
                        <i class="bi bi-building text-primary me-2"></i>Sistema de Monitoramento - Canteiro de Obras
                    </h2>
                    <p class="text-muted mb-0"></p>
                </div>
                <div class="text-end">
                    <span class="badge bg-primary fs-6">Sistema Acadêmico</span>
                </div>
            </div>

            <!-- Layout com Mapa e Painel Lateral -->
            <div class="row">
                <!-- Mapa Principal -->
                <div class="col-lg-9">
                    <div class="card shadow-sm border-0">
                        <div class="card-header map-header d-flex justify-content-between align-items-center">
                            <div class="map-header-left d-flex align-items-center gap-3">
                                <div class="map-title text-white">
                                    <div class="h6 mb-0">Mapa do Canteiro</div>
                                    <small class="text-white-50">Visão geral e controle das áreas</small>
                                </div>
                            </div>

                            <div class="map-header-center d-flex align-items-center gap-2">
                                <div class="metric-chip text-center bg-light bg-opacity-10 text-white p-2 rounded">
                                    <div class="metric-value fw-bold" id="total-workers">0</div>
                                    <div class="metric-label small">Colaboradores</div>
                                </div>
                                <div class="metric-chip text-center bg-light bg-opacity-10 text-white p-2 rounded">
                                    <div class="metric-value fw-bold" id="total-sensors">0</div>
                                    <div class="metric-label small">Sensores</div>
                                </div>
                                <div class="metric-chip text-center bg-light bg-opacity-10 text-white p-2 rounded">
                                    <div class="metric-value fw-bold" id="total-devices">0</div>
                                    <div class="metric-label small">Total Ativos</div>
                                </div>
                                <div class="metric-chip text-center bg-light bg-opacity-10 text-white p-2 rounded text-danger">
                                    <div class="metric-value fw-bold" id="risk-alerts">0</div>
                                    <div class="metric-label small">Alertas</div>
                                </div>
                            </div>

                            <div class="map-header-right d-flex align-items-center gap-2">
                                <div class="form-check form-switch text-white d-flex align-items-center gap-2">
                                    <input class="form-check-input" type="checkbox" id="toggle-edit-switch" aria-label="Edição do mapa">
                                    <label class="form-check-label small ms-1 text-white" for="toggle-edit-switch" id="toggle-edit-label">Edição bloqueada</label>
                                </div>
                                <button id="toggle-grid" class="btn btn-sm btn-outline-light" title="Mostrar/Esconder grade">Grade</button>
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

                <!-- Painel de Controle Lateral -->
                <div class="col-lg-3">
                    <div class="card shadow-sm border-0" style="height: calc(100vh - 300px); overflow-y: auto;">
                        <div class="card-header">
                            <h6 class="card-title mb-0 text-white">
                                <i class="bi bi-sliders me-2"></i>Painel de Controle
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

                        <!-- Alertas de Controle de Acesso -->
                        <div class="mb-3">
                            <h6 class="text-warning mb-2 small">
                                <i class="bi bi-shield-exclamation me-1"></i>Controle de Acesso
                            </h6>
                            <div id="access-alerts" class="alerts-list" style="max-height: 150px; overflow-y: auto;"></div>
                        </div>

                        <!-- Controles -->
                        <div class="mb-2">
                            <h6 class="text-success mb-2 small">
                                <i class="bi bi-gear-fill me-1"></i>Controles
                            </h6>
                            <div class="d-grid gap-1">
                                <button id="btn-show-restricted-areas" class="btn btn-outline-warning btn-sm">
                                    <i class="bi bi-shield-lock me-1"></i>Áreas Restritas
                                </button>
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
            <!-- Fim do Row -->

            <!-- Modal de Áreas Restritas -->
            <div class="modal fade" id="restrictedAreasModal" tabindex="-1">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header bg-warning">
                            <h5 class="modal-title">
                                <i class="bi bi-shield-lock me-2"></i>Áreas Restritas e Permissões de Acesso
                            </h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body" id="restricted-areas-content">
                            <!-- Conteúdo será preenchido dinamicamente -->
                        </div>
                    </div>
                </div>
            </div>
        </div>
        `;
    }

    function updateEditingToggleButton() {
        const checkbox = document.getElementById('toggle-edit-switch');
        const label = document.getElementById('toggle-edit-label');
        if (!checkbox || !label) return;
        checkbox.checked = editingEnabled;
        label.textContent = editingEnabled ? 'Edição desbloqueada' : 'Edição bloqueada';
        label.classList.toggle('text-success', editingEnabled);
        label.classList.toggle('text-white', !editingEnabled);
        checkbox.setAttribute('aria-checked', editingEnabled);
    }

    async function renderMap(){
        const canvas = document.getElementById('map-canvas');
        if (!canvas) return;
        
        const editSwitch = document.getElementById('toggle-edit-switch');
        if (editSwitch) {
            editSwitch.onchange = () => {
                editingEnabled = !!editSwitch.checked;
                updateEditingToggleButton();
                renderMap();
            };
            updateEditingToggleButton();
        }

        canvas.classList.toggle('editing-enabled', editingEnabled);
        canvas.classList.toggle('editing-disabled', !editingEnabled);
        canvas.innerHTML = '';

        const MIN_AREA_SIZE = 0.05;
        const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

        const createResizeHandles = (areaEl, area) => {
            if (!editingEnabled) return;
            ['nw', 'ne', 'sw', 'se'].forEach(corner => {
                const handle = document.createElement('div');
                handle.className = `resize-handle resize-${corner}`;
                handle.dataset.corner = corner;
                handle.addEventListener('mousedown', event => {
                    event.preventDefault();
                    event.stopPropagation();
                    if (!editingEnabled) return;
                    areaEl.draggable = false;
                    startResize(event, area, areaEl, corner);
                });
                areaEl.appendChild(handle);
            });
        };

        const applyGeometryToElement = (el, geometry) => {
            el.style.left = (geometry.x * 100) + '%';
            el.style.top = (geometry.y * 100) + '%';
            el.style.width = (geometry.w * 100) + '%';
            el.style.height = (geometry.h * 100) + '%';
        };

        const computeNewGeometry = (initial, deltaX, deltaY, corner) => {
            const right = initial.x + initial.w;
            const bottom = initial.y + initial.h;
            let newX = initial.x;
            let newY = initial.y;
            let newW = initial.w;
            let newH = initial.h;

            if (corner.includes('n')) {
                newY = clamp(initial.y + deltaY, 0, bottom - MIN_AREA_SIZE);
                newH = bottom - newY;
            }

            if (corner.includes('s')) {
                newH = clamp(initial.h + deltaY, MIN_AREA_SIZE, 1 - initial.y);
            }

            if (corner.includes('w')) {
                newX = clamp(initial.x + deltaX, 0, right - MIN_AREA_SIZE);
                newW = right - newX;
            }

            if (corner.includes('e')) {
                newW = clamp(initial.w + deltaX, MIN_AREA_SIZE, 1 - initial.x);
            }

            // Garantir que o retângulo permaneça dentro do canvas
            newW = clamp(newW, MIN_AREA_SIZE, 1 - newX);
            newH = clamp(newH, MIN_AREA_SIZE, 1 - newY);

            return {
                x: Number(newX),
                y: Number(newY),
                w: Number(newW),
                h: Number(newH)
            };
        };

        const persistAreaGeometry = async (areaId, geometry) => {
            try {
                const token = localStorage.getItem('token');
                if (!token) {
                    throw new Error('Token não encontrado');
                }

                const payload = {
                    x: Number(geometry.x.toFixed(4)),
                    y: Number(geometry.y.toFixed(4)),
                    width: Number(geometry.w.toFixed(4)),
                    height: Number(geometry.h.toFixed(4))
                };

                const response = await fetch(`http://localhost:3000/api/zones/${areaId}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify(payload)
                });

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}`);
                }

                console.log('💾 Dimensões da área atualizadas:', payload);
                await AreasModel.refreshAreas();
                await renderMap();
            } catch (error) {
                console.error('❌ Erro ao salvar dimensões da área:', error);
            }
        };

        const startResize = (event, area, areaEl, corner) => {
            if (!editingEnabled) return;
            const rect = canvas.getBoundingClientRect();
            const startX = event.clientX;
            const startY = event.clientY;
            const initial = { x: area.x, y: area.y, w: area.w, h: area.h };
            let current = { ...initial };
            const previousUserSelect = document.body.style.userSelect;
            document.body.style.userSelect = 'none';
            areaEl.classList.add('resizing');

            const onMouseMove = moveEvent => {
                moveEvent.preventDefault();
                const deltaX = (moveEvent.clientX - startX) / rect.width;
                const deltaY = (moveEvent.clientY - startY) / rect.height;
                current = computeNewGeometry(initial, deltaX, deltaY, corner);
                applyGeometryToElement(areaEl, current);
            };

            const onMouseUp = async () => {
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
                document.body.style.userSelect = previousUserSelect;
                areaEl.classList.remove('resizing');
                areaEl.draggable = true;
                area.x = current.x;
                area.y = current.y;
                area.w = current.w;
                area.h = current.h;
                await persistAreaGeometry(area.id, current);
            };

            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        };

        const handleDrop = async (e) => {
            if (!editingEnabled) return;
            e.preventDefault();
            const areaId = e.dataTransfer.getData('areaId');
            if (!areaId) return;
            const offsetX = parseFloat(e.dataTransfer.getData('offsetX')) || 0;
            const offsetY = parseFloat(e.dataTransfer.getData('offsetY')) || 0;

            const rect = canvas.getBoundingClientRect();
            let newX = (e.clientX - rect.left - offsetX) / rect.width;
            let newY = (e.clientY - rect.top - offsetY) / rect.height;

            newX = Math.max(0, Math.min(1, newX));
            newY = Math.max(0, Math.min(1, newY));

            console.log(`🎯 Movendo área ${areaId} para (${newX.toFixed(2)}, ${newY.toFixed(2)})`);

            try {
                const token = localStorage.getItem('token');
                const response = await fetch(`http://localhost:3000/api/zones/${areaId}/position`, {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ x: newX, y: newY })
                });

                if (response.ok) {
                    console.log('✅ Posição salva no backend');
                    await AreasModel.refreshAreas();
                    await renderMap();
                } else {
                    console.error('❌ Erro ao salvar posição');
                }
            } catch (error) {
                console.error('❌ Erro ao atualizar posição:', error);
            }
        };

        canvas.ondragover = (e) => {
            if (!editingEnabled) return;
            e.preventDefault();
        };
        canvas.ondrop = handleDrop;
        
        // Adicionar grid sobre a planta (estilo original)
        const grid = document.createElement('div');
        grid.className = 'map-grid';
        canvas.appendChild(grid);
        
        // ✅ CARREGAR ÁREAS DO BACKEND (assíncrono)
        let workAreas = await AreasModel.loadAreas();
        // Também carregar devices para verificar `device.active` quando necessário
        let devices = [];
        try {
            devices = await DevicesController.getAll();
        } catch (err) {
            console.warn('⚠️ Não foi possível carregar dispositivos ao renderizar mapa:', err);
            devices = [];
        }
        console.log('📍 Áreas carregadas do backend:', workAreas.length);
        
        if (!workAreas || workAreas.length === 0) {
            console.warn('⚠️ Nenhuma área encontrada no banco de dados');
            const message = document.createElement('div');
            message.className = 'alert alert-warning m-3';
            message.innerHTML = '<i class="bi bi-exclamation-triangle me-2"></i>Nenhuma área cadastrada. Acesse "Gestão de Recursos" para criar áreas.';
            canvas.appendChild(message);
            return;
        }
        
        // Desenhar todas as áreas de trabalho COM DRAG & DROP
        for (const area of workAreas) {
            const areaEl = document.createElement('div');
            areaEl.className = 'work-area position-absolute';
            areaEl.dataset.areaId = area.id;
            applyGeometryToElement(areaEl, { x: area.x, y: area.y, w: area.w, h: area.h });
            areaEl.style.background = area.color + '20'; // Transparência
            areaEl.style.border = `2px solid ${area.color}`;
            areaEl.style.borderRadius = '8px';
            areaEl.style.zIndex = '1';
            areaEl.style.cursor = editingEnabled ? 'move' : 'default';
            areaEl.draggable = editingEnabled;
            
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
            
            // ✅ DETERMINAR STATUS DE CONEXÃO (respeitar também Device.active quando houver deviceId)
            let deviceActiveFlag = true;
            if (area.deviceId) {
                const linked = devices.find(d => d.id && d.id.toLowerCase() === String(area.deviceId).toLowerCase());
                deviceActiveFlag = linked ? (linked.active === true) : true;
            }
            const isOnline = deviceActiveFlag && area.currentlyActive === true && area.connectionStatus === 'online';
            const statusIcon = area.deviceId ? (
                isOnline 
                    ? '<div style="font-size: 13px; font-weight:600; color:#fff; background: rgba(40, 167, 69, 0.95); padding: 6px 10px; border-radius: 14px; margin-top: 6px; display:inline-block; box-shadow: 0 2px 6px rgba(0,0,0,0.15);">🟢 CONECTADA</div>'
                    : '<div style="font-size: 13px; font-weight:600; color:#fff; background: rgba(108, 117, 125, 0.95); padding: 6px 10px; border-radius: 14px; margin-top: 6px; display:inline-block; box-shadow: 0 2px 6px rgba(0,0,0,0.12);">⚪ DESCONNECTADA</div>'
            ) : '';
            
            console.log(`🗺️ Área "${area.name}": currentlyActive=${area.currentlyActive}, status=${area.connectionStatus}, isOnline=${isOnline}`);
            
            label.style.fontSize = '14px';
            label.innerHTML = `
                <div style="font-size: 18px;">${area.icon}</div>
                <div style="line-height: 1.1; font-size: 14px;">${area.name}</div>
                ${area.deviceId ? `<div style="font-size: 11px; opacity: 0.9;">📡 ${area.deviceId}</div>` : ''}
                ${statusIcon}
            `;
            
            areaEl.appendChild(label);
            
            // DRAG & DROP IMPLEMENTATION
            areaEl.addEventListener('dragstart', function(e) {
                if (!editingEnabled) {
                    e.preventDefault();
                    return;
                }
                const rect = canvas.getBoundingClientRect();
                const offsetX = e.clientX - rect.left - (area.x * rect.width);
                const offsetY = e.clientY - rect.top - (area.y * rect.height);
                e.dataTransfer.setData('areaId', area.id);
                e.dataTransfer.setData('offsetX', offsetX);
                e.dataTransfer.setData('offsetY', offsetY);
                areaEl.style.opacity = '0.5';
            });
            
            areaEl.addEventListener('dragend', function(e) {
                areaEl.style.opacity = '1';
            });
            
            if (editingEnabled) {
                createResizeHandles(areaEl, area);
            }
            canvas.appendChild(areaEl);
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

    function getSensorLocation(position) {
        // Usar APENAS AreasModel (3 áreas ESP8266)
        const areas = AreasModel.getAreas();
        
        for (const area of areas) {
            if (position.x >= area.x && position.x <= (area.x + area.w) &&
                position.y >= area.y && position.y <= (area.y + area.h)) {
                return area.name;
            }
        }
        
        return "Área não mapeada";
    }

    function checkIfInRiskArea(position) {
        // Usar propriedade isRiskZone das áreas
        const areas = AreasModel.getAreas();
        const riskAreas = areas.filter(area => area.isRiskZone === true);
        
        for (const area of riskAreas) {
            if (position.x >= area.x && position.x <= (area.x + area.w) &&
                position.y >= area.y && position.y <= (area.y + area.h)) {
                return true;
            }
        }
        return false;
    }

    function calculateDistance(pos1, pos2) {
        const dx = pos1.x - pos2.x;
        const dy = pos1.y - pos2.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    function findNearbySensors(workerPosition, sensorPositions, maxDistance = 0.1) {
        const nearbySensors = [];
        for (const [sensorId, sensorPos] of Object.entries(sensorPositions)) {
            const distance = calculateDistance(workerPosition, sensorPos);
            if (distance <= maxDistance) {
                nearbySensors.push({ id: sensorId, distance: distance });
            }
        }
        return nearbySensors.sort((a, b) => a.distance - b.distance);
    }

    /**
     * Verifica se o colaborador tem acesso à área atual e registra alerta se necessário
     * @param {object} person - Dados do colaborador
     * @param {object} position - Posição atual
     * @returns {object} - {hasAccess: boolean, alert: object|null, areaInfo: object}
     */
    function checkAccessAuthorization(person, position) {
        if (!AccessControlModel) {
            return { hasAccess: true, alert: null, areaInfo: null };
        }

        // Detectar em qual área o colaborador está
        const areas = AreasModel.getAreas();
        let currentArea = null;
        
        for (const area of areas) {
            if (position.x >= area.x && position.x <= (area.x + area.w) &&
                position.y >= area.y && position.y <= (area.y + area.h)) {
                currentArea = area;
                break;
            }
        }

        if (!currentArea) {
            return { hasAccess: true, alert: null, areaInfo: null };
        }

        // Verificar permissão de acesso
        const accessCheck = AccessControlModel.checkAccess(person, currentArea.id);
        
        // Se não tem acesso e está em área restrita, registrar alerta
        if (!accessCheck.authorized && accessCheck.restricted) {
            const alert = AccessControlModel.registerAlert({
                type: 'UNAUTHORIZED_ACCESS',
                severity: 'HIGH',
                workerName: person.name,
                workerRole: person.role,
                deviceId: person.deviceId,
                areaId: currentArea.id,
                areaName: currentArea.name,
                riskLevel: accessCheck.riskLevel,
                position: position,
                reason: accessCheck.reason
            });
            
            return { hasAccess: false, alert: alert, areaInfo: currentArea };
        }

        return { hasAccess: true, alert: null, areaInfo: currentArea };
    }

    async function renderWorkers(){
        const canvas = document.getElementById('map-canvas');
        const workersList = document.getElementById('workers-list');
        
        if (!canvas || !workersList) return;

        // Remover workers existentes
        canvas.querySelectorAll('.worker-marker, .sensor-marker').forEach(el => el.remove());
        workersList.innerHTML = '';

        try {
            const people = await PeopleController.getAll();
            const devices = await DevicesController.getAll();
            const positions = await MapModel.getDevicePositions();

            let workersCount = 0;
            let sensorsCount = 0;
            let alertsCount = 0;

            // 1. Renderizar dispositivos vinculados a pessoas (workers)
            for (const person of people) {
                if (!person.deviceId) continue;

                const device = devices.find(d => d.id === person.deviceId);
                if (!device || !device.active) continue;

                const position = positions[person.deviceId];
                if (!position) continue;

                workersCount++;

                // Verificar autorização de acesso à área atual
                const accessAuth = checkAccessAuthorization(person, position);
                const unauthorizedAccess = !accessAuth.hasAccess;
                
                // Verificar se está em zona de perigo usando AreasModel
                const inDangerZone = checkIfInRiskArea(position);
                
                // Contabilizar alertas (zona de perigo OU acesso não autorizado)
                if (inDangerZone || unauthorizedAccess) alertsCount++;

                // Verificar proximidade com sensores fixos
                const sensorPositions = {};
                devices.filter(d => d.type === 'sensor' && d.active).forEach(s => {
                    if (positions[s.id]) {
                        sensorPositions[s.id] = positions[s.id];
                    }
                });
                const nearbySensors = findNearbySensors(position, sensorPositions);
                const detectedBySensor = nearbySensors.length > 0;

                // Criar marker no mapa (estilo original)
                const worker = document.createElement('div');
                // Adicionar classe especial se acesso não autorizado
                const accessClass = unauthorizedAccess ? 'worker-unauthorized' : '';
                worker.className = `worker-marker position-absolute ${inDangerZone ? 'worker-danger' : 'worker-safe'} ${accessClass}`;
                worker.style.left = (position.x * 100) + '%';
                worker.style.top = (position.y * 100) + '%';
                worker.style.transform = 'translate(-50%, -50%)';
                
                // Determinar cor do ícone baseado no status
                let iconColor = '#198754'; // Verde padrão (seguro)
                if (unauthorizedAccess) {
                    iconColor = '#ff6b00'; // Laranja para acesso não autorizado
                } else if (inDangerZone) {
                    iconColor = '#dc3545'; // Vermelho para zona de perigo
                }
                
                worker.innerHTML = `
                    <div class="worker-icon" style="width: 35px; height: 35px; border-radius: 50%; 
                         background: ${iconColor}; color: white; 
                         display: flex; align-items: center; justify-content: center; 
                         border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);
                         ${detectedBySensor ? 'box-shadow: 0 0 15px rgba(111, 66, 193, 0.6);' : ''}
                         ${unauthorizedAccess ? 'animation: pulse-warning 1.5s infinite;' : ''}">
                        <i class="bi bi-person-fill"></i>
                        ${detectedBySensor ? '<div style="position: absolute; top: -3px; right: -3px; width: 12px; height: 12px; background: #6f42c1; border-radius: 50%; border: 2px solid white;"></div>' : ''}
                        ${unauthorizedAccess ? '<div style="position: absolute; top: -3px; left: -3px; width: 12px; height: 12px; background: #ff6b00; border-radius: 50%; border: 2px solid white;"><i class="bi bi-exclamation-triangle-fill" style="font-size: 8px;"></i></div>' : ''}
                    </div>
                `;
                
                // Tooltip melhorado com informação de acesso
                let statusText = inDangerZone ? 'EM RISCO' : 'SEGURO';
                if (unauthorizedAccess) {
                    statusText = '🚫 ACESSO NÃO AUTORIZADO';
                }
                const areaText = accessAuth.areaInfo ? `\nÁrea: ${accessAuth.areaInfo.name}` : '';
                const accessText = unauthorizedAccess ? `\n⚠️ ${accessAuth.alert.reason}` : '';
                const sensorInfo = detectedBySensor ? `\nDetectado por: ${nearbySensors[0].id} (${(nearbySensors[0].distance * 100).toFixed(1)}m)` : '';
                
                worker.title = `${person.name} - ${person.role}\nDispositivo: ${device.id}\nStatus: ${statusText}${areaText}${accessText}${sensorInfo}`;
                canvas.appendChild(worker);

                // Adicionar na lista lateral
                const workerItem = document.createElement('div');
                const itemBorderClass = unauthorizedAccess ? 'border-warning' : (inDangerZone ? 'border-danger' : 'border-success');
                const itemBgClass = unauthorizedAccess ? 'bg-warning-subtle' : (inDangerZone ? 'bg-light' : 'bg-white');
                workerItem.className = `worker-item border rounded p-2 mb-2 ${itemBorderClass} ${itemBgClass}`;
                
                let badgeContent = '';
                if (unauthorizedAccess) {
                    badgeContent = '<span class="badge bg-warning text-dark small">🚫 SEM ACESSO</span>';
                } else if (inDangerZone) {
                    badgeContent = '<span class="badge bg-danger small">⚠️ RISCO</span>';
                } else {
                    badgeContent = '<span class="badge bg-success small">✅ OK</span>';
                }
                
                workerItem.innerHTML = `
                    <div class="d-flex justify-content-between align-items-center">
                        <div>
                            <div class="fw-bold small">${person.name} ${detectedBySensor ? '<i class="bi bi-broadcast text-purple"></i>' : ''}</div>
                            <div class="text-muted small">${person.role}</div>
                            <div class="text-muted small">ID: ${device.id}</div>
                            ${accessAuth.areaInfo ? `<div class="text-muted small">📍 ${accessAuth.areaInfo.name}</div>` : ''}
                            ${detectedBySensor ? `<div class="text-muted small">📡 Sensor: ${nearbySensors[0].id}</div>` : ''}
                            ${unauthorizedAccess ? `<div class="text-danger small fw-bold">⚠️ Acesso não autorizado!</div>` : ''}
                        </div>
                        ${badgeContent}
                    </div>
                `;
                workersList.appendChild(workerItem);
            }

            // 2. Renderizar sensores independentes (não vinculados a pessoas)
            const linkedDeviceIds = people.map(p => p.deviceId).filter(Boolean);
            
            for (const device of devices) {
                // Só renderizar sensores ativos que não estão vinculados a pessoas
                if (device.type !== 'sensor' || !device.active || linkedDeviceIds.includes(device.id)) continue;

                const position = positions[device.id];
                if (!position) continue;

                sensorsCount++;

                // Verificar se o sensor está em zona de risco (para destacar)
                const inRiskZone = checkIfInRiskArea(position);
                
                // Determinar localização do sensor usando AreasModel
                const sensorLocation = getSensorLocation(position);

                // Criar marker de sensor FIXO no mapa
                const sensor = document.createElement('div');
                sensor.className = 'sensor-marker position-absolute';
                sensor.style.left = (position.x * 100) + '%';
                sensor.style.top = (position.y * 100) + '%';
                sensor.style.transform = 'translate(-50%, -50%)';
                sensor.innerHTML = `
                    <div class="sensor-icon" style="width: 32px; height: 32px; border-radius: 6px; 
                         background: ${inRiskZone ? '#dc3545' : '#6f42c1'}; color: white; 
                         display: flex; align-items: center; justify-content: center; 
                         border: 3px solid white; box-shadow: 0 3px 6px rgba(0,0,0,0.4);
                         position: relative;">
                        <i class="bi bi-broadcast-pin" style="font-size: 14px;"></i>
                        <div style="position: absolute; top: -2px; right: -2px; width: 8px; height: 8px; 
                             background: #28a745; border-radius: 50%; border: 1px solid white;"></div>
                    </div>
                `;
                
                sensor.title = `Sensor Fixo: ${device.id}\nLocalização: ${sensorLocation}\nTipo: Detector de Proximidade\nStatus: ATIVO`;
                canvas.appendChild(sensor);

                // Adicionar na lista lateral
                const sensorItem = document.createElement('div');
                sensorItem.className = `sensor-item border rounded p-2 mb-2 ${inRiskZone ? 'border-warning bg-warning bg-opacity-10' : 'border-info bg-info bg-opacity-10'}`;
                sensorItem.innerHTML = `
                    <div class="d-flex justify-content-between align-items-center">
                        <div>
                            <div class="fw-bold small">${device.id} <small class="text-muted">(FIXO)</small></div>
                            <div class="text-muted small">${sensorLocation}</div>
                            <div class="text-muted small">Monitor de Proximidade</div>
                        </div>
                        <span class="badge ${inRiskZone ? 'bg-warning' : 'bg-info'} small">
                            <i class="bi bi-broadcast-pin"></i> SENSOR
                        </span>
                    </div>
                `;
                workersList.appendChild(sensorItem);
            }

            // Atualizar contadores
            document.getElementById('total-workers').textContent = workersCount;
            document.getElementById('total-sensors').textContent = sensorsCount;
            document.getElementById('total-devices').textContent = workersCount + sensorsCount;
            document.getElementById('risk-alerts').textContent = alertsCount;

            await renderSafetyAlerts(alertsCount);
            await renderAccessAlerts();

            console.log(`[MonitoringView] Métricas -> colaboradores: ${workersCount}, sensores: ${sensorsCount}, alertas: ${alertsCount}`);

        } catch (error) {
            console.error('Erro ao renderizar workers:', error);
        }
    }

    async function renderAccessAlerts() {
        const alertsContainer = document.getElementById('access-alerts');
        if (!alertsContainer || !AccessControlModel) return;

        const alerts = AccessControlModel.getAlerts();
        
        if (alerts.length === 0) {
            alertsContainer.innerHTML = `
                <div class="alert alert-success alert-sm mb-0 py-2">
                    <i class="bi bi-check-circle me-1"></i>
                    <small>Todos os acessos autorizados</small>
                </div>
            `;
            return;
        }

        // Mostrar apenas os últimos 5 alertas mais recentes
        const recentAlerts = alerts.slice(0, 5);
        
        alertsContainer.innerHTML = recentAlerts.map(alert => {
            const timeAgo = getTimeAgo(new Date(alert.timestamp));
            return `
                <div class="alert alert-warning alert-sm mb-2 py-2">
                    <div class="d-flex justify-content-between align-items-start">
                        <div class="flex-grow-1">
                            <div class="fw-bold small">🚫 ${alert.workerName}</div>
                            <div class="text-muted small">${alert.workerRole}</div>
                            <div class="text-danger small">${alert.areaName}</div>
                            <div class="text-muted small">${timeAgo}</div>
                        </div>
                        <span class="badge bg-warning text-dark small">${alert.riskLevel}</span>
                    </div>
                </div>
            `;
        }).join('');
    }

    function getTimeAgo(date) {
        const seconds = Math.floor((new Date() - date) / 1000);
        
        if (seconds < 60) return `${seconds}s atrás`;
        if (seconds < 3600) return `${Math.floor(seconds / 60)}min atrás`;
        if (seconds < 86400) return `${Math.floor(seconds / 3600)}h atrás`;
        return `${Math.floor(seconds / 86400)}d atrás`;
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

    function showRestrictedAreasModal() {
        const modalContent = document.getElementById('restricted-areas-content');
        if (!modalContent || !AccessControlModel) return;

        const restrictedAreas = AccessControlModel.getRestrictedAreas();
        
        let html = `
            <div class="alert alert-warning">
                <i class="bi bi-info-circle me-2"></i>
                <strong>Sistema de Controle de Acesso Ativo</strong>
                <p class="mb-0 small">Apenas colaboradores autorizados podem acessar áreas restritas. Acessos não autorizados geram alertas automáticos.</p>
            </div>
            
            <h6 class="text-danger mb-3">
                <i class="bi bi-exclamation-triangle-fill me-2"></i>Áreas de Alto Risco (${restrictedAreas.length})
            </h6>
        `;

        restrictedAreas.forEach(area => {
            html += `
                <div class="card mb-3 border-danger">
                    <div class="card-header bg-danger text-white">
                        <h6 class="mb-0">${area.icon} ${area.name}</h6>
                    </div>
                    <div class="card-body">
                        <p class="mb-2"><strong>Nível de Risco:</strong> <span class="badge bg-danger">${area.riskLevel}</span></p>
                        <p class="mb-2"><strong>Funções Autorizadas:</strong></p>
                        <div class="d-flex flex-wrap gap-1">
                            ${area.authorizedRoles.map(role => 
                                `<span class="badge bg-success">${role}</span>`
                            ).join('')}
                        </div>
                        <div class="alert alert-warning mt-2 mb-0 py-2">
                            <small><i class="bi bi-shield-exclamation me-1"></i> Acesso restrito - EPIs obrigatórios</small>
                        </div>
                    </div>
                </div>
            `;
        });

        html += `
            <div class="alert alert-info mt-3">
                <h6 class="mb-2">📋 Outras Áreas</h6>
                <p class="mb-1 small"><strong>Áreas Produtivas:</strong> Requerem funções específicas (Pedreiro, Mecânico, etc.)</p>
                <p class="mb-1 small"><strong>Áreas Administrativas e Sociais:</strong> Acesso livre para todos os colaboradores</p>
                <p class="mb-0 small"><i class="bi bi-check-circle me-1"></i> Sistema monitora acessos em tempo real</p>
            </div>
        `;

        modalContent.innerHTML = html;
        
        // Abrir modal usando Bootstrap 5
        const modal = new bootstrap.Modal(document.getElementById('restrictedAreasModal'));
        modal.show();
    }

    async function render(){
        if (!root) {
            console.error('Elemento view-root não encontrado');
            return;
        }
        
        root.innerHTML = template();
        await renderMap();
        
        // Event listener para botão de áreas restritas
        const btnRestrictedAreas = document.getElementById('btn-show-restricted-areas');
        if (btnRestrictedAreas) {
            btnRestrictedAreas.addEventListener('click', showRestrictedAreasModal);
        }
        
        // Limpar intervalo anterior se existir
        if (monitoringInterval) {
            clearInterval(monitoringInterval);
            console.log('🛑 Intervalo anterior limpo');
        }
        
        // Atualizar trabalhadores a cada 3 segundos
        monitoringInterval = setInterval(async () => {
            await renderWorkers();
        }, 3000);
        
        // ✅ ATUALIZAR MAPA A CADA 5 SEGUNDOS (status das áreas)
        if (mapRefreshInterval) {
            clearInterval(mapRefreshInterval);
        }
        mapRefreshInterval = setInterval(async () => {
            console.log('🗺️ Atualizando status das áreas...');
            await renderMap();
        }, 5000);
        
        console.log('✅ Monitoramento iniciado - Trabalhadores: 3s | Áreas: 5s');
    }
    
    // Função para limpar o monitoramento ao sair da view
    function cleanup() {
        if (monitoringInterval) {
            clearInterval(monitoringInterval);
            monitoringInterval = null;
        }
        if (mapRefreshInterval) {
            clearInterval(mapRefreshInterval);
            mapRefreshInterval = null;
        }
        console.log('🧹 Monitoramento limpo');
    }

    return { render, cleanup };
})();