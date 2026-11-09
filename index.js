/* ============================================================
   CBMGO 193 — Relatório de Falhas (Linha 193)
   Lógica completa. Carregado com defer após shared.js.
   ============================================================ */

/* ---------- 1. CONSTANTES ---------- */
const STORAGE_KEY = 'cbmgo_193_report_v2';
const FOLDER_KEY  = 'rootDir';

const OPERATORS = ['Oi','Vivo','Claro','TIM','Algar','Sercomtel','Embratel','Outra'];
const TEST_ORIGINS = ['Celular','Telefone fixo','VoIP interno (unidade)','Rádio / Outro'];
const TEST_RESULTS = [
  'Chamada completada sem falhas',
  'Falha / Ocupado',
  'Áudio unilateral (apenas uma parte ouve)',
  'Interrupção / queda durante a chamada',
  'Chamada não completada (não conecta)',
  'Áudio de má qualidade (eco, cortes, atraso)',
  'Não foi possível testar',
  'Outro (descrever em observação)'
];

/* ---------- 2. HELPERS DE DATA ---------- */
function pad2(n) { return String(n).padStart(2, '0'); }
function fmtDateTime(v) {
  if (!v) return '—';
  const d = (v instanceof Date) ? v : new Date(v);
  if (isNaN(d.getTime())) return String(v);
  return `${pad2(d.getDate())}/${pad2(d.getMonth()+1)}/${d.getFullYear()} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}
function nowLocalISO() {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}
function fileStamp(d = new Date()) {
  return `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}_${pad2(d.getHours())}-${pad2(d.getMinutes())}`;
}
function monthFolderFromDate(v) {
  if (!v) return 'sem-data';
  const d = (v instanceof Date) ? v : new Date(v);
  if (isNaN(d.getTime())) return 'sem-data';
  return `${d.getFullYear()}-${pad2(d.getMonth()+1)}`;
}

/* ---------- 3. TOAST ---------- */
function toast(msg, type = 'ok', ms = 3800) {
  if (typeof showToastAc4 === 'function') {
    showToastAc4(msg, type === 'ok' ? 'ok' : type, ms);
  } else {
    console.log(`[${type}] ${msg}`);
  }
}

/* ---------- 4. INDEXEDDB (FileSystem handle) ---------- */
let _db = null;
function idbOpen() {
  if (_db) return Promise.resolve(_db);
  return new Promise((res, rej) => {
    const req = indexedDB.open('cbmgo193', 1);
    req.onupgradeneeded = (e) => {
      const d = e.target.result;
      if (!d.objectStoreNames.contains('kv')) d.createObjectStore('kv');
    };
    req.onsuccess = (e) => { _db = e.target.result; res(_db); };
    req.onerror = () => rej(req.error);
  });
}
async function idbSet(key, value) {
  const d = await idbOpen();
  return new Promise((res, rej) => {
    const tx = d.transaction('kv', 'readwrite');
    tx.objectStore('kv').put(value, key);
    tx.oncomplete = () => res();
    tx.onerror = () => rej(tx.error);
  });
}
async function idbGet(key) {
  const d = await idbOpen();
  return new Promise((res, rej) => {
    const tx = d.transaction('kv', 'readonly');
    const r = tx.objectStore('kv').get(key);
    r.onsuccess = () => res(r.result || null);
    r.onerror = () => rej(r.error);
  });
}

/* ---------- 5. FILE SYSTEM ACCESS ---------- */
const FS_API_OK = typeof window.showDirectoryPicker === 'function';

async function ensureRootFolder() {
  if (!FS_API_OK) return null;
  let handle = await idbGet(FOLDER_KEY);
  if (handle) {
    try {
      const state = await handle.queryPermission({ mode: 'readwrite' });
      if (state === 'granted') return handle;
      const asked = await handle.requestPermission({ mode: 'readwrite' });
      if (asked === 'granted') return handle;
    } catch (_) {}
  }
  handle = await window.showDirectoryPicker({ mode: 'readwrite', id: 'cbmgo193' });
  await idbSet(FOLDER_KEY, handle);
  return handle;
}

async function saveWithMonthlyFolder(blob, monthFolder, filename, mime) {
  if (FS_API_OK) {
    try {
      const root = await ensureRootFolder();
      if (root) {
        const monthDir = await root.getDirectoryHandle(monthFolder, { create: true });
        const fileHandle = await monthDir.getFileHandle(filename, { create: true });
        const writable = await fileHandle.createWritable();
        await writable.write(blob);
        await writable.close();
        toast(`📁 Salvo em ${monthFolder}/${filename}`, 'ok');
        return { method: 'fs-api', path: `${monthFolder}/${filename}` };
      }
    } catch (e) {
      if (e && e.name === 'AbortError') {
        toast('Salvamento cancelado.', 'warn', 2200);
        return { method: 'abort' };
      }
      console.warn('File System Access falhou, usando download:', e);
    }
  }
  const downloadName = `${monthFolder}__${filename}`;
  downloadBlob(blob, downloadName, mime);
  toast(`📥 Download: ${downloadName}`, 'ok');
  return { method: 'download', path: downloadName };
}

function downloadBlob(blob, filename, mime) {
  const b = (mime && blob.type !== mime) ? new Blob([blob], { type: mime }) : blob;
  const url = URL.createObjectURL(b);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

/* ---------- 6. TESTES DINÂMICOS ---------- */
function addTest(prefill = {}) {
  const container = document.getElementById('testsContainer');
  const div = document.createElement('div');
  div.className = 'card test-card';
  div.innerHTML = `
    <div class="header">
      <strong class="testTitle">Teste</strong>
      <button type="button" class="small danger" onclick="removeTest(this)" title="Remover este teste">Remover</button>
    </div>
    <div class="row">
      <div class="col">
        <label>Tipo de origem <span class="req">*</span></label>
        <select class="testOriginType" required>
          <option value="">Selecione</option>
          ${TEST_ORIGINS.map(o => `<option>${o}</option>`).join('')}
        </select>
      </div>
      <div class="col">
        <label>Número de origem <span class="req">*</span></label>
        <input type="tel" class="originNumber" required placeholder="Ex: (64) 99999-0000">
      </div>
    </div>
    <div class="row">
      <div class="col">
        <label>Operadora da linha de origem <span class="req">*</span></label>
        <select class="originOperator" required>
          <option value="">Selecione</option>
          ${OPERATORS.map(o => `<option>${o}</option>`).join('')}
        </select>
      </div>
      <div class="col">
        <label>Data e hora do teste <span class="req">*</span></label>
        <input type="datetime-local" class="testDate" required>
      </div>
    </div>
    <div class="row">
      <div class="col">
        <label>Resultado do teste <span class="req">*</span></label>
        <select class="testResult" required>
          <option value="">Selecione</option>
          ${TEST_RESULTS.map(o => `<option>${o}</option>`).join('')}
        </select>
      </div>
      <div class="col">
        <label>Observação <span class="hint">(opcional)</span></label>
        <input type="text" class="testNote" placeholder="Ex: caiu após 15s; áudio mudo para o atendente">
      </div>
    </div>
  `;
  container.appendChild(div);

  if (prefill && Object.keys(prefill).length) {
    div.querySelector('.testOriginType').value = prefill.originType || '';
    div.querySelector('.originNumber').value   = prefill.originNumber || '';
    div.querySelector('.originOperator').value = prefill.originOperator || '';
    div.querySelector('.testDate').value       = prefill.testDate || '';
    div.querySelector('.testResult').value     = prefill.testResult || '';
    div.querySelector('.testNote').value       = prefill.testNote || '';
  }
  renumberTests();
  saveDraft();
}

function removeTest(btn) {
  const card = btn.closest('.test-card');
  if (card) card.remove();
  renumberTests();
  saveDraft();
}

function renumberTests() {
  const cards = document.querySelectorAll('#testsContainer .test-card');
  cards.forEach((c, i) => {
    const t = c.querySelector('.testTitle');
    if (t) t.textContent = `Teste ${i + 1}`;
  });

  const badge = document.getElementById('testCount');
  if (badge) {
    badge.textContent = `${cards.length} teste(s)`;
    badge.classList.toggle('ok', cards.length >= 3);
    badge.classList.toggle('warn', cards.length > 0 && cards.length < 3);
  }

  const side = document.getElementById('testCountSide');
  if (side) side.textContent = cards.length;

  const warn = document.getElementById('testWarning');
  if (warn) {
    if (cards.length >= 3) {
      warn.textContent = `✅ Mínimo obrigatório atingido (${cards.length} testes).`;
      warn.className = 'status saved test-warning';
    } else if (cards.length === 0) {
      warn.textContent = '⚠️ Obrigatório: mínimo 3 testes.';
      warn.className = 'status error test-warning';
    } else {
      warn.textContent = `⚠️ Faltam ${3 - cards.length} teste(s) para atingir o mínimo (3).`;
      warn.className = 'status error test-warning';
    }
  }
}

/* ---------- 7. COLETA / VALIDAÇÃO ---------- */
function val(sel) {
  const el = document.querySelector(sel);
  return el ? el.value.trim() : '';
}

function collectData() {
  const tests = [...document.querySelectorAll('#testsContainer .test-card')].map(t => ({
    originType:     t.querySelector('.testOriginType').value,
    originNumber:   t.querySelector('.originNumber').value.trim(),
    originOperator: t.querySelector('.originOperator').value,
    testDate:       t.querySelector('.testDate').value,
    testResult:     t.querySelector('.testResult').value,
    testNote:       t.querySelector('.testNote').value.trim()
  }));

  return {
    schema: 'cbmgo.193.failure-report/v2',
    generatedAt: new Date().toISOString(),
    identification: {
      unit:         val('#unit'),
      sector:       val('#sector'),
      lineNumber:   val('#lineNumber'),
      operator:     val('#operator'),
      startDate:    val('#startDate'),
      endDate:      val('#endDate'),
      palliative:   val('#palliative'),
      protocol:     val('#protocol'),
      localContact: val('#localContact')
    },
    failure: {
      type:    val('#failureType'),
      details: val('#failureDetails'),
      impact:  val('#impact')
    },
    tests
  };
}

function validateForm() {
  const form = document.getElementById('reportForm');
  if (!form.reportValidity()) {
    toast('Preencha todos os campos obrigatórios (*).', 'err');
    return false;
  }

  const cards = document.querySelectorAll('#testsContainer .test-card');

  if (cards.length < 3) {
    toast(`Mínimo obrigatório: 3 testes. Registrados: ${cards.length}.`, 'err', 5000);
    document.getElementById('testsContainer').scrollIntoView({ behavior: 'smooth', block: 'start' });
    return false;
  }

  for (let i = 0; i < cards.length; i++) {
    const c = cards[i];
    const faltando = [];
    if (!c.querySelector('.testOriginType').value) faltando.push('tipo de origem');
    if (!c.querySelector('.originNumber').value.trim()) faltando.push('número de origem');
    if (!c.querySelector('.originOperator').value) faltando.push('operadora');
    if (!c.querySelector('.testDate').value) faltando.push('data/hora');
    if (!c.querySelector('.testResult').value) faltando.push('resultado');

    if (faltando.length) {
      toast(`Teste ${i + 1} incompleto — falta: ${faltando.join(', ')}.`, 'err', 5500);
      c.scrollIntoView({ behavior: 'smooth', block: 'center' });
      c.style.outline = '2px solid var(--danger)';
      setTimeout(() => { c.style.outline = ''; }, 2500);
      return false;
    }
  }
  return true;
}

function imprimirRelatorio() {
  if (!validateForm()) return;
  window.print();
}

function updateFolderHint() {
  const hint = document.getElementById('folderHint');
  if (!hint) return;
  const folder = monthFolderFromDate(val('#startDate'));
  hint.innerHTML = `📁 Pasta mensal: <b>${folder}</b>`;
}

/* ---------- 8. PDF (jsPDF) ---------- */
function pdfSetFont(doc, size = 10, style = 'normal', color = [0, 0, 0]) {
  doc.setFont('helvetica', style);
  doc.setFontSize(size);
  doc.setTextColor(color[0], color[1], color[2]);
}
function ensureSpace(doc, y, needed, margin = 14) {
  const ph = doc.internal.pageSize.getHeight();
  if (y + needed > ph - margin) { doc.addPage(); return margin + 4; }
  return y;
}
function addWrappedText(doc, text, x, y, maxWidth, opts = {}) {
  const size = opts.size ?? 10;
  const style = opts.style ?? 'normal';
  const lineHeight = opts.lineHeight ?? 5.5;
  const color = opts.color ?? [0, 0, 0];
  pdfSetFont(doc, size, style, color);
  const safe = String(text ?? '').replace(/[—–]/g, '-');
  const lines = doc.splitTextToSize(safe, maxWidth);
  let cy = y;
  for (const line of lines) {
    cy = ensureSpace(doc, cy, lineHeight);
    doc.text(line, x, cy);
    cy += lineHeight;
  }
  return cy;
}
function addLabelValue(doc, label, value, x, y, maxWidth, lineHeight = 5.5) {
  const labelText = `${label}: `;
  pdfSetFont(doc, 10, 'bold');
  const labelW = doc.getTextWidth(labelText);
  const canPair = (labelW + 30) <= maxWidth;
  if (canPair) {
    y = ensureSpace(doc, y, lineHeight);
    doc.text(labelText, x, y);
    return addWrappedText(doc, value || '-', x + labelW, y, maxWidth - labelW, { lineHeight });
  }
  y = ensureSpace(doc, y, lineHeight);
  doc.text(labelText, x, y);
  return addWrappedText(doc, value || '-', x, y + lineHeight, maxWidth, { lineHeight });
}
function sectionTitle(doc, text, y) {
  y = ensureSpace(doc, y, 10);
  pdfSetFont(doc, 12, 'bold', [179, 0, 0]);
  doc.text(text, 10, y);
  return y + 9;
}

async function exportPDF() {
  if (!validateForm()) return;
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  pdfSetFont(doc, 10, 'normal');
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const maxW = pageW - 20;
  const r = collectData();
  const now = new Date();
  let y = 18;

  y = addWrappedText(doc, 'Relatorio de Falhas - Linha de Emergencia 193', 10, y, maxW,
    { size: 14, style: 'bold', color: [179, 0, 0], lineHeight: 7 });
  y = addWrappedText(doc, 'CBMGO - Corpo de Bombeiros Militar do Estado de Goias / BM/6 (TIC)', 10, y, maxW, { size: 9 });
  y = addWrappedText(doc, `Gerado em: ${fmtDateTime(now)}`, 10, y, maxW, { size: 9 });

  y += 4;
  y = sectionTitle(doc, 'I. Identificacao basica e descricao geral', y);
  const idPairs = [
    ['Unidade Operacional', r.identification.unit],
    ['Setor afetado', r.identification.sector],
    ['Numero da linha / ramal', r.identification.lineNumber],
    ['Operadora responsavel', r.identification.operator],
    ['Inicio da falha', fmtDateTime(r.identification.startDate)],
    ['Fim da falha', fmtDateTime(r.identification.endDate)],
    ['Medidas paliativas', r.identification.palliative || '-'],
    ['Protocolo da operadora', r.identification.protocol || '-'],
    ['Contato local', r.identification.localContact]
  ];
  for (const [label, value] of idPairs) y = addLabelValue(doc, label, value, 10, y, maxW);

  y += 4;
  y = sectionTitle(doc, 'II. Classificacao e descricao especifica da falha', y);
  y = addLabelValue(doc, 'Tipo de falha', r.failure.type || '-', 10, y, maxW);
  y = addWrappedText(doc, 'Detalhes observados:', 10, y, maxW, { style: 'bold' });
  y = addWrappedText(doc, r.failure.details || '-', 10, y, maxW);
  if (r.failure.impact) {
    y = addWrappedText(doc, 'Impacto operacional:', 10, y, maxW, { style: 'bold' });
    y = addWrappedText(doc, r.failure.impact, 10, y, maxW);
  }

  y += 4;
  y = sectionTitle(doc, `III. Testes realizados (${r.tests.length})`, y);
  if (r.tests.length === 0) y = addWrappedText(doc, '(Nenhum teste registrado.)', 10, y, maxW, { style: 'italic' });
  r.tests.forEach((t, i) => {
    y = ensureSpace(doc, y, 25);
    y = addWrappedText(doc, `${i + 1}) ${t.originType || '-'} - ${t.originNumber || '-'} (${t.originOperator || '-'})`, 10, y, maxW, { style: 'bold' });
    y = addWrappedText(doc, `Data/hora: ${fmtDateTime(t.testDate)}`, 14, y, maxW - 4);
    y = addWrappedText(doc, `Resultado: ${t.testResult || '-'}`, 14, y, maxW - 4);
    if (t.testNote) y = addWrappedText(doc, `Observacao: ${t.testNote}`, 14, y, maxW - 4);
    y += 3;
  });

  const pageCount = doc.internal.getNumberOfPages();
  for (let p = 1; p <= pageCount; p++) {
    doc.setPage(p);
    pdfSetFont(doc, 8, 'normal', [120, 120, 120]);
    doc.text(`Pagina ${p} de ${pageCount} - Relatorio 193 / CBMGO`, pageW / 2, pageH - 8, { align: 'center' });
  }

  const blob = doc.output('blob');
  const unitSlug = (r.identification.unit || 'unidade').replace(/[^\w]+/g, '_');
  const folder = monthFolderFromDate(r.identification.startDate);
  const stamp = fileStamp(now);
  const filename = `Relatorio_193_${unitSlug}_${stamp}.pdf`;
  await saveWithMonthlyFolder(blob, folder, filename, 'application/pdf');
}

/* ---------- 9. JSON (export / import) ---------- */
async function downloadJSON() {
  if (!validateForm()) return;
  const data = collectData();
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const folder = monthFolderFromDate(data.identification.startDate);
  const filename = `relatorio_193_${fileStamp()}.json`;
  await saveWithMonthlyFolder(blob, folder, filename, 'application/json');
}

function triggerImportJSON() {
  document.getElementById('importFile').click();
}

function loadData(data) {
  if (!data || typeof data !== 'object') return;
  const id = data.identification || {};
  setVal('#unit', id.unit);
  setVal('#sector', id.sector);
  setVal('#lineNumber', id.lineNumber);
  setVal('#operator', id.operator);
  setVal('#startDate', id.startDate);
  setVal('#endDate', id.endDate);
  setVal('#palliative', id.palliative);
  setVal('#protocol', id.protocol);
  setVal('#localContact', id.localContact);

  const f = data.failure || {};
  setVal('#failureType', f.type);
  setVal('#failureDetails', f.details);
  setVal('#impact', f.impact);

  const container = document.getElementById('testsContainer');
  container.innerHTML = '';
  const tests = Array.isArray(data.tests) ? data.tests : [];
  if (tests.length === 0) addTest();
  else tests.forEach(addTest);
  saveDraft();
  updateFolderHint();
}

function setVal(sel, value) {
  const el = document.querySelector(sel);
  if (!el || value == null) return;
  if (el.tagName === 'SELECT') {
    const opt = [...el.options].find(o => o.value === value);
    if (opt) el.value = value;
  } else el.value = value;
}

/* ---------- 10. AUTOSAVE ---------- */
let saveTimer = null;
function saveDraft() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try {
      const data = collectData();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      const s = document.getElementById('autosaveStatus');
      s.textContent = '💾 Salvo ' + fmtDateTime(new Date()).slice(-5);
      s.className = 'status saved';
    } catch (e) {
      const s = document.getElementById('autosaveStatus');
      s.textContent = 'Não foi possível salvar: ' + e.message;
      s.className = 'status error';
    }
  }, 400);
}

function restoreDraft() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const data = JSON.parse(raw);
    if (data.schema !== 'cbmgo.193.failure-report/v2') {
      localStorage.removeItem(STORAGE_KEY);
      return false;
    }
    loadData(data);
    return true;
  } catch (e) {
    localStorage.removeItem(STORAGE_KEY);
    return false;
  }
}

function clearForm(confirmFirst) {
  if (confirmFirst && !confirm('Limpar todos os dados do formulário? Esta ação não pode ser desfeita.')) return;
  document.getElementById('reportForm').reset();
  document.getElementById('testsContainer').innerHTML = '';
  for (let i = 0; i < 3; i++) addTest();
  localStorage.removeItem(STORAGE_KEY);
  const s = document.getElementById('autosaveStatus');
  if (s) { s.textContent = ''; s.className = 'status'; }
  updateFolderHint();
}

/* ---------- 11. INIT ---------- */
document.addEventListener('DOMContentLoaded', () => {
  // Liga listeners
  document.getElementById('reportForm').addEventListener('input', saveDraft);
  document.getElementById('reportForm').addEventListener('change', saveDraft);
  document.addEventListener('input', (e) => {
    if (e.target && e.target.id === 'startDate') updateFolderHint();
  });
  document.getElementById('importFile').addEventListener('change', (ev) => {
    const file = ev.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        loadData(data);
        toast('Relatório carregado com sucesso.', 'ok');
      } catch (err) {
        toast('Arquivo JSON inválido: ' + err.message, 'err');
      }
      ev.target.value = '';
    };
    reader.readAsText(file);
  });

  // Restaura ou cria 3 testes
  try {
    const restored = restoreDraft();
    if (!restored) { for (let i = 0; i < 3; i++) addTest(); }
  } catch (e) {
    console.error('Falha ao restaurar rascunho:', e);
    localStorage.removeItem(STORAGE_KEY);
    for (let i = 0; i < 3; i++) addTest();
  }

  // Preenche data inicial
  const start = document.getElementById('startDate');
  if (start && !start.value) start.value = nowLocalISO();
  updateFolderHint();
});
