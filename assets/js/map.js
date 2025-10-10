// mapa simples usando Leaflet (CDN incluo no HTML)
const sensors = [
  { id: 'S1', name: 'Entrada A', lat: -23.55052, lng: -46.633308, status: 'OK', lastSeen: '2025-10-09 08:00' },
  { id: 'S2', name: 'Torre 1', lat: -23.5510, lng: -46.6345, status: 'Alerta', lastSeen: '2025-10-09 09:12' },
  { id: 'S3', name: 'Saida B', lat: -23.5495, lng: -46.6320, status: 'OK', lastSeen: '2025-10-09 07:40' }
];

const map = L.map('map').setView([-23.55052, -46.633308], 17);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '© OpenStreetMap contributors'
}).addTo(map);

const sensorListEl = document.getElementById('sensorList');
const infoEl = document.getElementById('info');
const centerAllBtn = document.getElementById('centerAll');

const markers = [];

sensorListEl.innerHTML = '';
sensors.forEach(s => {
  const color = s.status === 'Alerta' ? '#ff6b6b' : '#29a745';
  const marker = L.circleMarker([s.lat, s.lng], { radius:10, color: color, fillColor: color, fillOpacity:0.3 }).addTo(map);
  marker.bindPopup(`<strong>${s.name}</strong><br/>ID: ${s.id}<br/>Status: ${s.status}<br/>Última vez: ${s.lastSeen}`);
  marker.on('click', () => {
    infoEl.innerHTML = `<strong>${s.name}</strong><br/>ID: ${s.id}<br/>Status: ${s.status}<br/>Última vez: ${s.lastSeen}`;
    marker.openPopup();
  });
  markers.push(marker);

  const item = document.createElement('div');
  item.className = 'sensor-item';
  const statusBadge = `<span class="badge" style="background:${s.status==='Alerta'? 'rgba(255,107,107,0.12)': 'rgba(41,167,69,0.12)'}; color:${s.status==='Alerta'? '#b91c1c':'#14532d'}; font-weight:700;">${s.status}</span>`;
  item.innerHTML = `<div><strong>${s.name}</strong><small>${s.id} · Última: ${s.lastSeen}</small></div><div style="display:flex;gap:10px;align-items:center">${statusBadge}<button class="btn ghost" data-id="${s.id}">Centralizar</button></div>`;
  const btn = item.querySelector('button');
  btn.addEventListener('click', () => { map.setView([s.lat, s.lng], 18); marker.openPopup(); });
  sensorListEl.appendChild(item);
});

if(centerAllBtn){
  centerAllBtn.addEventListener('click', ()=>{
    const group = L.featureGroup(markers);
    map.fitBounds(group.getBounds().pad(0.3));
  });
}

infoEl.innerText = 'Clique em um marcador no mapa para mais detalhes ou use a lista de sensores.';