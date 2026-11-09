/* ============================================================
   CBMGO 193 — AC4 (Candidatura)
   ============================================================ */

/* ---------- 1. CONSTANTES ---------- */
const VALUE_TABLE = {
  'SEGUNDA': { '24h': 658.59, '16h': 430.18, '12h Diurno': 317.64, '12h Noturno': 340.95 },
  'TERÇA':   { '24h': 658.59, '16h': 430.18, '12h Diurno': 317.64, '12h Noturno': 340.95 },
  'QUARTA':  { '24h': 658.59, '16h': 430.18, '12h Diurno': 317.64, '12h Noturno': 340.95 },
  'QUINTA':  { '24h': 688.41, '16h': 430.18, '12h Diurno': 317.64, '12h Noturno': 370.77 },
  'SEXTA':   { '24h': 908.63, '16h': 592.5,  '12h Diurno': 436.92, '12h Noturno': 471.71 },
  'SÁBADO':  { '24h': 908.63, '16h': 592.5,  '12h Diurno': 436.92, '12h Noturno': 471.71 },
  'DOMINGO': { '24h': 878.81, '16h': 592.5,  '12h Diurno': 436.92, '12h Noturno': 441.89 }
};

const SUPABASE_URL = 'https://elakajrqhnpgvbeeuope.supabase.co';
const SUPABASE_KEY = 'sb_publishable_L_Ax840Q1hsGM3xdKHX0rQ_eW_ROare';

/* ---------- 2. ESTADO ---------- */
let currentUserRG = '';
let userProfile = null;
let selectedDates = [];
let selectedCourses = [];
let supabaseClient = null;
let lastGeneratedVacancies = [];

// Cache de vagas aplicadas e controle de filtro
let appliedVacanciesCache = new Set();
let currentAvailableVacancies = []; 
let currentVacancyFilterDate = '';

function persistAppliedCache() {
  try {
    localStorage.setItem(
      'ac4_applied_vacancies_' + currentUserRG,
      JSON.stringify([...appliedVacanciesCache])
    );
  } catch (e) {}
}

// Peso das patentes para ordenação
function getRankWeight(rank) {
  if (!rank) return 0;
  const r = rank.toUpperCase().trim();
  if (r.includes('ST')) return 7;
  if (r.includes('1º SGT') || r.includes('1 SGT')) return 6;
  if (r.includes('2º SGT') || r.includes('2 SGT')) return 5;
  if (r.includes('3º SGT') || r.includes('3 SGT')) return 4;
  if (r.includes('CB') || r.includes('CABO')) return 3;
  if (r.includes('1º SD') || r.includes('1 SD')) return 2;
  if (r.includes('2º SD') || r.includes('2 SD')) return 1;
  return 0;
}

/* ---------- 3. ÍCONES SVG ---------- */
const ICONS = {
  clock:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>',
  pin:      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>',
  users:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
  target:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>',
  inbox:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="28" height="28"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></svg>',
  clipboard:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="28" height="28"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1"/></svg>',
  check:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="28" height="28"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>'
};

/* ---------- 4. MENSAGENS ---------- */
function showError(message) {
  const div = document.getElementById('statusMessage');
  if (!div) return;
  div.innerHTML = `<div class="error">${message}</div>`;
  if (typeof showToastAc4 === 'function') showToastAc4(message, 'err');
  setTimeout(() => { if (div.innerHTML.includes('error')) div.innerHTML = ''; }, 5000);
}
function showSuccess(message) {
  const div = document.getElementById('statusMessage');
  if (!div) return;
  div.innerHTML = `<div class="success">${message}</div>`;
  if (typeof showToastAc4 === 'function') showToastAc4(message, 'ok');
  setTimeout(() => { if (div.innerHTML.includes('success')) div.innerHTML = ''; }, 3000);
}
function clearMessage() {
  const div = document.getElementById('statusMessage');
  if (div) div.innerHTML = '';
}
function setBtnLoading(btn, on) {
  if (!btn) return;
  btn.classList.toggle('loading', on);
  btn.disabled = on;
}
function setFilterActive(activeId) {
  ['btnViewCandidates', 'btnViewApproved'].forEach(id => {
    const btn = document.getElementById(id);
    if (btn) btn.classList.toggle('primary', id === activeId);
  });
}

/* ---------- 5. NAVEGAÇÃO ---------- */
const VIEWS = {
  vagas: 'vacancies',
  apps: 'myApplications',
  perfil: 'profileSection',
  cursos: 'coursesSection',
  admin: 'adminSection',
  candidatos: 'candidatesSection'
};

function alternarAbaAc4(aba) {
  if (!currentUserRG) return;
  document.getElementById('loginView').classList.add('hidden');
  document.getElementById('appView').classList.remove('hidden');

  const abaParaBotao = aba === 'cursos' ? 'perfil' : aba;

  Object.entries(VIEWS).forEach(([key, id]) => {
    const el = document.getElementById(id);
    if (el) el.classList.toggle('hidden', key !== aba);
    const btn = document.getElementById('stab-' + key);
    if (btn) {
      const ativo = key === abaParaBotao;
      btn.classList.toggle('active', ativo);
      btn.setAttribute('aria-selected', ativo ? 'true' : 'false');
    }
  });

  if (aba === 'vagas') loadVacancies();
  else if (aba === 'apps') loadMyApplications();
  else if (aba === 'perfil') loadProfileInfo();
  else if (aba === 'cursos') loadCourses();
  else if (aba === 'admin') {
    selectedDates = [];
    updateDatesList();
    loadSpecializationsForAdmin();
    showValuePreview();
  } else if (aba === 'candidatos') {
    setFilterActive(null);
    document.getElementById('candidatesList').innerHTML =
    emptyState('users', 'Selecione uma opção', 'Clique em "Ver Pendentes" ou "Ver Homologados" acima.');
  }
}

function showProfileSection() { alternarAbaAc4('perfil'); }
function showCoursesSection() { alternarAbaAc4('cursos'); }

function resetUI() {
  document.getElementById('appView').classList.add('hidden');
  document.getElementById('loginView').classList.remove('hidden');
  document.getElementById('userNameDisplay').textContent = 'Militar';
  document.getElementById('userRgDisplay').textContent = '—';
  document.getElementById('userAvatar').textContent = '—';
  ['stab-admin', 'stab-candidatos'].forEach(id =>
    document.getElementById(id)?.classList.add('hidden')
  );
  Object.keys(VIEWS).forEach(key => {
    const btn = document.getElementById('stab-' + key);
    if (btn) {
      const ativo = key === 'vagas';
      btn.classList.toggle('active', ativo);
      btn.setAttribute('aria-selected', ativo ? 'true' : 'false');
    }
  });
  appliedVacanciesCache = new Set();
  currentUserRG = '';
  userProfile = null;
  localStorage.removeItem('10bbm_session');
}

function updateUserChip(rg, profile) {
  const nome = (profile?.nome || profile?.nome_completo || rg || 'Militar').toString();
  const iniciais = nome.split(/\s+/).filter(Boolean).slice(0, 2).map(p => p[0].toUpperCase()).join('') || rg.slice(-2);
  document.getElementById('userNameDisplay').textContent = nome;
  document.getElementById('userRgDisplay').textContent = rg;
  document.getElementById('userAvatar').textContent = iniciais;
}

/* ---------- 6. HELPERS ---------- */
function emptyState(icon, title, sub) {
  return `<div class="ac4-empty">
    <div class="ac4-empty-icon">${ICONS[icon] || ICONS.inbox}</div>
    <h3>${title}</h3>
    <p>${sub}</p>
  </div>`;
}

function skeletonList(n = 3) {
  return Array(n).fill(0).map(() => `
    <div class="ac4-skeleton-card">
      <div class="ac4-skeleton ac4-skeleton-line" style="width:60%"></div>
      <div class="ac4-skeleton ac4-skeleton-line" style="width:80%"></div>
      <div class="ac4-skeleton ac4-skeleton-line"></div>
    </div>
  `).join('');
}

function getDayOfWeek(dateString) {
  const date = new Date(dateString + 'T00:00:00');
  return ['DOMINGO','SEGUNDA','TERÇA','QUARTA','QUINTA','SEXTA','SÁBADO'][date.getDay()];
}
function getPeriod(hours, time) {
  const h = parseInt(hours);
  if (h === 24) return '24h';
  if (h === 16) return '16h';
  if (h === 12) {
    if (time && time.includes(':')) {
      const hour = parseInt(time.split(':')[0]);
      if (hour >= 18 || hour <= 6) return '12h Noturno';
    }
    return '12h Diurno';
  }
  return `${h}h`;
}
function calculateValue(dateString, hours, time) {
  const d = getDayOfWeek(dateString), p = getPeriod(hours, time);
  if (VALUE_TABLE[d] && VALUE_TABLE[d][p]) return VALUE_TABLE[d][p];
  return 300.00;
}
function fmtDate(d) {
  if (!d) return '—';
  try { return new Date(d + 'T00:00:00').toLocaleDateString('pt-BR'); }
  catch (e) { return d; }
}
function showValuePreview() {
  const h = document.getElementById('vacanciesHours').value || '12';
  const t = document.getElementById('vacanciesTime').value || '';
  const div = document.getElementById('valuePreview');
  if (selectedDates.length > 0 && h) {
    let html = '<strong style="color:var(--ac4-text)">Valores calculados:</strong><br>';
    selectedDates.forEach(date => {
      const v = calculateValue(date, h, t);
      html += `<div style="margin:4px 0;font-size:13.5px">${fmtDate(date)} (${getDayOfWeek(date)}) · ${getPeriod(h, t)}: <strong style="color:var(--ac4-emerald)">R$ ${v.toFixed(2)}</strong></div>`;
    });
    div.innerHTML = html;
  } else {
    div.innerHTML = '<em style="color:var(--ac4-muted)">Adicione datas para ver os valores calculados</em>';
  }
}

/* ---------- 7. SESSÃO ---------- */
function saveSession(rg) {
  localStorage.setItem('10bbm_session', JSON.stringify({ rg, timestamp: Date.now() }));
}
function getSession() {
  try { return JSON.parse(localStorage.getItem('10bbm_session') || 'null'); }
  catch (e) { return null; }
}
function clearSession() { localStorage.removeItem('10bbm_session'); }

/* ---------- 8. SUPABASE API LAYER ---------- */
const rgToEmail = (rg) => `${String(rg).trim()}@cbmgo.local`;

async function apiJSONP(path) {
  const qs = new URLSearchParams(path.replace(/^\?/, ''));
  const action = qs.get('action');
  try {
    if (action === 'login') {
      const rg = qs.get('rg'), password = qs.get('password');
      const { data, error } = await supabaseClient.auth.signInWithPassword({ email: rgToEmail(rg), password });
      if (error) {
        const msg = error.message || '';
        if (msg.includes('Invalid login')) return { success: false, message: 'RG ou senha inválidos.' };
        return { success: false, message: 'Erro no login: ' + msg };
      }
      const { data: prof, error: errProf } = await supabaseClient
      .from('usuarios')
      .select('*')
      .eq('id', data.user.id)
      .single();

      if (errProf || !prof) {
        await supabaseClient.auth.signOut();
        return { success: false, message: 'Perfil não encontrado. Contate o administrador.' };
      }
      const { data: esps } = await supabaseClient
      .from('usuarios_especialidades')
      .select('cursos(nome)')
      .eq('usuario_id', data.user.id);

      const especialidade = (esps || []).map(e => e.cursos?.nome).filter(Boolean).join(', ');
      return { success: true, profile: { ...prof, especialidade } };
    }
    if (action === 'logout') { await supabaseClient.auth.signOut(); return { success: true }; }
    if (action === 'verifySession') {
      const { data: { session } } = await supabaseClient.auth.getSession();
      if (!session) return { success: false, message: 'Sessão inválida' };
      const { data: prof } = await supabaseClient.from('usuarios').select('*').eq('id', session.user.id).single();
      if (!prof) return { success: false, message: 'Perfil não encontrado' };
      return { success: true, profile: prof };
    }
    if (action === 'checkAdminPermission') {
      const { data: { session } } = await supabaseClient.auth.getSession();
      if (!session) return { success: false, isAdmin: false };
      const { data: prof } = await supabaseClient.from('usuarios').select('is_admin').eq('id', session.user.id).single();
      return { success: true, isAdmin: !!prof?.is_admin };
    }
    if (action === 'getUserProfile') {
      const rg = qs.get('rg');
      const { data: prof, error } = await supabaseClient.from('usuarios').select('*').eq('rg', rg).single();
      if (error) return { success: false, message: error.message };
      const { data: esps } = await supabaseClient.from('usuarios_especialidades').select('cursos(nome)').eq('usuario_id', prof.id);
      const especialidade = (esps || []).map(e => e.cursos?.nome).filter(Boolean).join(', ');
      return { success: true, data: { ...prof, especialidade } };
    }
    if (action === 'getCourses') {
      const { data, error } = await supabaseClient.from('cursos').select('nome, abreviacao').order('nome');
      if (error) return { success: false, message: error.message };
      return { success: true, courses: (data || []).map(c => ({ curso: c.nome, abreviacao: c.abreviacao })) };
    }
    if (action === 'updateUserSpecialties') {
      const { data: { session } } = await supabaseClient.auth.getSession();
      if (!session) return { success: false, message: 'Não autenticado' };
      const specialties = (qs.get('specialties') || '').split(',').map(s => s.trim()).filter(Boolean);
      await supabaseClient.from('usuarios_especialidades').delete().eq('usuario_id', session.user.id);
      for (const nome of specialties) {
        const { data: curso } = await supabaseClient.from('cursos').select('id').eq('nome', nome).single();
        if (curso) await supabaseClient.from('usuarios_especialidades').insert([{ usuario_id: session.user.id, curso_id: curso.id }]);
      }
      return { success: true };
    }
    if (action === 'listVacancies') {
      const { data, error } = await supabaseClient.from('vagas').select('*').order('data', { ascending: true });
      if (error) return { success: false, message: error.message };
      return {
        success: true,
        vacancies: (data || []).map(v => ({
          Id: v.id, Local: v.local, Data: v.data, Horario: v.horario, Dia: v.dia,
          'Especialização': v.especializacao, Valores: v.valores, Horas: v.horas,
          Vagas: v.vagas_qtd, 'Observações': v.observacoes
        }))
      };
    }
    if (action === 'generateVacancies') {
      const config = JSON.parse(qs.get('config'));
      const { data: { session } } = await supabaseClient.auth.getSession();
      if (!session) return { success: false, message: 'Não autenticado' };
      
      // OTIMIZAÇÃO: Cria apenas 1 registro por dia, com a quantidade total de vagas
      const registros = config.dias.map(d => ({
        local: config.local, data: d, horario: config.horario,
        dia: config.vagasIndividuais.find(v => v.date === d)?.dayOfWeek || '',
        especializacao: config.especializacao,
        valores: config.vagasIndividuais.find(v => v.date === d)?.value || '',
        horas: parseInt(config.horas), 
        vagas_qtd: parseInt(config.vagas) || 1, // <--- Salva a qtd correta
        observacoes: config.observacoes, criado_por: session.user.id
      }));
      
      const { data, error } = await supabaseClient.from('vagas').insert(registros).select();
      if (error) return { success: false, message: error.message };
      return { success: true, vacancies: data.map(v => ({ id: v.id, data: v.data, dia: v.dia, local: v.local, valor: v.valores })) };
    }
    if (action === 'listMyApplications') {
      const { data: { session } } = await supabaseClient.auth.getSession();
      if (!session) return { success: false, message: 'Não autenticado' };
      const { data, error } = await supabaseClient.from('candidaturas')
        .select('*, vagas(*), usuarios!usuario_id(nome)')
        .eq('usuario_id', session.user.id)
        .order('candidatado_em', { ascending: false });
      if (error) return { success: false, message: error.message };
      return {
        success: true,
        applications: (data || []).map(a => ({
          id: a.id,
          idVaga: a.vaga_id, Nome: a.usuarios?.nome || '', Horas: a.vagas?.horas,
          Data: a.vagas?.data, Horario: a.vagas?.horario, Especialização: a.vagas?.especializacao,
          Local: a.vagas?.local, Valor: a.vagas?.valores, Status: a.status,
          Especialista: a.especialista ? 'Sim' : 'Não'
        }))
      };
    }
    if (action === 'apply') {
      const { data: { session } } = await supabaseClient.auth.getSession();
      if (!session) return { success: false, message: 'Não autenticado' };
      
      const idVaga = parseInt(qs.get('idVaga'));
      if (!idVaga) return { success: false, message: 'ID da vaga inválido.' };
      
      // 1) Busca a vaga (incluindo a qtd total de vagas)
      const { data: vaga, error: errVaga } = await supabaseClient
        .from('vagas')
        .select('especializacao, data, vagas_qtd')
        .eq('id', idVaga)
        .single();
      
      if (errVaga || !vaga) return { success: false, message: 'Vaga não encontrada.' };
      
      // 2) Valida expiração
      if (vaga.data && vaga.data < new Date().toISOString().slice(0, 10)) {
        return { success: false, message: 'Esta vaga já expirou.' };
      }
      
      // 3) Verifica se a vaga já encheu
      const { count, error: errCount } = await supabaseClient
        .from('candidaturas')
        .select('*', { count: 'exact', head: true })
        .eq('vaga_id', idVaga);
        
      if (errCount) return { success: false, message: 'Erro ao verificar vagas.' };
      
      const qtdTotal = vaga.vagas_qtd || 1;
      if (count >= qtdTotal) {
        return { success: false, message: 'Vagas esgotadas para esta escala.' };
      }
      
      // 4) Verifica especialidade
      const { data: esps } = await supabaseClient
        .from('usuarios_especialidades')
        .select('cursos(nome)')
        .eq('usuario_id', session.user.id);
      const temEsp = (esps || []).some(e => e.cursos?.nome === vaga.especializacao);
      
      // 5) Insere a candidatura
      const { error } = await supabaseClient.from('candidaturas').insert([{
        usuario_id: session.user.id,
        vaga_id: idVaga,
        especialista: temEsp,
        status: 'Pendente'
      }]);
      
      if (error) {
        if (error.code === '23505') return { success: false, message: 'Você já se candidatou a esta vaga.' };
        if (error.code === '23503') return { success: false, message: 'Vaga não existe mais.' };
        return { success: false, message: error.message };
      }
      return { success: true, isSpecialist: temEsp };
    }
    if (action === 'cancelApplication') {
      const appId = parseInt(qs.get('appId'));
      const { data: { session } } = await supabaseClient.auth.getSession();
      if (!session) return { success: false, message: 'Não autenticado' };

      const { data: cand, error: errBusca } = await supabaseClient
        .from('candidaturas')
        .select('*, vagas(valores, horas)')
        .eq('id', appId)
        .eq('usuario_id', session.user.id)
        .single();

      if (errBusca || !cand) return { success: false, message: 'Candidatura não encontrada.' };

      // REGRA DE NEGÓCIO: Bloqueia o cancelamento se já estiver homologada
      if (cand.status === 'Homologado') {
         return { success: false, message: 'Não é possível desfazer uma candidatura já homologada. Contate o comando.' };
      }

      const { error } = await supabaseClient.from('candidaturas').delete().eq('id', appId).eq('usuario_id', session.user.id);
      if (error) return { success: false, message: error.message };

      return { success: true };
    }
    if (action === 'listAllApplications' || action === 'listApprovedApplications') {
      const onlyApproved = action === 'listApprovedApplications';
      let q = supabaseClient.from('candidaturas')
        .select('*, vagas(*), usuarios!usuario_id(nome, saldo, graduacao)')
        .order('candidatado_em', { ascending: true });
      if (onlyApproved) q = q.eq('status', 'Homologado');
      const { data, error } = await q;
      if (error) return { success: false, message: error.message };
      return {
        success: true,
        applications: (data || []).map(a => ({
          rowIndex: a.id, idVaga: a.vaga_id, nome: a.usuarios?.nome || '', userId: a.usuario_id,
          local: a.vagas?.local, data: a.vagas?.data, horario: a.vagas?.horario,
          especializacao: a.vagas?.especializacao, saldo: a.usuarios?.saldo,
          horas: a.vagas?.horas, valor: a.vagas?.valores, status: a.status,
          especialista: a.especialista ? 'Sim' : 'Não',
          graduacao: a.usuarios?.graduacao
        }))
      };
    }
    if (action === 'approveApplication') {
      const rowIndex = parseInt(qs.get('rowIndex'));
      const { data: { session } } = await supabaseClient.auth.getSession();
      if (!session) return { success: false, message: 'Não autenticado' };
      
      const { data: cand, error: errBusca } = await supabaseClient
        .from('candidaturas')
        .select('*, vagas(valores, horas)')
        .eq('id', rowIndex)
        .single();
      
      if (errBusca) return { success: false, message: errBusca.message };

      const { error } = await supabaseClient.from('candidaturas').update({
        status: 'Homologado',
        homologado_em: new Date().toISOString(),
        homologado_por: session.user.id
      }).eq('id', rowIndex);
      
      if (error) return { success: false, message: error.message };

      if (cand && cand.vagas) {
        const valorStr = cand.vagas.valores || '0';
        const valorNum = parseFloat(valorStr.replace('R$', '').replace(/\./g, '').replace(',', '.').trim()) || 0;
        const horasNum = parseFloat(cand.vagas.horas) || 0;
        
        const { data: user } = await supabaseClient.from('usuarios').select('saldo, horas').eq('id', cand.usuario_id).single();
        if (user) {
          const novoSaldo = (parseFloat(user.saldo) || 0) + valorNum;
          const novasHoras = (parseFloat(user.horas) || 0) + horasNum;
          await supabaseClient.from('usuarios').update({ saldo: novoSaldo, horas: novasHoras }).eq('id', cand.usuario_id);
        }
      }
      return { success: true };
    }
    if (action === 'unapproveApplication') {
      const rowIndex = parseInt(qs.get('rowIndex'));
      const { data: { session } } = await supabaseClient.auth.getSession();
      if (!session) return { success: false, message: 'Não autenticado' };

      const { data: cand, error: errBusca } = await supabaseClient
        .from('candidaturas')
        .select('*, vagas(valores, horas)')
        .eq('id', rowIndex)
        .single();
      
      if (errBusca) return { success: false, message: errBusca.message };

      const { error } = await supabaseClient.from('candidaturas').update({
        status: 'Pendente',
        homologado_em: null,
        homologado_por: null
      }).eq('id', rowIndex);
      
      if (error) return { success: false, message: error.message };

      if (cand && cand.vagas) {
        const valorStr = cand.vagas.valores || '0';
        const valorNum = parseFloat(valorStr.replace('R$', '').replace(/\./g, '').replace(',', '.').trim()) || 0;
        const horasNum = parseFloat(cand.vagas.horas) || 0;
        
        const { data: user } = await supabaseClient.from('usuarios').select('saldo, horas').eq('id', cand.usuario_id).single();
        if (user) {
          const novoSaldo = (parseFloat(user.saldo) || 0) - valorNum;
          const novasHoras = (parseFloat(user.horas) || 0) - horasNum;
          await supabaseClient.from('usuarios').update({ saldo: novoSaldo, horas: novasHoras }).eq('id', cand.usuario_id);
        }
      }
      return { success: true };
    }
    return { success: false, message: 'Ação desconhecida: ' + action };
  } catch (err) {
    console.error('Erro API:', err);
    return { success: false, message: err.message };
  }
}

/* ---------- 9. AUTH ---------- */
async function handleLogin(event) {
  if (event) event.preventDefault();
  clearMessage();
  const btn = document.getElementById('btnLogin');
  const rg = document.getElementById('rg').value.trim();
  const pass = document.getElementById('password').value;
  if (!rg || !pass) return showError('Preencha RG e senha');

  setBtnLoading(btn, true);
  try {
    const r = await apiJSONP('?action=login&rg=' + encodeURIComponent(rg) + '&password=' + encodeURIComponent(pass));
    if (!r.success) { showError(r.message); return; }

    currentUserRG = rg;
    userProfile = r.profile;
    saveSession(rg);

    appliedVacanciesCache = new Set();
    try {
      const saved = localStorage.getItem('ac4_applied_vacancies_' + rg);
      if (saved) JSON.parse(saved).forEach(id => appliedVacanciesCache.add(String(id)));
    } catch (e) {}
    
    document.getElementById('loginView').classList.add('hidden');
    document.getElementById('appView').classList.remove('hidden');
    updateUserChip(currentUserRG, userProfile);

    if (userProfile && userProfile.must_change_password) {
      abrirModalTrocaSenha();
      return;
    }

    showSuccess('Login realizado com sucesso!');
    document.getElementById('rg').value = '';
    document.getElementById('password').value = '';

    const admin = await apiJSONP('?action=checkAdminPermission&rg=' + encodeURIComponent(currentUserRG));
    if (admin.success && admin.isAdmin) showAdminButton();

    alternarAbaAc4('vagas');
  } catch (e) {
    showError(`Erro no login: ${e.message}`);
  } finally {
    setBtnLoading(btn, false);
  }
}

async function handleLogout() {
  const btn = document.getElementById('btnLogout');
  setBtnLoading(btn, true);
  try { await apiJSONP('?action=logout'); }
  catch (e) { console.log('Logout local:', e); }
  finally {
    clearSession();
    resetUI();
    setBtnLoading(btn, false);
    showSuccess('Logout realizado.');
  }
}

async function checkExistingSession() {
  const session = getSession();
  if (!session) return false;
  if (Date.now() - session.timestamp > 24 * 60 * 60 * 1000) { clearSession(); return false; }

  try {
    const s = await apiJSONP('?action=verifySession');
    if (!s.success) { clearSession(); return false; }

    currentUserRG = s.profile?.rg || session.rg;
    userProfile = s.profile;

    document.getElementById('loginView').classList.add('hidden');
    document.getElementById('appView').classList.remove('hidden');
    updateUserChip(currentUserRG, userProfile);

    if (userProfile.must_change_password) {
      abrirModalTrocaSenha();
      return true;
    }

    const admin = await apiJSONP('?action=checkAdminPermission&rg=' + encodeURIComponent(currentUserRG));
    if (admin.success && admin.isAdmin) showAdminButton();

    alternarAbaAc4('vagas');
    return true;
  } catch (e) {
    console.warn('Sessão inválida:', e);
    clearSession();
    return false;
  }
}

function showAdminButton() {
  ['stab-admin', 'stab-candidatos'].forEach(id =>
    document.getElementById(id)?.classList.remove('hidden')
  );
}

/* ---------- 10. DADOS ---------- */
async function loadProfileInfo() {
  const div = document.getElementById('profileInfo');
  div.innerHTML = skeletonList(2);
  try {
    const profile = await apiJSONP('?action=getUserProfile&rg=' + encodeURIComponent(currentUserRG));
    if (!profile.success) throw new Error(profile.message);
    userProfile = profile.data;
    updateUserChip(currentUserRG, userProfile);

    const safe = (v) => v ?? '—';
    const fields = [
      ['RG', safe(userProfile.rg)],
      ['Graduação', safe(userProfile.graduacao)],
      ['Nome', safe(userProfile.nome)],
      ['Nome completo', safe(userProfile.nome_completo)],
      ['Profissão', safe(userProfile.profissao)],
      ['ALA', safe(userProfile.ala)],
      ['Saldo', safe(userProfile.saldo)],
      ['Horas', safe(userProfile.horas)]
    ];

    div.innerHTML = `
      <div class="ac4-profile-grid">
        ${fields.map(([label, value]) => `
          <div class="ac4-profile-item">
            <div class="ac4-profile-label">${label}</div>
            <div class="ac4-profile-value">${value}</div>
          </div>
        `).join('')}
      </div>
      <div class="ac4-specialties-title">Especialidades</div>
      <div id="currentSpecialties">${renderSpecialties()}</div>
      <button id="btnAddSpecialties" class="ac4-btn" style="margin-top:16px">Editar especialidades</button>
    `;

    document.getElementById('btnAddSpecialties').addEventListener('click', showCoursesSection);
  } catch (e) {
    div.innerHTML = `<div class="error">Erro ao carregar perfil: ${e.message}</div>`;
  }
}

function renderSpecialties() {
  if (userProfile && userProfile.especialidade) {
    const esp = userProfile.especialidade.split(',').map(s => s.trim()).filter(Boolean);
    if (esp.length > 0) return esp.map(s => `<span class="ac4-tag">${s}</span>`).join('');
  }
  return '<em style="color:var(--ac4-muted);font-size:13px">Nenhuma especialidade cadastrada</em>';
}

async function loadCourses() {
  const div = document.getElementById('coursesList');
  div.innerHTML = skeletonList(2);
  try {
    const r = await apiJSONP('?action=getCourses');
    if (!r.success) throw new Error(r.message);
    const current = userProfile && userProfile.especialidade
      ? userProfile.especialidade.split(',').map(s => s.trim()).filter(Boolean)
      : [];
    selectedCourses = [...current];
    div.innerHTML = '';
    if (r.courses.length === 0) {
      div.innerHTML = `<div class="error">Nenhum curso encontrado.</div>`;
      return;
    }
    const grid = document.createElement('div');
    grid.className = 'ac4-courses-grid';
    r.courses.forEach(course => {
      const el = document.createElement('div');
      el.className = `ac4-course ${selectedCourses.includes(course.curso) ? 'selected' : ''}`;
      el.textContent = course.curso;
      el.onclick = () => toggleCourse(course.curso);
      grid.appendChild(el);
    });
    div.appendChild(grid);
    updateSelectedCoursesDisplay();
  } catch (e) {
    div.innerHTML = `<div class="error">Erro ao carregar cursos: ${e.message}</div>`;
  }
}

function toggleCourse(courseName) {
  if (selectedCourses.includes(courseName)) {
    selectedCourses = selectedCourses.filter(c => c !== courseName);
  } else {
    selectedCourses.push(courseName);
  }
  document.querySelectorAll('.ac4-course').forEach(item => {
    if (item.textContent.trim() === courseName) {
      item.classList.toggle('selected', selectedCourses.includes(courseName));
    }
  });
  updateSelectedCoursesDisplay();
}

function updateSelectedCoursesDisplay() {
  const div = document.getElementById('selectedCourses');
  div.innerHTML = selectedCourses.length > 0
    ? `<div class="ac4-specialties-title" style="margin-top:0">Selecionadas</div>${selectedCourses.map(c => `<span class="ac4-tag">${c}</span>`).join('')}`
    : '<em style="color:var(--ac4-muted);font-size:13px">Nenhuma especialidade selecionada</em>';
}

async function saveSpecialties() {
  const btn = document.getElementById('btnSaveSpecialties');
  const str = selectedCourses.join(', ');
  setBtnLoading(btn, true);
  try {
    const r = await apiJSONP('?action=updateUserSpecialties&rg=' + encodeURIComponent(currentUserRG) + '&specialties=' + encodeURIComponent(str));
    if (r.success) {
      showSuccess('Especialidades atualizadas!');
      if (userProfile) userProfile.especialidade = str;
      showProfileSection();
    } else showError(r.message);
  } catch (e) {
    showError(`Erro: ${e.message}`);
  } finally {
    setBtnLoading(btn, false);
  }
}

/* ---------- 11. VAGAS E FILTRO ---------- */
async function loadVacancies() {
  const div = document.getElementById('vacancyList');
  div.innerHTML = skeletonList(3);
  try {
    const resp = await apiJSONP('?action=listVacancies');
    if (!resp.success) throw new Error(resp.message || 'Erro');

    let myApps = { success: false, applications: [] };
    try {
      myApps = await apiJSONP('?action=listMyApplications');
    } catch (e) {
      console.warn('listMyApplications falhou, usando cache local:', e);
    }
    const applied = new Set();
    if (myApps.success && Array.isArray(myApps.applications)) {
      myApps.applications.forEach(a => applied.add(String(a.idVaga)));
    }
    appliedVacanciesCache.forEach(id => applied.add(String(id)));

    const hoje = new Date().toISOString().slice(0, 10);
    currentAvailableVacancies = resp.vacancies.filter(v =>
      !applied.has(String(v.Id)) && (!v.Data || v.Data >= hoje)
    );
    
    document.getElementById('filterVacancyDate').value = ''; // limpa o filtro ao carregar
    applyVacancyFilter();
  } catch (e) {
    div.innerHTML = `<div class="error">Erro ao carregar vagas: ${e.message}</div>`;
  }
}

function applyVacancyFilter() {
  const div = document.getElementById('vacancyList');
  const countBadge = document.getElementById('count-vagas');
  const filterDate = document.getElementById('filterVacancyDate')?.value;
  
  let filtered = [...currentAvailableVacancies];
  if (filterDate) {
    filtered = filtered.filter(v => v.Data === filterDate);
  }

  if (countBadge) {
    countBadge.textContent = filtered.length > 0 ? filtered.length : '';
    countBadge.classList.toggle('hidden', filtered.length === 0);
  }

  if (filtered.length === 0) {
    div.innerHTML = emptyState('inbox', 'Nenhuma vaga encontrada',
      'Ajuste o filtro de data ou aguarde novas publicações.');
    return;
  }

  div.innerHTML = '';
  filtered.forEach(v => {
    const el = document.createElement('div');
    el.className = 'ac4-vaga';
    el.innerHTML = `
      <div class="ac4-vaga-main">
        <div class="ac4-vaga-day">${v.Dia || '—'}</div>
        <h3 class="ac4-vaga-date">${fmtDate(v.Data)} · ${v.Horario || '—'}</h3>
        <div class="ac4-vaga-id">#${v.Id}</div>
        <div class="ac4-vaga-meta">
          <span>${ICONS.pin} ${v.Local || '—'}</span>
          <span>${ICONS.clock} ${v.Horas || '—'}h</span>
          <span>${ICONS.target} ${v.Especialização || '—'}</span>
          <span>${ICONS.users} ${v.Vagas || '1'} vaga(s)</span>
        </div>
      </div>
      <div class="ac4-vaga-right">
        <div class="ac4-vaga-value">${v.Valores || '—'}</div>
        <button type="button" data-id="${v.Id}" class="ac4-btn primary ac4-vaga-cta">Candidatar-se</button>
      </div>
      ${v.Observações ? `<div class="ac4-vaga-obs">${v.Observações}</div>` : ''}
    `;
    div.appendChild(el);
  });
  document.querySelectorAll('.ac4-vaga-cta').forEach(b => { b.onclick = onApply; });
}

async function onApply(e) {
  const idVaga = e.currentTarget.dataset.id;
  const button = e.currentTarget;
  if (!idVaga) return showError('ID da vaga não encontrado');

  let info = '', esp = '';
  try {
    const vac = await apiJSONP('?action=listVacancies');
    if (vac.success) {
      const v = vac.vacancies.find(x => String(x.Id) === String(idVaga));
      if (v) { esp = v.Especialização || 'Nenhuma'; info = `\n\nEspecialização: ${esp}`; }
    }
  } catch (e) {}

  if (!confirm(`Confirmar candidatura na vaga #${idVaga}?${info}`)) return;

  setBtnLoading(button, true);
  try {
    const r = await apiJSONP(
      '?action=apply' +
      '&userId='   + encodeURIComponent(currentUserRG) +
      '&userName=' + encodeURIComponent(currentUserRG) +
      '&idVaga='   + encodeURIComponent(idVaga)
    );

    if (r.success) {
      showSuccess(`Candidatura na vaga #${idVaga} registrada!`);
      appliedVacanciesCache.add(String(idVaga));
      persistAppliedCache();
      
      // Remove a vaga da lista atual (UI otimista)
      currentAvailableVacancies = currentAvailableVacancies.filter(v => String(v.Id) !== String(idVaga));
      applyVacancyFilter();

    } else {
      showError(r.message || 'Erro');
      setBtnLoading(button, false);
    }
  } catch (err) {
    showError(`Erro: ${err.message}`);
    setBtnLoading(button, false);
  }
}

/* ---------- 12. MINHAS CANDIDATURAS ---------- */
async function loadMyApplications() {
  const div = document.getElementById('appliedList');
  div.innerHTML = skeletonList(2);
  try {
    const resp = await apiJSONP('?action=listMyApplications');
    if (!resp.success) throw new Error(resp.message);
    if (!resp.applications || resp.applications.length === 0) {
      div.innerHTML = emptyState('clipboard', 'Nenhuma candidatura ainda', 'Vá em "Vagas" e candidate-se a uma vaga.');
      return;
    }
    div.innerHTML = `<p style="color:var(--ac4-muted);font-size:13px;margin:0 0 14px"><strong>${resp.applications.length}</strong> candidatura(s)</p>`;
    resp.applications.forEach(a => {
      const homol = a.Status && a.Status.toLowerCase() === 'homologado';
      const el = document.createElement('div');
      el.className = 'ac4-cand';
      el.innerHTML = `
        <div class="ac4-cand-main">
          <div class="ac4-cand-title">
            Vaga #${a.idVaga}
            <span class="ac4-pill ${a.Especialista === 'Sim' ? 'esp' : 'normal'}">${a.Especialista === 'Sim' ? 'Especialista' : 'Não esp.'}</span>
          </div>
          <div class="ac4-cand-meta">
            ${a.Data ? `<span>${fmtDate(a.Data)} · ${a.Horario || ''}</span>` : ''}
            ${a.Local ? `<span>${a.Local}</span>` : ''}
            ${a.Horas ? `<span>${a.Horas}h</span>` : ''}
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:12px">
          ${a.Valor ? `<div class="ac4-cand-value">${a.Valor}</div>` : ''}
          <span class="ac4-pill ${homol ? 'approved' : 'pending'}">${homol ? 'Homologado' : 'Em análise'}</span>
          ${homol 
            ? `<span style="font-size:12px;color:var(--ac4-muted);font-style:italic">Bloqueada</span>` 
            : `<button type="button" class="ac4-btn danger small" onclick="cancelMyApplication('${a.id}', '${a.idVaga}', this)">Desfazer</button>`
          }
        </div>
      `;
      div.appendChild(el);
    });
  } catch (e) {
    div.innerHTML = `<div class="error">Erro: ${e.message}</div>`;
  }
}

async function cancelMyApplication(appId, idVaga, btn) {
  if (!confirm('Tem certeza que deseja desfazer esta candidatura?\n\nA vaga voltará a ficar disponível.')) return;
  
  setBtnLoading(btn, true);
  try {
    const r = await apiJSONP('?action=cancelApplication&appId=' + encodeURIComponent(appId));
    if (r.success) {
      showSuccess('Candidatura desfeita com sucesso.');
      
      // Remove do cache local
      appliedVacanciesCache.delete(String(idVaga));
      persistAppliedCache();
      
      // Recarrega a lista de candidaturas
      await loadMyApplications();
    } else {
      showError(r.message || 'Erro ao desfazer candidatura.');
    }
  } catch (e) {
    showError(e.message);
  } finally {
    setBtnLoading(btn, false);
  }
}

/* ---------- 13. ADMIN: GERAR VAGAS ---------- */
function updateDatesList() {
  const dl = document.getElementById('datesList');
  if (selectedDates.length === 0) {
    dl.innerHTML = '<em style="color:var(--ac4-muted);font-size:13px">Nenhuma data</em>';
    return;
  }
  dl.innerHTML = selectedDates.map(date => {
    const v = calculateValue(date, document.getElementById('vacanciesHours').value || '12', document.getElementById('vacanciesTime').value || '');
    return `
      <div class="ac4-date-item">
        <div><strong>${fmtDate(date)}</strong> <span style="color:var(--ac4-muted)">(${getDayOfWeek(date)})</span><br><small>R$ ${v.toFixed(2)}</small></div>
        <button type="button" onclick="removeDate('${date}')" class="ac4-btn small danger">Remover</button>
      </div>`;
  }).join('');
}
function removeDate(date) {
  selectedDates = selectedDates.filter(d => d !== date);
  updateDatesList();
  showValuePreview();
}
function addDate() {
  const dp = document.getElementById('datePicker');
  const date = dp.value;
  if (date && !selectedDates.includes(date)) {
    selectedDates.push(date);
    updateDatesList();
    dp.value = '';
    showValuePreview();
  }
}
function clearDates() {
  selectedDates = [];
  updateDatesList();
  document.getElementById('valuePreview').innerHTML = '<em style="color:var(--ac4-muted)">Adicione datas para ver os valores calculados</em>';
}

async function generateVacancies() {
  const vc = document.getElementById('vacanciesCount').value;
  const vh = document.getElementById('vacanciesHours').value;
  const vt = document.getElementById('vacanciesTime').value;
  const vs = document.getElementById('vacanciesSpecialization').value;
  const vl = document.getElementById('vacanciesLocation').value;
  const vo = document.getElementById('vacanciesObservations').value;
  if (!vc || !vh || !vt || !vs || !vl) return showError('Preencha todos os campos obrigatórios');
  if (selectedDates.length === 0) return showError('Selecione pelo menos uma data');

  const vi = selectedDates.map(date => ({
    date,
    value: `R$ ${calculateValue(date, vh, vt).toFixed(2).replace('.', ',')}`,
    dayOfWeek: getDayOfWeek(date),
    period: getPeriod(vh, vt)
  }));
  const config = {
    vagas: parseInt(vc), horas: vh, horario: vt, especializacao: vs,
    local: vl, observacoes: vo, dias: selectedDates,
    vagasIndividuais: vi
  };

  const rd = document.getElementById('generationResult');
  const btn = document.getElementById('btnGenerateVacancies');
  rd.innerHTML = skeletonList(1);
  setBtnLoading(btn, true);

  try {
    const r = await apiJSONP('?action=generateVacancies&config=' + encodeURIComponent(JSON.stringify(config)) + '&userRG=' + encodeURIComponent(currentUserRG));
    if (r.success) {
      lastGeneratedVacancies = r.vacancies; 
      document.getElementById('actionsGenerated').classList.remove('hidden');
      
      rd.innerHTML = `<div class="success"><strong>${r.vacancies.length} dia(s) de vaga criado(s)</strong><ul style="margin:8px 0;padding-left:20px;font-size:13px">${r.vacancies.map(v => `<li>#${v.id} — ${v.data} (${v.dia}) — ${v.local} — ${v.valor}</li>`).join('')}</ul></div>`;
      document.getElementById('vacanciesCount').value = '';
      document.getElementById('vacanciesTime').value = '';
      document.getElementById('vacanciesSpecialization').value = '';
      document.getElementById('vacanciesObservations').value = '';
      selectedDates = [];
      updateDatesList();
      clearDates();
    } else {
      lastGeneratedVacancies = [];
      document.getElementById('actionsGenerated').classList.add('hidden');
      rd.innerHTML = `<div class="error">${r.message}</div>`;
    }
  } catch (e) {
    rd.innerHTML = `<div class="error">${e.message}</div>`;
  } finally {
    setBtnLoading(btn, false);
  }
}

function shareGeneratedWhatsApp() {
  if (!lastGeneratedVacancies || lastGeneratedVacancies.length === 0) return showError('Nenhuma vaga gerada recentemente.');
  
  let msg = `🚒 *NOVAS VAGAS AC4 - CBMGO* 🚒\n\n`;
  const grouped = {};
  lastGeneratedVacancies.forEach(v => {
    if (!grouped[v.data]) grouped[v.data] = [];
    grouped[v.data].push(v);
  });

  Object.keys(grouped).forEach(date => {
    const list = grouped[date];
    msg += `📅 *Data:* ${fmtDate(date)} (${list[0].dia})\n`;
    msg += `📍 *Local:* ${list[0].local}\n`;
    msg += `⏰ *Horário:* ${list[0].horario || '—'} | 💲 *Valor:* ${list[0].valor}\n`;
    msg += `-------------------------\n`;
  });
  
  msg += `\n👉 Acesse o app AC4 para se candidatar!`;
  window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`, '_blank');
}

function printGeneratedVacancies() {
  if (!lastGeneratedVacancies || lastGeneratedVacancies.length === 0) return showError('Nenhuma vaga gerada recentemente.');
  
  const printWindow = window.open('', '_blank');
  let html = `<html><head><title>Impressão de Vagas - AC4</title>
  <style>
    body { font-family: sans-serif; padding: 20px; color: #333; }
    h1 { font-size: 20px; text-align: center; border-bottom: 2px solid #dc2626; padding-bottom: 10px; }
    .vaga { border: 1px solid #ccc; padding: 12px; margin-bottom: 10px; border-radius: 8px; page-break-inside: avoid; }
    .vaga strong { color: #dc2626; }
    .meta { font-size: 14px; margin-top: 5px; color: #555; }
  </style></head><body>`;
  html += `<h1>Vagas Geradas - AC4 CBMGO</h1>`;
  
  lastGeneratedVacancies.forEach(v => {
    html += `<div class="vaga">
      <strong>ID: #${v.id}</strong> | Data: ${fmtDate(v.data)} (${v.dia})<br>
      <div class="meta">
        <strong>Local:</strong> ${v.local} | <strong>Horário:</strong> ${v.horario || '—'}<br>
        <strong>Valor:</strong> ${v.valor}
      </div>
    </div>`;
  });
  
  html += `</body></html>`;
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => printWindow.print(), 250);
}

async function loadSpecializationsForAdmin() {
  const sel = document.getElementById('vacanciesSpecialization');
  try {
    const r = await apiJSONP('?action=getCourses');
    if (!r.success || !r.courses.length) return;
    while (sel.children.length > 1) sel.removeChild(sel.lastChild);
    r.courses.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.curso;
      opt.textContent = c.curso;
      sel.appendChild(opt);
    });
  } catch (e) { console.warn('loadSpecializations:', e); }
}

/* ---------- 14. ADMIN: CANDIDATOS ---------- */
let loadedCandidates = [];
let currentCandidateFilter = 'pending'; 

function applyCandidateFilter() {
  const filterDate = document.getElementById('filterCandidateDate')?.value;
  let filtered = [...loadedCandidates];
  
  if (filterDate) {
    filtered = filtered.filter(c => c.data === filterDate);
  }

  // Ordenação: 1º Saldo menor, 2º Patente maior
  filtered.sort((a, b) => {
    const saldoA = parseFloat(a.saldo) || 0;
    const saldoB = parseFloat(b.saldo) || 0;
    if (saldoA !== saldoB) return saldoA - saldoB;
    return getRankWeight(b.graduacao) - getRankWeight(a.graduacao);
  });

  renderCandidatesList(filtered);
}

function renderCandidatesList(candidates) {
  const div = document.getElementById('candidatesList');
  
  if (candidates.length === 0) {
    div.innerHTML = emptyState(
      currentCandidateFilter === 'pending' ? 'check' : 'clipboard',
      currentCandidateFilter === 'pending' ? 'Nenhum candidato pendente' : 'Nenhum candidato homologado',
      'Ajuste o filtro de data ou aguarde novas candidaturas.'
    );
    return;
  }

  const grouped = {};
  candidates.forEach(c => {
    if (!grouped[c.idVaga]) {
      grouped[c.idVaga] = {
        idVaga: c.idVaga,
        data: c.data,
        horario: c.horario,
        local: c.local,
        especializacao: c.especializacao,
        valor: c.valor,
        candidatos: []
      };
    }
    grouped[c.idVaga].candidatos.push(c);
  });

  let html = `<p style="color:var(--ac4-muted);font-size:13px;margin:0 0 14px"><strong>${candidates.length}</strong> candidato(s) encontrados.</p>`;

  Object.values(grouped).forEach(vaga => {
    html += `
      <div class="ac4-vaga-header-admin">
        <h3 class="ac4-vaga-header-title">
          Vaga #${vaga.idVaga} 
          <span>
            ${vaga.data ? fmtDate(vaga.data) : ''} · ${vaga.horario || ''} · ${vaga.local || ''} · ${vaga.especializacao || ''} · <strong style="color:var(--ac4-emerald)">${vaga.valor}</strong>
          </span>
        </h3>
      </div>
      <div class="ac4-cand-table-wrap">
        <table class="ac4-cand-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Candidato</th>
              <th>Patente</th>
              <th>Saldo</th>
              <th>Esp.</th>
              <th>Ação</th>
            </tr>
          </thead>
          <tbody>
    `;

    vaga.candidatos.forEach((c, i) => {
      const espPill = c.especialista === 'Sim' 
        ? `<span class="ac4-pill esp" style="padding:2px 6px">Sim</span>` 
        : `<span class="ac4-pill normal" style="padding:2px 6px">Não</span>`;

      const actionBtn = currentCandidateFilter === 'pending'
        ? `<button type="button" onclick="approveCandidate('${c.rowIndex}', this)" class="ac4-btn success small" style="min-height:28px; padding:4px 10px;">Homologar</button>`
        : `<button type="button" onclick="unapproveCandidate('${c.rowIndex}', this)" class="ac4-btn danger small" style="min-height:28px; padding:4px 10px;">Desfazer</button>`;

      html += `
        <tr>
          <td><strong>${i + 1}º</strong></td>
          <td><strong>${c.nome}</strong></td>
          <td>${c.graduacao || '—'}</td>
          <td><span style="color:var(--ac4-accent);font-weight:700">${c.saldo || '0'}</span></td>
          <td>${espPill}</td>
          <td>${actionBtn}</td>
        </tr>
      `;
    });

    html += `
          </tbody>
        </table>
      </div>
    `;
  });

  div.innerHTML = html;
}

async function loadAllCandidates() {
  const div = document.getElementById('candidatesList');
  div.innerHTML = skeletonList(3);
  currentCandidateFilter = 'pending';
  document.getElementById('filterCandidateDate').value = ''; 
  
  try {
    const r = await apiJSONP('?action=listAllApplications');
    if (!r.success) throw new Error(r.message);
    
    loadedCandidates = r.applications.filter(a => a.status?.toLowerCase() !== 'homologado');
    
    const badge = document.getElementById('count-pendentes');
    if (badge) {
      badge.textContent = loadedCandidates.length > 0 ? loadedCandidates.length : '';
      badge.classList.toggle('hidden', loadedCandidates.length === 0);
    }

    applyCandidateFilter();
  } catch (e) {
    div.innerHTML = `<div class="error">Erro: ${e.message}</div>`;
  }
}

async function loadApprovedCandidates() {
  const div = document.getElementById('candidatesList');
  div.innerHTML = skeletonList(3);
  currentCandidateFilter = 'approved';
  document.getElementById('filterCandidateDate').value = '';
  
  try {
    const r = await apiJSONP('?action=listApprovedApplications');
    if (!r.success) throw new Error(r.message);
    
    loadedCandidates = r.applications;
    applyCandidateFilter();
  } catch (e) {
    div.innerHTML = `<div class="error">Erro: ${e.message}</div>`;
  }
}

async function approveCandidate(rowIndex, btn) {
  if (!confirm('Homologar este candidato?')) return;
  setBtnLoading(btn, true);
  try {
    const r = await apiJSONP('?action=approveApplication&rowIndex=' + encodeURIComponent(rowIndex) + '&userRG=' + encodeURIComponent(currentUserRG));
    if (r.success) {
      showSuccess('Candidato homologado!');
      await loadAllCandidates();
    } else {
      showError(r.message || 'Erro');
    }
  } catch (e) {
    showError(e.message);
  } finally {
    setBtnLoading(btn, false);
  }
}

async function unapproveCandidate(rowIndex, btn) {
  if (!confirm('Desfazer a homologação?\n\nO candidato voltará para o status Pendente.')) return;
  setBtnLoading(btn, true);
  try {
    const r = await apiJSONP('?action=unapproveApplication&rowIndex=' + encodeURIComponent(rowIndex) + '&userRG=' + encodeURIComponent(currentUserRG));
    if (r.success) {
      showSuccess('Homologação desfeita.');
      await loadApprovedCandidates();
    } else {
      showError(r.message || 'Erro');
    }
  } catch (e) {
    showError(e.message);
  } finally {
    setBtnLoading(btn, false);
  }
}

/* ---------- 15. EVENTOS + INIT ---------- */
function setupEventListeners() {
  document.getElementById('btnLogout').addEventListener('click', handleLogout);
  document.getElementById('btnCancelSpecialties')?.addEventListener('click', showProfileSection);
  document.getElementById('btnSaveSpecialties')?.addEventListener('click', saveSpecialties);
  document.getElementById('btnBackFromCourses')?.addEventListener('click', showProfileSection);
  document.getElementById('btnAddDate')?.addEventListener('click', addDate);
  document.getElementById('btnClearDates')?.addEventListener('click', clearDates);
  document.getElementById('btnGenerateVacancies')?.addEventListener('click', generateVacancies);
  document.getElementById('btnViewCandidates')?.addEventListener('click', () => {setFilterActive('btnViewCandidates');loadAllCandidates();});
  document.getElementById('btnViewApproved')?.addEventListener('click', () => {setFilterActive('btnViewApproved');loadApprovedCandidates();});

  document.getElementById('vacanciesHours')?.addEventListener('change', showValuePreview);
  document.getElementById('vacanciesTime')?.addEventListener('change', showValuePreview);
}

document.addEventListener('DOMContentLoaded', async function() {
  supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
  setupEventListeners();
  await checkExistingSession();
});

/* ---------- 16. MODAL TROCA DE SENHA ---------- */
function abrirModalTrocaSenha() {
  const m = document.getElementById('modalTrocaSenha');
  m.classList.remove('hidden');
  setTimeout(() => document.getElementById('novaSenha').focus(), 50);
}
function fecharModalTrocaSenha() {
  const m = document.getElementById('modalTrocaSenha');
  m.classList.add('hidden');
  document.getElementById('novaSenha').value = '';
  document.getElementById('confSenha').value = '';
  document.getElementById('msgTrocaSenha').innerHTML = '';
}

async function sairModal() {
  fecharModalTrocaSenha();
  await handleLogout();
}

async function salvarNovaSenha() {
  const s1 = document.getElementById('novaSenha').value;
  const s2 = document.getElementById('confSenha').value;
  const msg = document.getElementById('msgTrocaSenha');
  const btn = document.getElementById('btnSalvarNovaSenha');
  msg.innerHTML = '';

  if (s1.length < 8) { msg.innerHTML = '<span style="color:var(--danger)">Mínimo 8 caracteres.</span>'; return; }
  if (s1 !== s2) { msg.innerHTML = '<span style="color:var(--danger)">Senhas não coincidem.</span>'; return; }
  if (s1 === `${currentUserRG}cbmgo`) { msg.innerHTML = '<span style="color:var(--danger)">Não pode ser a senha padrão.</span>'; return; }

  setBtnLoading(btn, true);
  try {
    const { error: e1 } = await supabaseClient.auth.updateUser({ password: s1 });
    if (e1) throw new Error('Senha: ' + e1.message);

    let flagOk = false;
    for (let i = 0; i < 3; i++) {
      const { error: e2 } = await supabaseClient
        .from('usuarios')
        .update({ must_change_password: false })
        .eq('rg', currentUserRG);
      if (!e2) { flagOk = true; break; }
      if (i < 2) await new Promise(r => setTimeout(r, 800));
    }

    if (!flagOk) {
      console.error('Flag must_change_password não pôde ser limpa após 3 tentativas');
      msg.innerHTML = '<span style="color:var(--warn);font-weight:600">Senha alterada, mas não conseguimos salvar o status. Faça login novamente com a nova senha.</span>';
      setTimeout(async () => { await handleLogout(); }, 3000);
      return;
    }

    if (userProfile) userProfile.must_change_password = false;
    fecharModalTrocaSenha();
    showSuccess('Senha alterada! Bem-vindo(a).');

    const admin = await apiJSONP('?action=checkAdminPermission&rg=' + encodeURIComponent(currentUserRG));
    if (admin.success && admin.isAdmin) showAdminButton();
    alternarAbaAc4('vagas');
  } catch (err) {
    msg.innerHTML = `<span style="color:var(--danger)">Erro: ${err.message}</span>`;
  } finally {
    setBtnLoading(btn, false);
  }
}
