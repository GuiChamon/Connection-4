// js/views/peopleView.js
const PeopleView = (function(){
  const root = document.getElementById('view-root');

  function template(){
    return `
      <div class="card">
        <h3>Cadastro de Pessoas</h3>
        <p class="small">Cadastre funcionários e vincule um dispositivo (chip).</p>
        <div class="form-row">
          <input id="person-name" placeholder="Nome completo" />
          <input id="person-role" placeholder="Função" />
        </div>
        <div class="form-row">
          <select id="person-device">
            <option value="">-- Sem dispositivo --</option>
          </select>
          <button id="btn-add-person" class="btn">Adicionar Pessoa</button>
        </div>
        <hr/>
        <div class="list" id="people-list"></div>
      </div>
    `;
  }

  function render(){
    root.innerHTML = template();
    populateDevicesSelect();
    renderPeopleList();
    bind();
  }

  function populateDevicesSelect(){
    const sel = document.getElementById('person-device');
    sel.innerHTML = '<option value="">-- Sem dispositivo --</option>';
    const devices = DevicesModel.all();
    devices.forEach(d=>{
      const opt = document.createElement('option'); opt.value = d.id; opt.textContent = d.id + ' ('+d.type+')';
      sel.appendChild(opt);
    });
  }

  function renderPeopleList(){
    const node = document.getElementById('people-list');
    const people = PeopleModel.all();
    if (people.length===0){ node.innerHTML = '<p class="small">Nenhum registro.</p>'; return; }
    node.innerHTML = '';
    for (const p of people){
      const div = document.createElement('div');
      div.className = 'chip';
      const avatar = document.createElement('div'); avatar.className='avatar'; avatar.textContent = p.name.split(' ').map(s=>s[0]).slice(0,2).join('');
      const info = document.createElement('div'); info.className='info';
      info.innerHTML = '<strong>'+p.name+'</strong><div class="small">'+p.role+'</div>';
      const right = document.createElement('div');
      right.innerHTML = '<div class="small">Device: '+(p.deviceId||'--')+'</div><div style="margin-top:6px"><button data-id="'+p.id+'" class="btn btn-edit">Editar</button> <button data-id="'+p.id+'" class="btn btn-remove">Remover</button></div>';
      div.appendChild(avatar); div.appendChild(info); div.appendChild(right);
      node.appendChild(div);
    }
  }

  function bind(){
    document.getElementById('btn-add-person').addEventListener('click', ()=>{
      const name = document.getElementById('person-name').value.trim();
      const role = document.getElementById('person-role').value.trim();
      const deviceId = document.getElementById('person-device').value || null;
      if (!name){ alert('Nome obrigatório'); return; }
      PeopleController.add({name, role, deviceId});
      document.getElementById('person-name').value=''; document.getElementById('person-role').value=''; document.getElementById('person-device').value='';
      render(); // re-render view
    });

    document.getElementById('people-list').addEventListener('click', (e)=>{
      const btn = e.target.closest('button');
      if (!btn) return;
      const id = btn.getAttribute('data-id');
      if (btn.classList.contains('btn-remove')){ if (confirm('Remover pessoa?')){ PeopleController.remove(id); render(); } }
      if (btn.classList.contains('btn-edit')){
        const people = PeopleModel.all(); const p = people.find(x=>x.id===id);
        const newName = prompt('Nome', p.name); if (!newName) return;
        const newRole = prompt('Função', p.role) || p.role;
        PeopleController.update(id, {name:newName, role:newRole});
        render();
      }
    });
  }

  return { render };
})();