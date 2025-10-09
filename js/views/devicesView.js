// js/views/devicesView.js
const DevicesView = (function(){
  const root = document.getElementById('view-root');
  function template(){
    return `
      <div class="card">
        <h3>Cadastro de Dispositivos (Chips)</h3>
        <p class="small">Registre dispositivos que serão vinculados a pessoas.</p>
        <div class="form-row">
          <input id="device-id" placeholder="ID do dispositivo (ex: D123)" />
          <select id="device-type"><option value="worker">Worker</option><option value="sensor">Sensor</option></select>
          <button id="btn-add-device" class="btn">Adicionar</button>
        </div>
        <hr/>
        <div class="list" id="devices-list"></div>
      </div>
    `;
  }
  function render(){
    root.innerHTML = template();
    renderDevicesList();
    bind();
  }
  function renderDevicesList(){
    const node = document.getElementById('devices-list');
    const devices = DevicesModel.all();
    if (devices.length===0){ node.innerHTML = '<p class="small">Nenhum dispositivo cadastrado.</p>'; return; }
    node.innerHTML = '<table class="table"><thead><tr><th>ID</th><th>Tipo</th><th>Status</th><th>Ações</th></tr></thead><tbody id="devices-tbody"></tbody></table>';
    const tbody = document.getElementById('devices-tbody');
    devices.forEach(d=>{
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${d.id}</td><td>${d.type}</td><td><span class="status-pill ${d.active? 'status-active':'status-inactive'}">${d.active? 'Ativo':'Inativo'}</span></td>
        <td><button data-id="${d.id}" class="btn btn-edit">Editar</button> <button data-id="${d.id}" class="btn btn-remove">Remover</button></td>`;
      tbody.appendChild(tr);
    });
  }
  function bind(){
    document.getElementById('btn-add-device').addEventListener('click', ()=>{
      const id = document.getElementById('device-id').value.trim();
      const type = document.getElementById('device-type').value;
      if (!id){ alert('ID obrigatório'); return; }
      DevicesController.add({id, type, active:true});
      document.getElementById('device-id').value='';
      render();
    });
    document.getElementById('devices-list').addEventListener('click', (e)=>{
      const btn = e.target.closest('button');
      if (!btn) return;
      const id = btn.getAttribute('data-id');
      if (btn.classList.contains('btn-remove')){ if (confirm('Remover dispositivo?')){ DevicesController.remove(id); render(); } }
      if (btn.classList.contains('btn-edit')){
        const newAct = confirm('Ativar dispositivo? OK = ativo, Cancelar = inativo');
        DevicesController.update(id, {active:newAct});
        render();
      }
    });
  }
  return { render };
})();