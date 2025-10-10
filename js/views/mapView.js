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
        
        // Zonas padrão para demonstração
        const zones = [
            { id: 'z1', name: 'Área de Risco 1', x: 0.3, y: 0.3, r: 0.1 },
            { id: 'z2', name: 'Área de Risco 2', x: 0.7, y: 0.7, r: 0.15 }
        ];
        
        // Desenhar zonas
        for (const z of zones){
            const el = document.createElement('div');
            el.className = 'zone position-absolute border border-warning rounded';
            el.style.left = (z.x * 100) + '%';
            el.style.top = (z.y * 100) + '%';
            el.style.width = (z.r * 2 * 100) + '%';
            el.style.height = (z.r * 2 * 100) + '%';
            el.style.backgroundColor = 'rgba(245, 158, 11, 0.2)';
            el.title = z.name;
            canvas.appendChild(el);
        }

        // Dispositivos de exemplo
        const devices = [
            { id: 'D001', type: 'worker' },
            { id: 'D002', type: 'worker' }
        ];

        // Posições de exemplo
        const positions = {
            'D001': { x: 0.2, y: 0.2 },
            'D002': { x: 0.8, y: 0.8 }
        };

        // Desenhar marcadores
        for (const device of devices){
            const pos = positions[device.id];
            if (!pos) continue;
            
            const el = document.createElement('div');
            el.className = 'marker position-absolute d-flex align-items-center justify-content-center';
            el.style.left = (pos.x * 100) + '%';
            el.style.top = (pos.y * 100) + '%';
            
            // Verificar se está em zona de risco
            const inZone = zones.some(z => {
                const dx = pos.x - z.x;
                const dy = pos.y - z.y;
                return Math.sqrt(dx * dx + dy * dy) <= z.r;
            });
            
            if (inZone) {
                el.classList.add('bg-danger', 'text-white');
            } else {
                el.classList.add('bg-success', 'text-white');
            }
            
            el.innerHTML = `<span class="fw-bold">${device.id}</span>`;
            el.title = `${device.id} - ${inZone ? 'EM RISCO' : 'Seguro'}`;
            canvas.appendChild(el);
        }
    }

    function renderDevicesList(){
        const node = document.getElementById('devices-list');
        if (!node) return;
        
        const devices = [
            { id: 'D001', type: 'worker' },
            { id: 'D002', type: 'worker' }
        ];
        
        if (devices.length === 0){ 
            node.innerHTML = '<div class="alert alert-info py-2">Nenhum dispositivo cadastrado.</div>'; 
            return; 
        }
        
        node.innerHTML = '';
        for (const device of devices){
            const div = document.createElement('div');
            div.className = 'd-flex justify-content-between align-items-center p-2 mb-2 border rounded bg-light';
            div.innerHTML = `
                <div>
                    <strong class="small">${device.id}</strong>
                    <div class="extra-small">Dispositivo de Trabalhador</div>
                </div>
                <div class="text-end">
                    <span class="badge bg-success">SAFE</span>
                    <div class="extra-small">Posição simulada</div>
                </div>
            `;
            node.appendChild(div);
        }
    }

    function bindControls(){
        const btnMove = document.getElementById('btn-sim-move');
        const btnReset = document.getElementById('btn-reset-positions');
        const btnRandomize = document.getElementById('btn-randomize');
        
        if (btnMove) {
            btnMove.addEventListener('click', () => {
                alert('Funcionalidade de movimento será implementada');
            });
        }
        
        if (btnReset) {
            btnReset.addEventListener('click', () => {
                alert('Posições resetadas');
                renderMap();
            });
        }
        
        if (btnRandomize) {
            btnRandomize.addEventListener('click', () => {
                alert('Posições randomizadas');
                renderMap();
            });
        }
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