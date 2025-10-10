// controlador simples para cadastro de pessoas + chip, usando localStorage
const STORAGE_KEY = 'connection4_workers';

function loadWorkers(){
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw? JSON.parse(raw):[];
}

function saveWorkers(list){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

function renderTable(){
  const tbody = document.querySelector('#workersTable tbody');
  tbody.innerHTML = '';
  const list = loadWorkers();
  list.forEach(w => {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${w.name}</td><td>${w.role||''}</td><td>${w.chip}</td>`;
    tbody.appendChild(tr);
  });
  renderSelect();
}

function renderSelect(){
  const sel = document.getElementById('workerSelect');
  sel.innerHTML = '';
  const list = loadWorkers();
  list.forEach((w, idx) => {
    const opt = document.createElement('option');
    opt.value = idx;
    opt.text = `${w.name} — ${w.chip}`;
    sel.appendChild(opt);
  });
  if(list.length===0){ const opt = document.createElement('option'); opt.text='Nenhum cadastrado'; sel.appendChild(opt); }
}

function playBeep(){
  // WebAudio beep
  try{
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'sine'; o.frequency.value = 880;
    g.gain.value = 0.2;
    o.connect(g); g.connect(ctx.destination);
    o.start();
    setTimeout(()=>{ o.stop(); ctx.close(); }, 350);
  }catch(e){ console.warn('Erro audio', e); }
}

function flashLed(){
  const led = document.getElementById('led');
  led.classList.add('active');
  setTimeout(()=> led.classList.remove('active'), 800);
}

function vibrate(){
  if(navigator.vibrate) navigator.vibrate([200,100,200]);
}

// Simula o disparo de alerta para o trabalhador selecionado
function simulateAlert(){
  const sel = document.getElementById('workerSelect');
  const idx = parseInt(sel.value);
  const list = loadWorkers();
  if(isNaN(idx) || !list[idx]){ document.getElementById('alertText').innerText='Nenhum trabalhador selecionado.'; return; }
  const worker = list[idx];
  document.getElementById('alertText').innerText=`Alerta: ${worker.name} (chip ${worker.chip})`;
  playBeep(); flashLed(); vibrate();
}

// formulário
const form = document.getElementById('registerForm');
form.addEventListener('submit', e=>{
  e.preventDefault();
  const name = document.getElementById('name').value.trim();
  const role = document.getElementById('role').value.trim();
  const chip = document.getElementById('chip').value.trim();
  if(!name || !chip) return alert('Nome e Chip são obrigatórios.');
  const list = loadWorkers();
  list.push({ name, role, chip, createdAt: new Date().toISOString() });
  saveWorkers(list);
  form.reset();
  renderTable();
});

document.getElementById('simulate').addEventListener('click', simulateAlert);
document.getElementById('clearStorage').addEventListener('click', ()=>{ if(confirm('Limpar todos os registros?')){ localStorage.removeItem(STORAGE_KEY); renderTable(); } });

// inicializa
renderTable();