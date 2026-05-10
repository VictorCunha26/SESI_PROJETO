  let state = {
    alunos:      JSON.parse(localStorage.getItem('sesi_alunos')      || '[]'),
    ocorrencias: JSON.parse(localStorage.getItem('sesi_ocorrencias') || '[]'),
    salas:       JSON.parse(localStorage.getItem('sesi_salas')       || '[]'),
  };
 
  function save() {
    localStorage.setItem('sesi_alunos',      JSON.stringify(state.alunos));
    localStorage.setItem('sesi_ocorrencias', JSON.stringify(state.ocorrencias));
    localStorage.setItem('sesi_salas',       JSON.stringify(state.salas));
  }
 
  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2); }
 
  const pageNames = { dashboard:'Dashboard', alunos:'Alunos', ocorrencias:'Ocorrencias', salas:'Salas' };
 
  function goPage(id) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.getElementById('page-' + id).classList.add('active');
    document.querySelectorAll('.nav-item')[['dashboard','alunos','ocorrencias','salas'].indexOf(id)].classList.add('active');
    document.getElementById('topbar-title').textContent = pageNames[id];
    if (id === 'dashboard')   renderDashboard();
    if (id === 'alunos')      { populateFiltroSalaAlunos(); renderAlunos(); }
    if (id === 'ocorrencias') { populateSelectAlunos(); populateFilterSalaOc(); renderOcorrencias(); }
    if (id === 'salas')       renderSalas();
  }
 
  function openModal(id) {
    if (id === 'modal-ocorrencia') { populateSelectAlunos(); document.getElementById('oc-data').value = new Date().toISOString().split('T')[0]; }
    if (id === 'modal-aluno')      populateSalaSelect('aluno-sala');
    document.getElementById(id).classList.add('open');
  }
  function closeModal(id) { document.getElementById(id).classList.remove('open'); }
  document.querySelectorAll('.modal-overlay').forEach(o =>
    o.addEventListener('click', e => { if (e.target === o) o.classList.remove('open'); })
  );
 
  // SALAS
  function salvarSala() {
    const nome  = document.getElementById('sala-nome').value.trim();
    const turno = document.getElementById('sala-turno').value;
    const serie = document.getElementById('sala-serie').value.trim();
    if (!nome) return alert('Informe o nome da sala.');
    state.salas.push({ id: uid(), nome, turno, serie });
    save();
    closeModal('modal-sala');
    document.getElementById('sala-nome').value  = '';
    document.getElementById('sala-serie').value = '';
    renderSalas();
  }
 
  function renderSalas() {
    const grid = document.getElementById('grid-salas');
    if (!state.salas.length) {
      grid.innerHTML = '<div class="card" style="grid-column:1/-1;text-align:center;padding:2rem;"><div class="empty"><div class="empty-line"></div>Nenhuma sala cadastrada</div></div>';
      return;
    }
    grid.innerHTML = state.salas.map(s => {
      const alunos = state.alunos.filter(a => a.salaId === s.id).length;
      const ocs    = state.ocorrencias.filter(o => { const al = state.alunos.find(a => a.id === o.alunoId); return al && al.salaId === s.id; }).length;
      return `
        <div class="sala-card">
          <div class="sala-card-header">
            <div class="sala-card-nome">${s.nome}</div>
            <span class="badge badge-blue">${s.turno}</span>
          </div>
          <div class="sala-card-body">
            <div style="font-size:12px;color:var(--muted);margin-bottom:.8rem;">${s.serie || '—'}</div>
            <div class="sala-stat-row">
              <div><div class="sala-stat-n">${alunos}</div><div class="sala-stat-lbl">Alunos</div></div>
              <div><div class="sala-stat-n ${ocs>0?'danger':''}">${ocs}</div><div class="sala-stat-lbl">Ocorrencias</div></div>
            </div>
          </div>
          <div class="sala-card-footer">
            <button class="btn btn-danger btn-sm" onclick="excluirSala('${s.id}')">Excluir</button>
          </div>
        </div>`;
    }).join('');
  }
 
  function excluirSala(id) {
    if (!confirm('Excluir esta sala? Os alunos vinculados ficam sem sala.')) return;
    state.salas  = state.salas.filter(s => s.id !== id);
    state.alunos = state.alunos.map(a => a.salaId === id ? {...a, salaId:''} : a);
    save(); renderSalas();
  }
 
  function populateSalaSelect(selectId) {
    document.getElementById(selectId).innerHTML =
      '<option value="">Sem sala</option>' +
      state.salas.map(s => `<option value="${s.id}">${s.nome} — ${s.turno}</option>`).join('');
  }
 
  function populateFiltroSalaAlunos() {
    document.getElementById('filtro-sala-alunos').innerHTML =
      '<option value="">Todas as salas</option>' +
      state.salas.map(s => `<option value="${s.id}">${s.nome}</option>`).join('');
  }
 
  // ALUNOS agrupados por sala
  function salvarAluno() {
    const nome   = document.getElementById('aluno-nome').value.trim();
    const rm     = document.getElementById('aluno-rm').value.trim();
    const salaId = document.getElementById('aluno-sala').value;
    if (!nome || !rm) return alert('Preencha nome e RM.');
    if (state.alunos.find(a => a.rm === rm)) return alert('RM ja cadastrado.');
    state.alunos.push({ id: uid(), nome, rm, salaId });
    save();
    closeModal('modal-aluno');
    document.getElementById('aluno-nome').value = '';
    document.getElementById('aluno-rm').value   = '';
    renderAlunos();
  }
 
  function renderAlunos() {
    const container  = document.getElementById('alunos-container');
    const busca      = document.getElementById('busca-alunos').value.toLowerCase();
    const salaFiltro = document.getElementById('filtro-sala-alunos').value;
 
    let lista = state.alunos;
    if (busca)      lista = lista.filter(a => a.nome.toLowerCase().includes(busca) || a.rm.includes(busca));
    if (salaFiltro) lista = lista.filter(a => a.salaId === salaFiltro);
 
    if (!lista.length) {
      container.innerHTML = `<div class="card"><div class="card-top-bar"></div>
        <div class="empty"><div class="empty-line"></div>Nenhum aluno encontrado</div></div>`;
      return;
    }
 
    // montar grupos: salas cadastradas + sem sala
    const grupos = [];
    state.salas.forEach(s => {
      const membros = lista.filter(a => a.salaId === s.id);
      if (membros.length) grupos.push({ sala: s, alunos: membros });
    });
    const semSala = lista.filter(a => !a.salaId || !state.salas.find(s => s.id === a.salaId));
    if (semSala.length) grupos.push({ sala: null, alunos: semSala });
 
    container.innerHTML = grupos.map(g => {
      const headerLabel = g.sala
        ? `<span class="sala-group-nome">${g.sala.nome}</span>
           <span class="badge badge-blue" style="margin-left:4px;">${g.sala.turno}</span>
           ${g.sala.serie ? `<span class="sala-group-meta">${g.sala.serie}</span>` : ''}
           <span class="sala-group-meta" style="margin-left:auto;">${g.alunos.length} aluno${g.alunos.length !== 1 ? 's' : ''}</span>`
        : `<span class="sala-group-nome" style="color:var(--muted);">Sem Sala Definida</span>
           <span class="sala-group-meta" style="margin-left:auto;">${g.alunos.length} aluno${g.alunos.length !== 1 ? 's' : ''}</span>`;
 
      const rows = g.alunos.map(a => {
        const ocs = state.ocorrencias.filter(o => o.alunoId === a.id).length;
        return `<tr>
          <td class="td-name">${a.nome}</td>
          <td class="td-rm">${a.rm}</td>
          <td>${ocs > 0 ? `<span class="badge badge-red">${ocs}</span>` : '<span class="badge badge-green">0</span>'}</td>
          <td><button class="btn btn-danger btn-sm" onclick="excluirAluno('${a.id}')">Excluir</button></td>
        </tr>`;
      }).join('');
 
      return `
        <div class="sala-group">
          <div class="sala-group-header">${headerLabel}</div>
          <div class="sala-group-body">
            <div class="table-wrap">
              <table>
                <thead><tr><th>Nome</th><th>RM</th><th>Ocorrencias</th><th>Acoes</th></tr></thead>
                <tbody>${rows}</tbody>
              </table>
            </div>
          </div>
        </div>`;
    }).join('');
  }
 
  function excluirAluno(id) {
    if (!confirm('Excluir este aluno e todas as suas ocorrencias?')) return;
    state.alunos      = state.alunos.filter(a => a.id !== id);
    state.ocorrencias = state.ocorrencias.filter(o => o.alunoId !== id);
    save(); renderAlunos();
  }
 
  // OCORRENCIAS
  function populateSelectAlunos() {
    const grupos = [];
    state.salas.forEach(s => {
      const membros = state.alunos.filter(a => a.salaId === s.id);
      if (membros.length) grupos.push({ label: `Sala ${s.nome} — ${s.turno}`, alunos: membros });
    });
    const semSala = state.alunos.filter(a => !a.salaId || !state.salas.find(s => s.id === a.salaId));
    if (semSala.length) grupos.push({ label: 'Sem Sala', alunos: semSala });
 
    const sel = document.getElementById('oc-aluno');
    if (!grupos.length) { sel.innerHTML = '<option value="">Nenhum aluno cadastrado</option>'; return; }
    sel.innerHTML = '<option value="">Selecione o aluno...</option>' +
      grupos.map(g =>
        `<optgroup label="${g.label}">` +
        g.alunos.map(a => `<option value="${a.id}">${a.nome} — RM ${a.rm}</option>`).join('') +
        `</optgroup>`
      ).join('');
  }
 
  function populateFilterSalaOc() {
    document.getElementById('filtro-sala-oc').innerHTML =
      '<option value="">Todas as salas</option>' +
      state.salas.map(s => `<option value="${s.id}">${s.nome}</option>`).join('');
  }
 
  function salvarOcorrencia() {
    const alunoId   = document.getElementById('oc-aluno').value;
    const tipo      = document.getElementById('oc-tipo').value;
    const gravidade = parseInt(document.getElementById('oc-gravidade').value);
    const data      = document.getElementById('oc-data').value;
    const descricao = document.getElementById('oc-desc').value.trim();
    if (!alunoId || !tipo || !data) return alert('Preencha os campos obrigatorios.');
    state.ocorrencias.push({ id: uid(), alunoId, tipo, gravidade, data, descricao });
    save();
    closeModal('modal-ocorrencia');
    document.getElementById('oc-aluno').value = '';
    document.getElementById('oc-tipo').value  = '';
    document.getElementById('oc-desc').value  = '';
    renderOcorrencias();
  }
 
  const sevLabel = { 1:'Leve', 2:'Moderada', 3:'Grave' };
  const sevBadge = { 1:'badge-green', 2:'badge-amber', 3:'badge-red' };
 
  function renderOcorrencias() {
    const tbody      = document.getElementById('table-ocorrencias');
    const busca      = document.getElementById('busca-oc').value.toLowerCase();
    const salaFiltro = document.getElementById('filtro-sala-oc').value;
    let lista        = [...state.ocorrencias].sort((a,b) => b.data.localeCompare(a.data));
 
    if (busca) lista = lista.filter(o => {
      const al   = state.alunos.find(a => a.id === o.alunoId);
      const sala = al ? state.salas.find(s => s.id === al.salaId) : null;
      return (al && al.nome.toLowerCase().includes(busca)) ||
             o.tipo.toLowerCase().includes(busca) ||
             (sala && sala.nome.toLowerCase().includes(busca));
    });
    if (salaFiltro) lista = lista.filter(o => {
      const al = state.alunos.find(a => a.id === o.alunoId);
      return al && al.salaId === salaFiltro;
    });
 
    if (!lista.length) {
      tbody.innerHTML = '<tr><td colspan="7"><div class="empty"><div class="empty-line"></div>Nenhuma ocorrencia encontrada</div></td></tr>';
      return;
    }
    tbody.innerHTML = lista.map(o => {
      const al      = state.alunos.find(a => a.id === o.alunoId);
      const sala    = al ? state.salas.find(s => s.id === al.salaId) : null;
      const dataFmt = o.data ? new Date(o.data + 'T12:00:00').toLocaleDateString('pt-BR') : '—';
      return `<tr>
        <td class="td-name">${al ? al.nome : '—'}</td>
        <td class="td-rm">${al ? al.rm : '—'}</td>
        <td>${sala ? `<span class="badge badge-blue">${sala.nome}</span>` : '<span style="color:var(--muted)">—</span>'}</td>
        <td>${o.tipo}</td>
        <td><span class="badge ${sevBadge[o.gravidade]}">${sevLabel[o.gravidade]}</span></td>
        <td style="color:var(--muted);font-size:12px;">${dataFmt}</td>
        <td><button class="btn btn-danger btn-sm" onclick="excluirOcorrencia('${o.id}')">Excluir</button></td>
      </tr>`;
    }).join('');
  }
 
  function excluirOcorrencia(id) {
    if (!confirm('Excluir esta ocorrencia?')) return;
    state.ocorrencias = state.ocorrencias.filter(o => o.id !== id);
    save(); renderOcorrencias();
  }
 
  // DASHBOARD
  function renderDashboard() {
    document.getElementById('dash-alunos').textContent = state.alunos.length;
    document.getElementById('dash-total').textContent  = state.ocorrencias.length;
    document.getElementById('dash-salas').textContent  = state.salas.length;
    document.getElementById('dash-graves').textContent = state.ocorrencias.filter(o => o.gravidade === 3).length;
 
    const recentes = [...state.ocorrencias].sort((a,b) => b.data.localeCompare(a.data)).slice(0,6);
    const tbody    = document.getElementById('dash-recentes');
    tbody.innerHTML = recentes.length ? recentes.map(o => {
      const al      = state.alunos.find(a => a.id === o.alunoId);
      const sala    = al ? state.salas.find(s => s.id === al.salaId) : null;
      const dataFmt = o.data ? new Date(o.data + 'T12:00:00').toLocaleDateString('pt-BR') : '—';
      return `<tr>
        <td class="td-name">${al ? al.nome : '—'}</td>
        <td class="td-rm">${al ? al.rm : '—'}</td>
        <td>${sala ? sala.nome : '—'}</td>
        <td>${o.tipo}</td>
        <td><span class="badge ${sevBadge[o.gravidade]}">${sevLabel[o.gravidade]}</span></td>
        <td style="color:var(--muted);font-size:12px;">${dataFmt}</td>
      </tr>`;
    }).join('') : '<tr><td colspan="6"><div class="empty"><div class="empty-line"></div>Nenhuma ocorrencia</div></td></tr>';
 
    // chart salas
    const chartSalas = document.getElementById('chart-salas');
    if (!state.salas.length) {
      chartSalas.innerHTML = '<div class="empty"><div class="empty-line"></div>Sem dados ainda</div>';
    } else {
      const counts = state.salas.map(s => ({
        nome: s.nome,
        count: state.ocorrencias.filter(o => { const al = state.alunos.find(a => a.id === o.alunoId); return al && al.salaId === s.id; }).length
      }));
      const max = Math.max(1, ...counts.map(c => c.count));
      chartSalas.innerHTML = counts.map(c => `
        <div class="bar-row">
          <div class="bar-label">${c.nome}</div>
          <div class="bar-track"><div class="bar-fill" style="width:${Math.round((c.count/max)*100)}%"></div></div>
          <div class="bar-count">${c.count}</div>
        </div>`).join('');
    }
 
    // chart tipos
    const chartTipos = document.getElementById('chart-tipos');
    const tiposCount = {};
    state.ocorrencias.forEach(o => { tiposCount[o.tipo] = (tiposCount[o.tipo]||0)+1; });
    const tiposArr = Object.entries(tiposCount).sort((a,b)=>b[1]-a[1]).slice(0,6);
    if (!tiposArr.length) {
      chartTipos.innerHTML = '<div class="empty"><div class="empty-line"></div>Sem dados ainda</div>';
    } else {
      const maxT = tiposArr[0][1];
      chartTipos.innerHTML = tiposArr.map(([tipo,count]) => `
        <div class="bar-row">
          <div class="bar-label" style="font-size:11px;width:120px;">${tipo}</div>
          <div class="bar-track"><div class="bar-fill" style="width:${Math.round((count/maxT)*100)}%"></div></div>
          <div class="bar-count">${count}</div>
        </div>`).join('');
    }
  }