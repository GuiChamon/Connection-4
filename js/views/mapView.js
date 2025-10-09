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
              <div class="card-header bg-white">
                <h5 class="card-title mb-0">🗺️ Mapa de Monitoramento</h5>
              </div>
              <div class="card-body p-0">
                <div class="map-container position-relative bg-light border rounded" style="height: 500px;">
                  <div class="map-canvas position-absolute w-100 h-100" id="map-canvas" aria-label="mapa-simulado">
                    <!-- zones and markers injected here -->
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Controles -->
          <div class="col-lg-4">
            <div class="card shadow-sm border-0">
              <div class="card-header bg-white">
                <h5 class="card-title mb-0">🎮 Controles</h5>
              </div>
              <div class="card-body">
                <p class="text-muted small mb-3">Atualize posições dos dispositivos manualmente para simular movimento. Quando um marcador entrar numa zona, ficará em estado de risco.</p>
                
                <div class="mb-4">
                  <h6 class="text-primary mb-3">📱 Dispositivos</h6>
                  <div id="devices-list" class="list"></div>
                </div>

                <hr>

                <div class="mb-4">
                  <h6 class="text-primary mb-3">🎯 Mover Dispositivo</h6>
                  <div class="row g-2 mb-2">
                    <div class="col-12">
                      <input type="text" class="form-control form-control-sm" id="sim-device-id" placeholder="Device ID (ex: D123)">
                    </div>
                    <div class="col-6">
                      <input type="number" class="form-control form-control-sm" id="sim-x" placeholder="X (0..1)" step="0.01" min="0" max="1">
                    </div>
                    <div class="col-6">
                      <input type="number" class="form-control form-control-sm" id="sim-y" placeholder="Y (0..1)" step="0.01" min="0" max="1">
                    </div>
                    <div class="col-12">
                      <button id="btn-sim-move" class="btn btn-primary btn-sm w-100">Mover Dispositivo</button>
                    </div>
                  </div>
                </div>

                <div class="d-grid gap-2">
                  <button id="btn-reset-positions" class="btn btn-warning btn-sm">🔄 Resetar Posições</button>
                  <button id="btn-randomize" class="btn btn-secondary btn-sm">🎲 Randomizar Posições</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  function render(){
    root.innerHTML = template();
    renderMap();
    renderDevicesList();
    bindControls();
  }

  function renderMap(){
    const canvas = document.getElementById('map-canvas');
    canvas.innerHTML = ''; // clear
    const zones = MapModel.loadZones();
    
    // draw zones as divs with absolute pos on canvas
    for (const z of zones){
      const el = document.createElement('div');
      el.className = 'zone position-absolute border border-danger rounded';
      el.style.left = (z.x*100) + '%';
      el.style.top = (z.y*100) + '%';
      el.style.width = (z.r*2*100) + '%';
      el.style.height = (z.r*2*100) + '%';
      el.style.backgroundColor = 'rgba(220, 53, 69, 0.2)';
      el.title = z.name;
      canvas.appendChild(el);
    }

    // draw markers for devices present in positions
    const positions = MapModel.getDevicePositions();
    const devices = DevicesModel.all();
    for (const d of devices){
      const pos = positions[d.id];
      if (!pos) continue;
      const person = PeopleModel.findByDevice(d.id);
      const el = document.createElement('div');
      el.className = 'marker position-absolute d-flex align-items-center justify-content-center';
      el.style.left = (pos.x*100) + '%';
      el.style.top = (pos.y*100) + '%';
      
      // determine if in zone
      const zonesList = MapModel.loadZones();
      const inZone = zonesList.some(z=>MapModel.pointInZone(pos.x, pos.y, z));
      
      if (inZone) {
        el.classList.add('bg-danger', 'text-white');
        el.innerHTML = `<span class="fw-bold">${person ? (person.name.split(' ').map(s=>s[0]).slice(0,2).join('')) : d.id}</span>`;
      } else {
        el.classList.add('bg-success', 'text-white');
        el.innerHTML = `<span class="fw-bold">${person ? (person.name.split(' ').map(s=>s[0]).slice(0,2).join('')) : d.id}</span>`;
      }
      
      el.title = (person ? person.name + ' ('+d.id +')' : d.id) + (inZone ? ' - EM PERIGO' : ' - seguro');
      canvas.appendChild(el);
    }
  }

  function renderDevicesList(){
    const node = document.getElementById('devices-list');
    const devices = DevicesModel.all();
    const positions = MapModel.getDevicePositions();
    
    if (devices.length === 0){ 
      node.innerHTML = '<div class="alert alert-info py-2">Nenhum dispositivo cadastrado.</div>'; 
      return; 
    }
    
    node.innerHTML = '';
    for (const d of devices){
      const pos = positions[d.id];
      const person = PeopleModel.findByDevice(d.id);
      const zonesList = MapModel.loadZones();
      const inZone = pos ? zonesList.some(z=>MapModel.pointInZone(pos.x, pos.y, z)) : false;
      
      const div = document.createElement('div');
      div.className = `d-flex justify-content-between align-items-center p-2 mb-2 border rounded ${inZone ? 'bg-danger text-white' : 'bg-light'}`;
      div.innerHTML = `
        <div>
          <strong class="small">${d.id}</strong>
          <div class="extra-small">${person ? person.name : 'Sem pessoa'}</div>
        </div>
        <div class="text-end">
          <span class="badge ${inZone ? 'bg-warning' : 'bg-success'}">${inZone ? 'PERIGO' : 'SAFE'}</span>
          <div class="extra-small">${pos ? `x:${pos.x.toFixed(2)} y:${pos.y.toFixed(2)}` : 'Sem posição'}</div>
        </div>
      `;
      node.appendChild(div);
    }
  }

  function bindControls(){
    document.getElementById('btn-sim-move').addEventListener('click', ()=>{
      const id = document.getElementById('sim-device-id').value.trim();
      const x = parseFloat(document.getElementById('sim-x').value);
      const y = parseFloat(document.getElementById('sim-y').value);
      if (!id || isNaN(x) || isNaN(y) || x<0 || x>1 || y<0 || y>1){ 
        alert('Informe device e coords válidas (0..1).'); 
        return; 
      }
      MapModel.setDevicePosition(id, x, y);
      renderMap();
      renderDevicesList();
    });
    
    document.getElementById('btn-reset-positions').addEventListener('click', ()=>{
      if (confirm('Resetar posições dos dispositivos?')){ 
        MapModel.resetDevicePositions(); 
        renderMap(); 
        renderDevicesList(); 
      }
    });
    
    document.getElementById('btn-randomize').addEventListener('click', ()=>{
      const devices = DevicesModel.all();
      for (const d of devices){
        MapModel.setDevicePosition(d.id, Math.random()*0.95+0.025, Math.random()*0.95+0.025);
      }
      renderMap(); 
      renderDevicesList();
    });
  }

  return { render };
})();