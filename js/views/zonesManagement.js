// js/views/zonesManagement.js - Gestão de Áreas
const ZonesManagementView = (function(){
    const API_URL = 'http://localhost:3000/api/zones';
    let refreshInterval = null;  // Intervalo de atualização automática
    
    // helper local: normaliza coordenadas para 2 casas decimais e limita 0..1
    function normalizeCoordLocal(v) {
        if (v === undefined || v === null) return v;
        const n = Number(parseFloat(v));
        if (Number.isNaN(n)) return 0;
        const clamped = Math.min(1, Math.max(0, n));
        return Number(clamped.toFixed(2));
    }

    // Converte números no formato local (vírgula) para Number (ponto decimal)
    function parseLocaleNumber(s) {
        if (s === undefined || s === null) return NaN;
        if (typeof s === 'number') return s;
        const str = String(s).trim().replace(',', '.');
        const n = parseFloat(str);
        return Number.isNaN(n) ? NaN : n;
    }
    
    function template(){
        return `
        <div class="col-12">
            <!-- Cabeçalho -->
            <div class="d-flex justify-content-between align-items-center mb-4">
                <div>
                    <h2 class="h4 text-dark mb-1">
                        <i class="bi bi-map text-primary me-2"></i>Gestão de Áreas do Canteiro
                    </h2>
                    <p class="text-muted mb-0">Cadastre e gerencie áreas de trabalho e zonas de risco</p>
                </div>
                <button class="btn btn-primary" id="btn-new-zone">
                    <i class="bi bi-plus-circle me-2"></i>Nova Área
                </button>
            </div>

            <!-- Grid com Lista e Formulário -->
            <div class="row">
                <!-- Lista de Áreas -->
                <div class="col-lg-8 mb-4">
                    <div class="card border-0 shadow-sm">
                        <div class="card-header">
                            <h5 class="card-title mb-0 text-white">
                                <i class="bi bi-list-ul me-2"></i>Áreas Cadastradas
                                <span class="badge bg-light text-primary ms-2" id="zones-count">0</span>
                            </h5>
                        </div>
                        <div class="card-body" style="max-height: 600px; overflow-y: auto;">
                            <div id="zones-list">
                                <div class="text-center text-muted py-4">
                                    <i class="bi bi-inbox fs-1"></i>
                                    <p class="mt-2">Carregando áreas...</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Formulário de Criação/Edição -->
                <div class="col-lg-4 mb-4">
                    <div class="card border-0 shadow-sm sticky-top" style="top: 20px;">
                        <div class="card-header">
                            <h5 class="card-title mb-0 text-white" id="form-title">
                                <i class="bi bi-plus-square me-2"></i>Nova Área
                            </h5>
                        </div>
                        <div class="card-body">
                            <form id="zone-form">
                                <input type="hidden" id="zone-edit-id">
                                
                                <div class="mb-3">
                                    <label for="zone-id" class="form-label">ID da Área *</label>
                                    <input type="text" class="form-control" id="zone-id" placeholder="Ex: escritorio, guarita" required>
                                    <small class="form-text text-muted">Apenas letras minúsculas, números e underscore</small>
                                </div>

                                <div class="mb-3">
                                    <label for="zone-name" class="form-label">Nome da Área *</label>
                                    <input type="text" class="form-control" id="zone-name" placeholder="Ex: Escritório Central" required>
                                </div>

                                <div class="row">
                                    <div class="col-6 mb-3">
                                        <label for="zone-x" class="form-label">Posição X *</label>
                                        <input type="number" step="any" min="0" max="1" class="form-control" id="zone-x" value="0.10" required inputmode="decimal">
                                    </div>
                                    <div class="col-6 mb-3">
                                        <label for="zone-y" class="form-label">Posição Y *</label>
                                        <input type="number" step="any" min="0" max="1" class="form-control" id="zone-y" value="0.10" required inputmode="decimal">
                                    </div>
                                </div>

                                <div class="row">
                                    <div class="col-6 mb-3">
                                        <label for="zone-width" class="form-label">Largura *</label>
                                        <input type="number" step="any" min="0.05" max="0.5" class="form-control" id="zone-width" value="0.10" required inputmode="decimal">
                                    </div>
                                    <div class="col-6 mb-3">
                                        <label for="zone-height" class="form-label">Altura *</label>
                                        <input type="number" step="any" min="0.05" max="0.5" class="form-control" id="zone-height" value="0.10" required inputmode="decimal">
                                    </div>
                                </div>

                                <div class="row">
                                    <div class="col-6 mb-3">
                                        <label for="zone-color" class="form-label">Cor</label>
                                        <input type="color" class="form-control form-control-color" id="zone-color" value="#28a745">
                                    </div>
                                    <div class="col-6 mb-3">
                                        <label for="zone-icon" class="form-label">Ícone</label>
                                        <input type="text" class="form-control" id="zone-icon" placeholder="📍" maxlength="2">
                                    </div>
                                </div>

                                <div class="mb-3">
                                    <label for="zone-device" class="form-label">Dispositivo ESP8266</label>
                                    <select class="form-select" id="zone-device">
                                        <option value="">-- Sem dispositivo --</option>
                                        <option value="entrada">entrada (Portaria)</option>
                                        <option value="risco1">risco1 (Área Risco 1)</option>
                                        <option value="risco2">risco2 (Área Risco 2)</option>
                                    </select>
                                </div>

                                <div class="mb-3 form-check">
                                    <input type="checkbox" class="form-check-input" id="zone-risk">
                                    <label class="form-check-label" for="zone-risk">
                                        <i class="bi bi-exclamation-triangle text-warning"></i> Zona de Risco
                                    </label>
                                </div>

                                <div class="mb-3">
                                    <label for="zone-risk-level" class="form-label">Nível de Risco</label>
                                    <select class="form-select" id="zone-risk-level">
                                        <option value="none">Nenhum</option>
                                        <option value="low">Baixo</option>
                                        <option value="medium">Médio</option>
                                        <option value="high">Alto</option>
                                        <option value="critical">Crítico</option>
                                    </select>
                                </div>

                                <div class="mb-3">
                                    <label for="zone-description" class="form-label">Descrição</label>
                                    <textarea class="form-control" id="zone-description" rows="2" placeholder="Descreva a área..."></textarea>
                                </div>

                                <div class="d-grid gap-2">
                                    <button type="submit" class="btn btn-primary" id="btn-save-zone">
                                        <i class="bi bi-check-lg me-1"></i>Salvar Área
                                    </button>
                                    <button type="button" class="btn btn-outline-secondary" id="btn-cancel-zone">
                                        <i class="bi bi-x-lg me-1"></i>Cancelar
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        `;
    }

    async function loadZones() {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(API_URL, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            const result = await response.json();
            
            if (result.success && result.data) {
                await renderZonesList(result.data);
                document.getElementById('zones-count').textContent = result.data.length;
            }
        } catch (error) {
            console.error('❌ Erro ao carregar áreas:', error);
            document.getElementById('zones-list').innerHTML = `
                <div class="alert alert-danger">
                    <i class="bi bi-exclamation-triangle me-2"></i>Erro ao carregar áreas: ${error.message}
                </div>
            `;
        }
    }

    async function renderZonesList(zones) {
        const container = document.getElementById('zones-list');
        // Buscar devices para avaliar `device.active` quando houver deviceId
        let devices = [];
        try {
            devices = await DevicesController.getAll();
        } catch (err) {
            console.warn('Não foi possível obter dispositivos para avaliação de status:', err);
            devices = [];
        }
        
        if (!zones || zones.length === 0) {
            container.innerHTML = `
                <div class="text-center text-muted py-4">
                    <i class="bi bi-inbox fs-1"></i>
                    <p class="mt-2">Nenhuma área cadastrada</p>
                    <button class="btn btn-primary btn-sm" onclick="document.getElementById('btn-new-zone').click()">
                        <i class="bi bi-plus-circle me-1"></i>Criar primeira área
                    </button>
                </div>
            `;
            return;
        }

        container.innerHTML = zones.map(zone => {
            // Determinar status de conexão
            let deviceActiveFlag = true;
            if (zone.deviceId) {
                const linked = devices.find(d => d.id && d.id.toLowerCase() === String(zone.deviceId).toLowerCase());
                deviceActiveFlag = linked ? (linked.active === true) : true;
            }

            const isOnline = deviceActiveFlag && zone.currentlyActive && zone.connectionStatus === 'online';
            const statusBadge = zone.deviceId ? (
                isOnline 
                    ? '<span class="badge bg-success ms-2" style="font-size:0.95rem; padding:.45rem .6rem; border-radius:12px; font-weight:600;"><i class="bi bi-circle-fill me-1"></i> CONECTADA</span>'
                    : '<span class="badge bg-secondary ms-2" style="font-size:0.95rem; padding:.45rem .6rem; border-radius:12px; font-weight:600;"><i class="bi bi-circle me-1"></i> DESCONNECTADA</span>'
            ) : '';
            
            return `
            <div class="card mb-2 zone-card ${isOnline ? 'border-success' : ''}" data-zone-id="${zone.id}" style="${isOnline ? 'border-width: 2px !important;' : ''}">
                <div class="card-body p-3">
                    <div class="d-flex justify-content-between align-items-start">
                        <div class="flex-grow-1">
                            <h6 class="mb-1">
                                <span style="font-size: 1.2em;">${zone.icon || '📍'}</span>
                                ${zone.name}
                                ${zone.isRiskZone ? '<span class="badge bg-danger ms-2">Risco</span>' : ''}
                                ${isOnline ? '<i class="bi bi-broadcast text-success ms-1" title="Em uso agora"></i>' : ''}
                            </h6>
                            <p class="mb-1 small text-muted">
                                <strong>ID:</strong> ${zone.id} 
                                ${zone.deviceId ? `<span class="badge bg-info text-dark ms-2">📡 ${zone.deviceId}</span>` : ''}
                                ${statusBadge}
                            </p>
                            <p class="mb-1 small">
                                <span class="badge" style="background-color: ${zone.color}20; color: ${zone.color}; border: 1px solid ${zone.color};">
                                    Cor: ${zone.color}
                                </span>
                                <span class="badge bg-light text-dark ms-1">Pos: (${zone.x.toFixed(2)}, ${zone.y.toFixed(2)})</span>
                                <span class="badge bg-light text-dark ms-1">Tam: ${zone.width.toFixed(2)}×${zone.height.toFixed(2)}</span>
                            </p>
                            ${zone.description ? `<p class="mb-0 small text-muted">${zone.description}</p>` : ''}
                        </div>
                        <div class="btn-group-vertical ms-2">
                            <button class="btn btn-sm btn-outline-primary" onclick="ZonesManagementView.editZone('${zone.id}')">
                                <i class="bi bi-pencil"></i>
                            </button>
                            <button class="btn btn-sm btn-outline-danger" onclick="ZonesManagementView.deleteZone('${zone.id}', '${zone.name}')">
                                <i class="bi bi-trash"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        }).join('');
    }

    async function saveZone(formData) {
        try {
            const token = localStorage.getItem('token');
            const editId = document.getElementById('zone-edit-id').value;
            const isEdit = !!editId;
            
            console.log('💾 Tentando salvar área:', formData);
            console.log('🔑 Token presente:', !!token);
            console.log('📝 Modo:', isEdit ? 'EDITAR' : 'CRIAR');
            
            const url = isEdit ? `${API_URL}/${editId}` : API_URL;
            const method = isEdit ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(formData)
            });

            console.log('📡 Response status:', response.status);
            
            if (!response.ok) {
                const error = await response.json();
                console.error('❌ Erro do backend:', error);
                throw new Error(error.message || 'Erro ao salvar área');
            }

            const result = await response.json();
            
            if (result.success) {
                alert(`✅ Área ${isEdit ? 'atualizada' : 'criada'} com sucesso!`);
                document.getElementById('zone-form').reset();
                document.getElementById('zone-edit-id').value = '';
                document.getElementById('form-title').innerHTML = '<i class="bi bi-plus-square me-2"></i>Nova Área';
                await loadZones();
                await AreasModel.refreshAreas(); // Atualizar cache do AreasModel
            }
        } catch (error) {
            console.error('❌ Erro ao salvar área:', error);
            alert('❌ Erro ao salvar área: ' + error.message);
        }
    }

    async function editZone(zoneId) {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_URL}/${zoneId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) throw new Error('Área não encontrada');

            const result = await response.json();
            const zone = result.data;

            // Preencher formulário
            document.getElementById('zone-edit-id').value = zone.id;
            document.getElementById('zone-id').value = zone.id;
            document.getElementById('zone-id').disabled = true; // ID não pode ser editado
            document.getElementById('zone-name').value = zone.name;
            document.getElementById('zone-x').value = (zone.x !== undefined && zone.x !== null) ? zone.x.toFixed(2) : '';
            document.getElementById('zone-y').value = (zone.y !== undefined && zone.y !== null) ? zone.y.toFixed(2) : '';
            document.getElementById('zone-width').value = (zone.width !== undefined && zone.width !== null) ? zone.width.toFixed(2) : '';
            document.getElementById('zone-height').value = (zone.height !== undefined && zone.height !== null) ? zone.height.toFixed(2) : '';
            document.getElementById('zone-color').value = zone.color;
            document.getElementById('zone-icon').value = zone.icon || '';
            document.getElementById('zone-device').value = zone.deviceId || '';
            document.getElementById('zone-risk').checked = zone.isRiskZone;
            document.getElementById('zone-risk-level').value = zone.riskLevel || 'none';
            document.getElementById('zone-description').value = zone.description || '';

            document.getElementById('form-title').innerHTML = '<i class="bi bi-pencil-square me-2"></i>Editar Área';
            
            // Scroll para o formulário
            document.getElementById('zone-form').scrollIntoView({ behavior: 'smooth' });
        } catch (error) {
            console.error('❌ Erro ao carregar área:', error);
            alert('❌ Erro ao carregar área: ' + error.message);
        }
    }

    async function deleteZone(zoneId, zoneName) {
        if (!confirm(`Tem certeza que deseja deletar a área "${zoneName}"?`)) {
            return;
        }

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_URL}/${zoneId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) throw new Error('Erro ao deletar área');

            const result = await response.json();
            
            if (result.success) {
                alert('✅ Área deletada com sucesso!');
                await loadZones();
                await AreasModel.refreshAreas();
            }
        } catch (error) {
            console.error('❌ Erro ao deletar área:', error);
            alert('❌ Erro ao deletar área: ' + error.message);
        }
    }

    function attachEventListeners() {
        // Botão Nova Área
        document.getElementById('btn-new-zone').addEventListener('click', () => {
            document.getElementById('zone-form').reset();
            document.getElementById('zone-edit-id').value = '';
            document.getElementById('zone-id').disabled = false;
            document.getElementById('form-title').innerHTML = '<i class="bi bi-plus-square me-2"></i>Nova Área';
        });

        // Botão Cancelar
        document.getElementById('btn-cancel-zone').addEventListener('click', () => {
            document.getElementById('zone-form').reset();
            document.getElementById('zone-edit-id').value = '';
            document.getElementById('zone-id').disabled = false;
            document.getElementById('form-title').innerHTML = '<i class="bi bi-plus-square me-2"></i>Nova Área';
        });

        // Submit do formulário
        document.getElementById('zone-form').addEventListener('submit', async (e) => {
            e.preventDefault();

            const rawX = parseLocaleNumber(document.getElementById('zone-x').value);
            const rawY = parseLocaleNumber(document.getElementById('zone-y').value);
            const rawW = parseLocaleNumber(document.getElementById('zone-width').value);
            const rawH = parseLocaleNumber(document.getElementById('zone-height').value);

            const formData = {
                id: document.getElementById('zone-id').value,
                name: document.getElementById('zone-name').value,
                x: normalizeCoordLocal(rawX),
                y: normalizeCoordLocal(rawY),
                width: Number(Math.min(1, Math.max(0.01, rawW)).toFixed(2)),
                height: Number(Math.min(1, Math.max(0.01, rawH)).toFixed(2)),
                color: document.getElementById('zone-color').value,
                icon: document.getElementById('zone-icon').value || '📍',
                deviceId: document.getElementById('zone-device').value || null,
                isRiskZone: document.getElementById('zone-risk').checked,
                riskLevel: document.getElementById('zone-risk-level').value,
                description: document.getElementById('zone-description').value
            };

            await saveZone(formData);
        });
    }

    async function render() {
        const root = document.getElementById('view-root');
        root.innerHTML = template();
        attachEventListeners();
        await loadZones();
        
        // ✅ INICIAR AUTO-REFRESH A CADA 3 SEGUNDOS
        console.log('🔄 Iniciando auto-refresh das áreas (3s)');
        refreshInterval = setInterval(async () => {
            console.log('🔄 Atualizando lista de áreas...');
            await loadZones();
        }, 3000);
    }
    
    function cleanup() {
        console.log('🧹 Limpando ZonesManagementView');
        if (refreshInterval) {
            clearInterval(refreshInterval);
            refreshInterval = null;
            console.log('⏹️ Auto-refresh parado');
        }
    }

    return {
        render,
        cleanup,
        editZone,
        deleteZone
    };
})();
