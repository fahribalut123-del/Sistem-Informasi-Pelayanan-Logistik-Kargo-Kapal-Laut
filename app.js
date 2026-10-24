'use strict';
/* ============================================================
   Cargo & Port Logistics Scheduler — app.js
   PT Logistik Nusantara | Rute Gorontalo → Surabaya
   01–30 November 2025
   ============================================================ */

/* ---------------- Konstanta & Data ---------------- */
const PERIOD = { start: '2025-11-01', end: '2025-11-30', days: 30 };
const PROJECT_START = '2025-11-03';
const VESSEL = 'KM Nusantara Perdana';
const MONTHS = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des','Jan','Feb'];
const WD = ['Min','Sen','Sel','Rab','Kam','Jum','Sab'];
const LS_KEY = 'ln_manifest_v2';
const LS_TASKS = 'ln_tasks_v1';
const LS_TEAM = 'ln_team_v1';
const LS_SESSION = 'ln_session_v1';

/* Status progres tahapan (dipakai tabel status + form manajemen tugas) */
const TASK_STATUS = { 'Belum Dimulai':'ts-belum', 'Berjalan':'ts-jalan', 'Selesai':'ts-selesai' };

const SEED_TEAM = [
  { id:'PM', name:'Budi Santoso',  role:'Port Manager',          color:'#0f2440',
    duties:['Pengawasan operasi terminal','Penetapan jadwal keberangkatan','Escalasi ke otoritas pelabuhan'] },
  { id:'V1', name:'Andi Pratama',  role:'Verifikator',           color:'#0e8f8f',
    duties:['Validasi dokumen manifes','Pemeriksaan fisik kargo','Pengesahan bea cukai'] },
  { id:'V2', name:'Siti Rahayu',   role:'Verifikator',           color:'#0b6fa4',
    duties:['Validasi dokumen manifes','Pemeriksaan fisik kargo','Pengesahan bea cukai'] },
  { id:'C1', name:'Rudi Hartono',  role:'Operator Crane',        color:'#f59e0b',
    duties:['Operasi gantry / stuffing','Pengaturan spreader','Simpan & lashing kontainer'] },
  { id:'C2', name:'Joko Susilo',   role:'Operator Crane',        color:'#d97706',
    duties:['Operasi gantry / stuffing','Pengaturan spreader','Simpan & lashing kontainer'] },
  { id:'C3', name:'Marco Wijaya',  role:'Operator Crane',        color:'#b45309',
    duties:['Operasi gantry / stuffing','Pengaturan spreader','Simpan & lashing kontainer'] },
  { id:'L1', name:'Dewi Lestari',  role:'Logistics Coordinator', color:'#16a34a',
    duties:['Koordinasi trucking & gudang','Update status manifes','Sinkronisasi dengan penerima'] },
  { id:'L2', name:'Fajar Nugroho', role:'Logistics Coordinator', color:'#0f7a3a',
    duties:['Koordinasi trucking & gudang','Update status manifes','Sinkronisasi dengan penerima'] }
];

const SEED_TASKS = [
  { id:'T1', name:'Registrasi & Penimbangan Kargo', dur:2, deps:[], team:['V1','V2','L1'],
    desc:'Pendaftaran booking, penimbatan bruto/netto, dan pencetakan dokumen muat (Booking Note & Weight Ticket) di terminal Gorontalo.' },
  { id:'T2', name:'Pemeriksaan Dokumen & Bea Cukai', dur:3, deps:[{ type:'SS', lag:2, pred:'T1' }], team:['V1','V2','PM'],
    desc:'Verifikasi invoice, packing list, dan Certificate of Origin disertai pemeriksaan fisik oleh bea cukai. Mulai 2 hari kerja setelah registrasi dimulai (overlap dengan tahapan T1).' },
  { id:'T3', name:'Pengepakan & Labeling Kontainer', dur:2, deps:[{ type:'FS', lag:0, pred:'T1' }], team:['L1','L2','V1'],
    desc:'Stuffing barang ke kontainer, pemasangan segel (seal number), dan pemasangan label pengiriman sesuai manifes.' },
  { id:'T4', name:'Muat Kontainer ke Kapal (Loading)', dur:3, deps:[{ type:'FS', lag:0, pred:'T2' },{ type:'FS', lag:0, pred:'T3' }], team:['C1','C2','C3','L2'],
    desc:'Operasi gantry crane memuat kontainer ke lambung KM Nusantara Perdana, termasuk stowage plan dan lashing.' },
  { id:'T5', name:'Pelayaran Gorontalo → Surabaya', dur:8, deps:[{ type:'FS', lag:0, pred:'T4' }], team:['PM','L2'],
    desc:'Pelayaran samudra rute Gorontalo – Surabaya dengan estimasi 8 hari kerja, termasuk pemantauan posisi kapal dan pemberitahuan ETA ke penerima.' },
  { id:'T6', name:'Pembongkaran di Pelabuhan Surabaya', dur:3, deps:[{ type:'FS', lag:0, pred:'T5' }], team:['C1','C2','C3'],
    desc:'Discharge kontainer dari kapal ke lapangan penumpukan Tanjung Perak beserta pencocokan nomor kontainer dengan manifes.' },
  { id:'T7', name:'Pemeriksaan Akhir & Dokumen Turun', dur:2, deps:[{ type:'SS', lag:1, pred:'T6' }], team:['V1','V2'],
    desc:'Pemeriksaan akhir kargo dan pengurusan dokumen turun (Delivery Order, Surat Jalan) — mulai 1 hari kerja setelah pembongkaran dimulai.' },
  { id:'T8', name:'Serah Terima ke Penerima (Delivery)', dur:2, deps:[{ type:'FS', lag:0, pred:'T6' },{ type:'FS', lag:0, pred:'T7' }], team:['L1','L2'],
    desc:'Pengiriman last-mile ke alamat penerima, penandatanganan Bukti Serah Terima (Proof of Delivery), dan penutupan manifes.' }
];

const SAMPLE_MANIFEST = [
  { id:1, container:'LNSU-1001', shipper:'PT Kopi Gorontalo',        commodity:'Biji Kopi Robusta',    qty:18.5, consignee:'CV Surya Niaga',      status:'Dimuat' },
  { id:2, container:'LNSU-1002', shipper:'Koperasi Jagung Tomini',   commodity:'Jagung Pipil',         qty:22.0, consignee:'PT Pangan Jaya',      status:'Dalam Perjalanan' },
  { id:3, container:'LNSU-1003', shipper:'PT Sawit Sulawesi Utara',  commodity:'CPO (Crude Palm Oil)', qty:24.0, consignee:'PT Minyak Nusantara', status:'Dalam Perjalanan' },
  { id:4, container:'LNSU-1004', shipper:'CV Hasil Laut Gorontalo',  commodity:'Ikan Beku Fillet',     qty:15.2, consignee:'PT Segar Bahari',     status:'Dimuat' },
  { id:5, container:'LNSU-1005', shipper:'PT Semen Gorontalo',       commodity:'Semen Curah',          qty:25.0, consignee:'PT Bangun Jaya',      status:'Diperiksa' },
  { id:6, container:'LNSU-1006', shipper:'Koperasi Kopi Bone Bolango',commodity:'Biji Kopi Arabika',    qty:9.8,  consignee:'CV Aroma Mulia',      status:'Terdaftar' },
  { id:7, container:'LNSU-1007', shipper:'PT Rempah Nusantara',      commodity:'Cengkeh Kering',       qty:11.4, consignee:'PT Bumbu Prima',      status:'Tiba' },
  { id:8, container:'LNSU-1008', shipper:'PT Buah Nusantara',        commodity:'Pisang Cavendish',     qty:17.6, consignee:'CV Tunggal Niaga',    status:'Serah Terima' }
];

const STATUS_CLS = { 'Terdaftar':'st-terdaftar','Diperiksa':'st-diperiksa','Dimuat':'st-dimuat',
  'Dalam Perjalanan':'st-dalam','Tiba':'st-tiba','Serah Terima':'st-serah' };

let customHolidays = [ { date:'2025-11-10', label:'Hari Pahlawan (libur nasional)' } ];
let manifest = loadManifest();
let TEAM = loadTeam();           // data tim (bisa ditambah Admin, tersimpan di localStorage)
let TASKS = loadTasks();         // data tahapan + status progres (CRUD Admin)
let selectedTaskId = TASKS.length ? TASKS[0].id : null;
let schedule = null;
let currentUser = null;          // sesi login aktif (Admin / Staf)

/* ---------------- Utilitas ---------------- */
const $  = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));

function esc(s){
  return String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
}
function parseDate(str){ const p = str.split('-').map(Number); return new Date(p[0], p[1]-1, p[2]); }
function dateKey(dt){ return dt.getFullYear() + '-' + String(dt.getMonth()+1).padStart(2,'0') + '-' + String(dt.getDate()).padStart(2,'0'); }
function addDays(dt, n){ const c = new Date(dt.getFullYear(), dt.getMonth(), dt.getDate()); c.setDate(c.getDate()+n); return c; }
function fmtDate(dt){ return String(dt.getDate()).padStart(2,'0') + ' ' + MONTHS[dt.getMonth()] + ' ' + dt.getFullYear(); }
function fmtShort(dt){ return String(dt.getDate()).padStart(2,'0') + ' ' + MONTHS[dt.getMonth()]; }
function fmtNum(n){ return Number(n).toLocaleString('id-ID', { maximumFractionDigits:1 }); }
function initials(name){ return name.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase(); }
function member(id){
  return TEAM.find(m => m.id === id) ||
    { id, name: 'Personel ' + id, role: '—', color: '#64748b', duties: [] };
}
/* Persentase progres tugas (% Completed, rentang 0–100). */
function clampPct(v){
  const n = parseInt(v, 10);
  if (isNaN(n)) return null;
  return Math.max(0, Math.min(100, n));
}
function taskPct(t){
  const p = clampPct(t && t.pct);
  if (p != null) return p;
  return t && t.status === 'Selesai' ? 100 : 0;   // default mengikuti status
}

/* ---------------- Persistensi tim & tahapan ---------------- */
function loadStored(key){
  try { const raw = localStorage.getItem(key); if (raw){ const v = JSON.parse(raw); if (v) return v; } }
  catch (e){ /* localStorage tidak tersedia / data korup */ }
  return null;
}
function sanitizeTasks(arr){
  if (!Array.isArray(arr) || !arr.length) return null;
  const ids = {}, out = [];
  arr.forEach(t => {
    if (!t || typeof t.id !== 'string' || typeof t.name !== 'string' || !t.name.trim()) return;
    if (ids[t.id]) return;
    ids[t.id] = true;
    // Nilai status lama ('Belum Mulai') otomatis dimigrasikan ke 'Belum Dimulai'
    const st = TASK_STATUS[t.status] ? t.status : 'Belum Dimulai';
    const p = parseInt(t.pct, 10);
    out.push({
      id: t.id, name: t.name,
      dur: Math.max(1, Math.min(30, parseInt(t.dur, 10) || 1)),
      deps: Array.isArray(t.deps) ? t.deps : [],
      team: Array.isArray(t.team) ? t.team : [],
      status: st,
      pct: (p >= 0 && p <= 100) ? p : (st === 'Selesai' ? 100 : 0),   // % Completed
      desc: typeof t.desc === 'string' ? t.desc : ''
    });
  });
  if (!out.length) return null;
  // buang dependensi yang menunjuk id tidak dikenal / ke dirinya sendiri (data lama)
  out.forEach(t => {
    t.deps = t.deps
      .filter(d => d && ids[d.pred] && d.pred !== t.id)
      .map(d => ({ pred: d.pred, type: d.type === 'SS' ? 'SS' : 'FS', lag: Math.max(0, parseInt(d.lag, 10) || 0) }));
  });
  return out;
}
function loadTasks(){
  return sanitizeTasks(loadStored(LS_TASKS)) || sanitizeTasks(SEED_TASKS);
}
function saveTasks(){
  try { localStorage.setItem(LS_TASKS, JSON.stringify(TASKS)); return true; }
  catch (e){ return false; }
}
function sanitizeTeam(arr){
  if (!Array.isArray(arr) || !arr.length) return null;
  const ids = {}, out = [];
  arr.forEach(m => {
    if (!m || typeof m.id !== 'string' || typeof m.name !== 'string' || !m.name.trim() || ids[m.id]) return;
    ids[m.id] = true;
    out.push({ id: m.id, name: m.name,
      role: typeof m.role === 'string' && m.role ? m.role : 'Operator Crane',
      color: typeof m.color === 'string' && m.color ? m.color : '#0e8f8f',
      duties: Array.isArray(m.duties) ? m.duties.slice(0, 6) : [] });
  });
  return out.length ? out : null;
}
function loadTeam(){
  return sanitizeTeam(loadStored(LS_TEAM)) || SEED_TEAM;
}
function saveTeam(){
  try { localStorage.setItem(LS_TEAM, JSON.stringify(TEAM)); return true; }
  catch (e){ return false; }
}

/* ---------------- Penanganan error global ---------------- */
function showErrorBanner(msg){
  let b = document.getElementById('js-error');
  if (!b){
    b = document.createElement('div');
    b.id = 'js-error';
    b.className = 'js-error no-print';
    b.innerHTML = '<strong>Aplikasi menemui kesalahan.</strong><span class="js-error-msg"></span>' +
      '<button class="btn small ghost" type="button" id="js-error-close">Tutup</button>';
    document.body.appendChild(b);
    b.querySelector('#js-error-close').addEventListener('click', () => { b.hidden = true; });
  }
  b.querySelector('.js-error-msg').textContent = ' ' + msg;
  b.hidden = false;
}
window.addEventListener('error', e => {
  showErrorBanner((e.message || 'kesalahan tak dikenal') + ' (' + (e.filename || '').split('/').pop() + ':' + (e.lineno || 0) + ')');
});
window.addEventListener('unhandledrejection', e => {
  showErrorBanner('Promise ditolak: ' + ((e.reason && e.reason.message) || e.reason));
});
function task(id){ return TASKS.find(t => t.id === id); }
function depLabel(d){ return d.type === 'FS' ? (d.lag ? 'FS + ' + d.lag : 'FS') : 'SS + ' + (d.lag || 0); }

/* ---------------- Kalender operasional ---------------- */
function isCustomHoliday(dt){ return customHolidays.some(h => h.date === dateKey(dt)); }
function holidayLabel(dt){ const h = customHolidays.find(h => h.date === dateKey(dt)); return h ? h.label : ''; }
function isOffDay(dt){ return dt.getDay() === 0 || isCustomHoliday(dt); }   // Minggu + libur custom
function isWorkDay(dt){ return !isOffDay(dt); }

function buildWorkDays(){
  const arr = [];
  let dt = parseDate(PERIOD.start);
  const stop = addDays(parseDate(PERIOD.end), 90);   // buffer untuk dampak what-if
  while (dt <= stop){ if (isWorkDay(dt)) arr.push(new Date(dt)); dt = addDays(dt, 1); }
  return arr;
}

/* ---------------- CPM (forward & backward pass) ---------------- */
function topoSort(tasks){
  const indeg = {}, succ = {}, order = [];
  tasks.forEach(t => { indeg[t.id] = 0; succ[t.id] = []; });
  tasks.forEach(t => t.deps.forEach(d => { indeg[t.id] += 1; succ[d.pred].push(t.id); }));
  const q = tasks.map(t => t.id).filter(id => indeg[id] === 0);
  while (q.length){
    const id = q.shift();
    order.push(tasks.find(t => t.id === id));
    succ[id].forEach(s => { if (--indeg[s] === 0) q.push(s); });
  }
  return order.length === tasks.length ? order : tasks.slice();
}

function computeCPM(durOverride){
  durOverride = durOverride || {};
  const work = buildWorkDays();
  const startIdx0 = Math.max(0, work.findIndex(d => dateKey(d) >= PROJECT_START));
  const dateAt = i => work[startIdx0 + i - 1];
  const order = topoSort(TASKS);
  const succ = {};
  TASKS.forEach(t => succ[t.id] = []);
  TASKS.forEach(t => t.deps.forEach(d => succ[d.pred].push({ id:t.id, type:d.type, lag:d.lag || 0 })));

  const ES = {}, EF = {};
  order.forEach(t => {
    const dur = durOverride[t.id] != null ? durOverride[t.id] : t.dur;
    let es = 1;
    t.deps.forEach(d => {
      if (d.type === 'FS') es = Math.max(es, EF[d.pred] + 1 + (d.lag || 0));
      else                 es = Math.max(es, ES[d.pred] + (d.lag || 0));
    });
    ES[t.id] = es; EF[t.id] = es + dur - 1;
  });

  const end = Math.max.apply(null, TASKS.map(t => EF[t.id]));
  const LS = {}, LF = {}, TF = {};
  order.slice().reverse().forEach(t => {
    const dur = durOverride[t.id] != null ? durOverride[t.id] : t.dur;
    let ls = end - dur + 1;
    succ[t.id].forEach(s => {
      if (s.type === 'FS') ls = Math.min(ls, LS[s.id] - s.lag - dur);
      else                 ls = Math.min(ls, LS[s.id] - s.lag);
    });
    LS[t.id] = ls; LF[t.id] = ls + dur - 1; TF[t.id] = ls - ES[t.id];
  });

  const chain = order.filter(t => TF[t.id] === 0);
  return { work, dateAt, ES, EF, LS, LF, TF, end, order, succ, chain };
}

/* ---------------- Statistik manifes ---------------- */
function manifestStats(){
  const total = manifest.reduce((a, r) => a + (Number(r.qty) || 0), 0);
  return { count: manifest.length, total: total };
}

/* ---------------- Render: statistik dashboard ---------------- */
function statCard(k, v, s, cls){
  return '<div class="stat ' + (cls || '') + '"><div class="k">' + esc(k) + '</div><div class="v">' + v + '</div><div class="s">' + esc(s) + '</div></div>';
}
function renderStats(){
  const s = schedule;
  const crit = TASKS.filter(t => s.TF[t.id] === 0).length;
  const suns = countSundays();
  // Tahapan pelayaran (T5 pada data awal) — dipilih dinamis agar statistik
  // tetap valid walau Admin mengubah/menghapus tahapan via Manajemen Tugas.
  const voyage = TASKS.find(t => t.id === 'T5') ||
    TASKS.find(t => /pelayaran/i.test(t.name)) || s.order[s.order.length - 1];
  const dep = voyage ? s.dateAt(s.ES[voyage.id]) : null;
  const arr = voyage ? s.dateAt(s.EF[voyage.id]) : null;
  const from = s.dateAt(1), to = s.dateAt(s.end);
  $('#stat-grid').innerHTML =
    statCard('Total Tahapan', TASKS.length, 'Alur manifes Gorontalo → Surabaya') +
    statCard('Durasi Proyek', s.end + ' hari',
      (from && to ? fmtDate(from) + ' → ' + fmtDate(to) : '—') + ' (hari kerja)', 'info') +
    statCard('Keberangkatan', dep ? fmtShort(dep) : '—',
      'Pelayaran ' + VESSEL + (voyage ? ' · ' + voyage.id : ''), 'warn') +
    statCard('Estimasi Tiba', arr ? fmtShort(arr) : '—', 'Sandar di Pelabuhan Surabaya', 'info') +
    statCard('Tahapan Kritis', crit + ' / ' + TASKS.length, 'Total Float = 0', 'crit') +
    statCard('Hari Libur', suns + customHolidays.length, 'Minggu + libur custom (Sabtu kerja)');
}

function countSundays(){
  let n = 0;
  let dt = parseDate(PERIOD.start), end = parseDate(PERIOD.end);
  while (dt <= end){ if (dt.getDay() === 0) n++; dt = addDays(dt, 1); }
  return n;
}

/* ---------------- Render: aturan kalender ---------------- */
function renderHolidays(){
  const box = $('#holiday-list');
  let html = '';
  let dt = parseDate(PERIOD.start), end = parseDate(PERIOD.end);
  while (dt <= end){
    if (dt.getDay() === 0){
      html += '<div class="rule"><div class="rule-main"><span class="rule-date">' + fmtShort(dt) +
              '</span><span class="rule-label">Minggu — libur bongkar muat</span><span class="rule-tag tag-sun">Minggu</span></div></div>';
    }
    dt = addDays(dt, 1);
  }
  customHolidays.slice().sort((a,b) => a.date < b.date ? -1 : 1).forEach(h => {
    const d = parseDate(h.date);
    html += '<div class="rule"><div class="rule-main"><span class="rule-date">' + fmtShort(d) +
            '</span><span class="rule-label">' + esc(h.label) + '</span><span class="rule-tag tag-custom">Custom</span></div>' +
            '<button class="row-del no-print" type="button" data-del-holiday="' + h.date + '">Hapus</button></div>';
  });
  box.innerHTML = html;
}

/* ---------------- Render: Gantt ---------------- */
function colOf(dt){
  const p0 = parseDate(PERIOD.start);
  const diff = Math.round((dt - p0) / 86400000);
  return Math.max(0, Math.min(PERIOD.days, diff));
}
function dayRangeLabel(a, b){
  if (a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear())
    return a.getDate() + '–' + b.getDate() + ' ' + MONTHS[b.getMonth()] + ' ' + b.getFullYear();
  return fmtDate(a) + ' → ' + fmtDate(b);
}

function renderGantt(){
  const s = schedule;
  const N = PERIOD.days;
  let html = '<div class="gantt-inner" id="gantt-inner">';
  html += '<div class="gantt-head"><div class="g-head-label">Tahapan (CPM)</div><div class="g-head-days" style="--cols:' + N + '">';
  let dt = parseDate(PERIOD.start);
  for (let i = 0; i < N; i++, dt = addDays(dt, 1)){
    const cls = isCustomHoliday(dt) ? 'hol' : (dt.getDay() === 0 ? 'off' : '');
    html += '<div class="g-day ' + cls + '"><span class="wd">' + WD[dt.getDay()] + '</span><span class="dn">' + dt.getDate() + '</span></div>';
  }
  html += '</div></div>';

  s.order.forEach(t => {
    const a = s.dateAt(s.ES[t.id]), b = s.dateAt(s.EF[t.id]);
    const c1 = colOf(a), c2 = colOf(b);
    const span = Math.max(1, Math.min(c2 + 1, N) - c1);
    const overflow = c2 >= N;
    const crit = s.TF[t.id] === 0;
    const left = (c1 / N * 100).toFixed(4), width = (span / N * 100).toFixed(4);
    html += '<div class="gantt-row' + (t.id === selectedTaskId ? ' selected' : '') + '" data-id="' + t.id + '">';
    html += '<div class="g-label"><div class="t"><span class="code-chip">' + t.id + '</span> ' + esc(t.name) + '</div>' +
            '<div class="m"><span>' + t.dur + ' hari kerja</span><span>' + dayRangeLabel(a, b) + '</span>' +
            (crit ? '<span class="badge crit">Kritis</span>' : '<span class="badge warn">TF ' + s.TF[t.id] + '</span>') + '</div></div>';
    html += '<div class="g-track">';
    for (let i = 0; i < N; i++){
      const d = addDays(parseDate(PERIOD.start), i);
      const cls = isCustomHoliday(d) ? 'hol' : (d.getDay() === 0 ? 'off' : '');
      if (cls) html += '<div class="g-cell ' + cls + '" style="left:' + (i / N * 100).toFixed(4) + '%;width:' + (100 / N).toFixed(4) + '%"></div>';
    }
    html += '<div class="bar' + (crit ? ' critical' : '') + (overflow ? ' overflow' : '') + (t.id === selectedTaskId ? ' selected' : '') +
            '" data-id="' + t.id + '" style="left:' + left + '%;width:' + width + '%">' + t.dur + ' hari' +
            (span >= 3 ? '<span class="bar-tag">' + (crit ? 'KRITIS' : 'TF ' + s.TF[t.id]) + '</span>' : '') + '</div>';
    html += '</div></div>';
  });
  html += '<svg id="gantt-links" xmlns="http://www.w3.org/2000/svg"></svg></div>';
  $('#gantt').innerHTML = html;
  drawGanttLinks();
}

function drawGanttLinks(){
  const inner = document.getElementById('gantt-inner');
  const svg = document.getElementById('gantt-links');
  if (!inner || !svg) return;
  const rows = {};
  inner.querySelectorAll('.gantt-row').forEach(r => { rows[r.dataset.id] = r; });
  const W = inner.offsetWidth, H = inner.offsetHeight;
  svg.setAttribute('width', W); svg.setAttribute('height', H);
  svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
  svg.style.width = W + 'px'; svg.style.height = H + 'px';
  let out = '<defs>' +
    '<marker id="ga" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" markerUnits="userSpaceOnUse" orient="auto"><path d="M0 0 L8 4 L0 8 z" fill="#7c8ba1"/></marker>' +
    '<marker id="ga-c" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" markerUnits="userSpaceOnUse" orient="auto"><path d="M0 0 L8 4 L0 8 z" fill="#d8383d"/></marker>' +
    '</defs>';
  TASKS.forEach(t => t.deps.forEach(dep => {
    const pr = rows[dep.pred], sr = rows[t.id];
    if (!pr || !sr) return;
    const pt = pr.querySelector('.g-track'), st = sr.querySelector('.g-track');
    const pb = pt.querySelector('.bar'), sb = st.querySelector('.bar');
    if (!pb || !sb) return;
    let x1, y1;
    if (dep.type === 'FS'){
      x1 = pt.offsetLeft + pb.offsetLeft + pb.offsetWidth;
      y1 = pr.offsetTop + pb.offsetTop + pb.offsetHeight / 2;
    } else {
      x1 = pt.offsetLeft + pb.offsetLeft + 5;
      y1 = pr.offsetTop + pb.offsetTop + pb.offsetHeight - 2;
    }
    let x2 = st.offsetLeft + sb.offsetLeft - 3;
    const y2 = sr.offsetTop + sb.offsetTop + sb.offsetHeight / 2;
    if (x2 <= x1 + 8) x2 = x1 + 16;
    const mx = x1 + Math.max(9, (x2 - x1) / 2);
    const crit = schedule.TF[t.id] === 0 && schedule.TF[dep.pred] === 0;
    out += '<path class="' + (crit ? 'crit' : '') + '" d="M' + x1 + ' ' + y1 + ' H' + mx + ' V' + y2 + ' H' + x2 +
           '" marker-end="url(#' + (crit ? 'ga-c' : 'ga') + ')"/>';
  }));
  svg.innerHTML = out;
}

/* ---------------- Render: detail tahapan ---------------- */
function renderDetail(){
  const box = $('#task-detail'), sub = $('#detail-sub');
  const t = task(selectedTaskId);
  const s = schedule;
  if (!t){
    box.innerHTML = '<p class="hint">Klik salah satu batang pada timeline untuk melihat detail tahapan.</p>';
    sub.textContent = '—';
    return;
  }
  const crit = s.TF[t.id] === 0;
  const a = s.dateAt(s.ES[t.id]), b = s.dateAt(s.EF[t.id]);
  sub.textContent = t.id + ' · ' + (crit ? 'Kritis (TF = 0)' : 'Non-kritis (TF = ' + s.TF[t.id] + ')') + ' · ' + dayRangeLabel(a, b);

  const offDays = [];
  for (let d = a; d <= b; d = addDays(d, 1)){
    if (isOffDay(d)) offDays.push(fmtShort(d) + ' (' + (isCustomHoliday(d) ? holidayLabel(d) : 'Minggu') + ')');
  }
  const preds = t.deps.length
    ? t.deps.map(d => '<span class="chip" title="' + esc(task(d.pred).name) + '">' + d.pred + ' · ' + depLabel(d) + '</span>').join('')
    : '<span class="chip">— (mulai pertama)</span>';
  const succs = s.succ[t.id].length
    ? s.succ[t.id].map(x => '<span class="chip" title="' + esc(task(x.id).name) + '">' + x.id + ' · ' + depLabel({ type:x.type, lag:x.lag }) + '</span>').join('')
    : '<span class="chip">— (akhir alur)</span>';
  const people = t.team.map(id => {
    const m = member(id);
    return '<span class="chip role">' + initials(m.name) + ' · ' + esc(m.name) + ' (' + esc(m.role) + ')</span>';
  }).join('');

  box.innerHTML = '<div class="detail-grid">' +
    '<div class="dt full"><div class="k">Tahapan</div><div class="v">' + t.id + ' — ' + esc(t.name) +
      ' <span class="badge ' + (crit ? 'crit' : 'ok') + '">' + (crit ? 'Kritis' : 'Non-kritis') + '</span></div></div>' +
    '<div class="dt"><div class="k">Mulai (ES)</div><div class="v">' + fmtDate(a) + '<small>Hari kerja ke-' + s.ES[t.id] + '</small></div></div>' +
    '<div class="dt"><div class="k">Selesai (EF)</div><div class="v">' + fmtDate(b) + '<small>Hari kerja ke-' + s.EF[t.id] + '</small></div></div>' +
    '<div class="dt"><div class="k">Durasi</div><div class="v">' + t.dur + ' hari kerja<small>Sabtu &amp; minggu tidak dihitung*</small></div></div>' +
    '<div class="dt"><div class="k">Jadwal Terkini (LS → LF)</div><div class="v">' + fmtShort(s.dateAt(s.LS[t.id])) + ' → ' + fmtShort(s.dateAt(s.LF[t.id])) +
      '<small>Backward pass</small></div></div>' +
    '<div class="dt"><div class="k">Total Float</div><div class="v">' + s.TF[t.id] + ' hari<small>' +
      (crit ? 'Tidak boleh mundur' : 'Boleh mundur maks. ' + s.TF[t.id] + ' hari') + '</small></div></div>' +
    '<div class="dt"><div class="k">Predecessor</div><div class="v"><div class="chips">' + preds + '</div></div></div>' +
    '<div class="dt"><div class="k">Successor</div><div class="v"><div class="chips">' + succs + '</div></div></div>' +
    '<div class="dt full"><div class="k">Personel yang ditugaskan</div><div class="v"><div class="chips">' + people + '</div></div></div>' +
    '<div class="dt full"><div class="k">Catatan kalender</div><div class="v">' +
      (offDays.length ? 'Pekerjaan dihentikan sementara pada: ' + esc(offDays.join(', ')) : 'Bekerja kontinu — tidak melewati hari libur.') + '</div></div>' +
    '<div class="dt full"><div class="k">Deskripsi</div><div class="v">' + esc(t.desc) + '</div></div>' +
    '</div>';
}

function selectTask(id){
  selectedTaskId = id;
  $$('.gantt-row').forEach(r => r.classList.toggle('selected', r.dataset.id === id));
  $$('.bar').forEach(b => b.classList.toggle('selected', b.dataset.id === id));
  renderDetail();
}

/* ---------------- Render: tabel CPM ---------------- */
function renderCPM(){
  const s = schedule;
  const crit = TASKS.filter(t => s.TF[t.id] === 0).length;
  const floatSum = TASKS.reduce((a, t) => a + s.TF[t.id], 0);
  $('#cpm-summary').innerHTML =
    statCard('Durasi Proyek', s.end + ' hari', 'Satuan: hari kerja', 'info') +
    statCard('Mulai Proyek', fmtShort(s.dateAt(1)), fmtDate(s.dateAt(1))) +
    statCard('Selesai Proyek', fmtShort(s.dateAt(s.end)), fmtDate(s.dateAt(s.end)), 'info') +
    statCard('Tahapan Kritis', String(crit), 'Total Float = 0', 'crit') +
    statCard('Tahapan Non-Kritis', String(TASKS.length - crit), 'Total Float ≥ 1 hari', 'warn') +
    statCard('Akumulasi Float', floatSum + ' hari', 'Selisih longgar seluruh tahapan');

  $('#critical-chain').innerHTML = '<span class="chain-title">Jalur Kritis</span>' +
    (s.chain.length
      ? s.chain.map((t, i) => (i ? '<span class="chain-arrow">→</span>' : '') +
          '<span class="chain-node" title="' + esc(t.name) + '">' + t.id + ' · ' + esc(t.name.length > 26 ? t.name.slice(0, 25) + '…' : t.name) + '</span>').join('')
      : '<span class="chain-empty">Tidak ada jalur kritis.</span>');

  const rows = s.order.map(t => {
    const preds = t.deps.length ? t.deps.map(d => d.pred).join(', ') : '—';
    const types = t.deps.length ? t.deps.map(depLabel).join(' · ') : '—';
    const crit = s.TF[t.id] === 0;
    const cell = i => 'H' + i + '<div class="mini">' + fmtShort(s.dateAt(i)) + '</div>';
    return '<tr class="' + (crit ? 'critical' : '') + '" data-id="' + t.id + '">' +
      '<td>' + t.id + '</td><td>' + esc(t.name) + '</td><td class="num">' + t.dur + '</td>' +
      '<td>' + preds + '</td><td>' + types + '</td>' +
      '<td class="num">' + cell(s.ES[t.id]) + '</td><td class="num">' + cell(s.EF[t.id]) + '</td>' +
      '<td class="num">' + cell(s.LS[t.id]) + '</td><td class="num">' + cell(s.LF[t.id]) + '</td>' +
      '<td class="num">' + s.TF[t.id] + '</td>' +
      '<td><span class="badge ' + (crit ? 'crit' : 'ok') + '">' + (crit ? 'Kritis' : 'Longgar') + '</span></td></tr>';
  }).join('');
  $('#cpm-table').querySelector('tbody').innerHTML = rows;

  const sel = $('#sim-task');
  const keep = sel.value;
  sel.innerHTML = TASKS.map(t => '<option value="' + t.id + '">' + t.id + ' — ' + esc(t.name) + '</option>').join('');
  if (keep && task(keep)) sel.value = keep;
}

/* ---------------- Simulator what-if ---------------- */
function runSimulation(){
  const id = $('#sim-task').value;
  const delay = Math.max(0, parseInt($('#sim-days').value, 10) || 0);
  const box = $('#sim-result');
  const t = task(id);
  if (!t) return;
  if (!delay){
    box.className = 'sim-result';
    box.innerHTML = 'Masukkan nilai keterlambatan yang lebih besar dari 0 hari kerja.';
    return;
  }
  const base = schedule;
  const alt = computeCPM(Object.assign({}, { [id]: t.dur + delay }));
  // Tahapan pelayaran (T5 pada data awal) — fallback bila Admin mengubahnya
  const voyage = TASKS.find(x => x.id === 'T5') ||
    TASKS.find(x => /pelayaran/i.test(x.name)) || t;
  const depB = base.dateAt(base.ES[voyage.id]), depA = alt.dateAt(alt.ES[voyage.id]);
  const endB = base.dateAt(base.end), endA = alt.dateAt(alt.end);
  const depShift = alt.ES[voyage.id] - base.ES[voyage.id], endShift = alt.end - base.end;
  if (depShift <= 0 && endShift <= 0){
    box.className = 'sim-result safe';
    box.innerHTML = '<strong>Tidak berdampak pada jadwal keberangkatan.</strong> Tahapan ' + t.id + ' (' + esc(t.name) +
      ') memiliki total float <strong>' + base.TF[id] + ' hari kerja</strong>, sehingga keterlambatan <strong>' + delay +
      ' hari</strong> terserap sepenuhnya. Kapal tetap berangkat <strong>' + fmtDate(depB) + '</strong> dan proyek selesai <strong>' +
      fmtDate(endB) + '</strong>.';
  } else {
    box.className = 'sim-result impact';
    box.innerHTML = '<strong>Dampak terdeteksi!</strong> Keterlambatan <strong>' + delay + ' hari kerja</strong> pada tahapan <strong>' +
      t.id + ' — ' + esc(t.name) + '</strong> (durasi ' + t.dur + ' → ' + (t.dur + delay) + ' hari):<br>' +
      '• Keberangkatan bergeser <strong>' + fmtDate(depB) + ' → ' + fmtDate(depA) + '</strong> (+' + depShift + ' hari kerja)<br>' +
      '• Penyelesaian proyek bergeser <strong>' + fmtDate(endB) + ' → ' + fmtDate(endA) + '</strong> (+' + endShift + ' hari kerja)' +
      (alt.end > base.end && depShift === 0 ? '<br>• Tahapan ini non-kritis, namun keterlambatan melebihi float-nya sehingga ikut menggeser jadwal.' : '');
  }
}

/* ---------------- Render: diagram jaringan ---------------- */
function wrapText(str, max){
  const words = str.split(' ');
  const lines = [];
  let cur = '';
  words.forEach(w => {
    if ((cur + ' ' + w).trim().length <= max) cur = (cur + ' ' + w).trim();
    else { if (cur) lines.push(cur); cur = w; }
  });
  if (cur) lines.push(cur);
  if (lines.length > 2){
    const all = lines.join(' ');
    return [ all.slice(0, max).trim(), all.slice(max).trim() ];
  }
  return lines;
}

function renderNetwork(){
  const wrap = $('#network');
  if (!wrap) return;
  const s = schedule;
  const levels = {};
  s.order.forEach(t => {
    let lv = 0;
    t.deps.forEach(d => { lv = Math.max(lv, (levels[d.pred] || 0) + 1); });
    levels[t.id] = lv;
  });
  const cols = {};
  s.order.forEach(t => { (cols[levels[t.id]] = cols[levels[t.id]] || []).push(t); });

  const NW = 200, NH = 96, GX = 46, PAD = 24, RY = 130;
  const nCols = Math.max.apply(null, Object.keys(cols).map(Number)) + 1;
  const maxRows = Math.max.apply(null, Object.keys(cols).map(k => cols[k].length));
  const svgW = PAD * 2 + nCols * NW + (nCols - 1) * GX;
  const svgH = PAD + maxRows * RY + 60;
  const pos = {};
  Object.keys(cols).forEach(k => cols[k].forEach((t, i) => {
    pos[t.id] = { x: PAD + (+k) * (NW + GX), y: PAD + i * RY };
  }));

  let edges = '';
  s.order.forEach(t => t.deps.forEach(d => {
    const a = pos[d.pred], b = pos[t.id];
    if (!a || !b) return;
    const x1 = a.x + NW, y1 = a.y + NH / 2, x2 = b.x, y2 = b.y + NH / 2;
    const crit = s.TF[d.pred] === 0 && s.TF[t.id] === 0;
    let path;
    if (b.x - a.x <= NW + GX + 1){
      const mx = (x1 + x2) / 2;
      path = 'M' + x1 + ' ' + y1 + ' C' + mx + ' ' + y1 + ' ' + mx + ' ' + y2 + ' ' + x2 + ' ' + y2;
    } else {
      const ly = svgH - 26;                       // jalur memutar di bawah node
      path = 'M' + x1 + ' ' + y1 + ' H' + (x1 + 26) + ' V' + ly + ' H' + (x2 - 26) + ' V' + y2 + ' H' + x2;
    }
    edges += '<path class="net-edge' + (crit ? ' crit' : '') + '" d="' + path + '" marker-end="url(#na' + (crit ? '-c' : '') + ')"/>';
    const lx = (b.x - a.x <= NW + GX + 1) ? (x1 + x2) / 2 : x1 + 40;
    const ly = (b.x - a.x <= NW + GX + 1) ? (y1 + y2) / 2 - 8 : y1 - 10;
    edges += '<text class="net-edge-label' + (crit ? ' crit' : '') + '" x="' + lx + '" y="' + ly + '" text-anchor="middle">' +
             depLabel(d) + '</text>';
  }));

  let nodes = '';
  s.order.forEach(t => {
    const p = pos[t.id];
    const crit = s.TF[t.id] === 0;
    const lines = wrapText(t.name, 20);
    nodes += '<g class="net-node" data-id="' + t.id + '" style="cursor:pointer">' +
      '<rect class="net-box' + (crit ? ' crit' : '') + '" x="' + p.x + '" y="' + p.y + '" width="' + NW + '" height="' + NH + '" rx="10"/>' +
      '<path class="net-box-head' + (crit ? ' crit' : '') + '" d="M' + p.x + ' ' + (p.y + 10) + ' q0 -10 10 -10 h' + (NW - 20) + ' q10 0 10 10 v12 h-' + NW + ' z"/>' +
      '<text class="net-id" x="' + (p.x + 10) + '" y="' + (p.y + 15) + '">' + t.id + (crit ? ' · KRITIS' : ' · TF ' + s.TF[t.id]) + '</text>' +
      '<text class="net-name" x="' + (p.x + 10) + '" y="' + (p.y + 40) + '">' + esc(lines[0] || '') + '</text>' +
      (lines[1] ? '<text class="net-name" x="' + (p.x + 10) + '" y="' + (p.y + 55) + '">' + esc(lines[1]) + '</text>' : '') +
      '<text class="net-dates' + (crit ? ' crit' : '') + '" x="' + (p.x + 10) + '" y="' + (p.y + 74) + '">' +
        dayRangeLabel(s.dateAt(s.ES[t.id]), s.dateAt(s.EF[t.id])) + '</text>' +
      '<text class="net-meta" x="' + (p.x + 10) + '" y="' + (p.y + 89) + '">' + t.dur + ' hari kerja · TF ' + s.TF[t.id] +
        ' · ES H' + s.ES[t.id] + ' / EF H' + s.EF[t.id] + '</text>' +
      '</g>';
  });

  wrap.innerHTML = '<svg viewBox="0 0 ' + svgW + ' ' + svgH + '" xmlns="http://www.w3.org/2000/svg">' +
    '<defs>' +
    '<marker id="na" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" markerUnits="userSpaceOnUse" orient="auto"><path d="M0 0 L8 4 L0 8 z" fill="#7c8ba1"/></marker>' +
    '<marker id="na-c" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" markerUnits="userSpaceOnUse" orient="auto"><path d="M0 0 L8 4 L0 8 z" fill="#d8383d"/></marker>' +
    '</defs>' + edges + nodes + '</svg>';
}

/* ---------------- Render: sumber daya ---------------- */
function renderResources(){
  const s = schedule;
  $('#team-cards').innerHTML = TEAM.map(m => {
    const tasksOf = TASKS.filter(t => t.team.includes(m.id));
    const load = tasksOf.reduce((a, t) => a + t.dur, 0);
    return '<div class="team-card">' +
      '<div class="avatar" style="background:' + m.color + '">' + initials(m.name) + '</div>' +
      '<div><div class="who">' + esc(m.name) + '</div><div class="role">' + esc(m.role) + '</div>' +
      '<ul>' + m.duties.map(d => '<li>' + esc(d) + '</li>').join('') + '</ul>' +
      '<div class="load">Beban: <strong>' + load + ' hari kerja</strong> pada ' + tasksOf.length + ' tahapan (' +
        tasksOf.map(t => t.id).join(', ') + ')</div></div></div>';
  }).join('');

  $('#assign-table').querySelector('tbody').innerHTML = s.order.map(t => {
    const chips = t.team.map(id => {
      const m = member(id);
      return '<span class="chip role" title="' + esc(m.role) + '">' + initials(m.name) + ' · ' + esc(m.name) + '</span>';
    }).join(' ');
    return '<tr class="' + (s.TF[t.id] === 0 ? 'critical' : '') + '"><td>' + t.id + '</td><td>' + esc(t.name) + '</td>' +
      '<td class="num">' + t.dur + ' hari</td><td>' + dayRangeLabel(s.dateAt(s.ES[t.id]), s.dateAt(s.EF[t.id])) + '</td>' +
      '<td><div class="chips">' + chips + '</div></td></tr>';
  }).join('');

  /* Data resource dihitung bersama Resource Chart lewat detectConflicts() */
  const conflicts = detectConflicts(s);
  const box = $('#conflict-box');
  if (!conflicts.length){
    box.innerHTML = '<div class="conflict-ok">Tidak ditemukan konflik penugasan — setiap personel hanya bertugas pada satu tahapan di setiap hari kerja.</div>';
  } else {
    const byPerson = {};
    conflicts.forEach(c => {
      const k = c.m.id;
      byPerson[k] = byPerson[k] || { m: c.m, ids: c.ids, dates: [] };
      byPerson[k].dates.push(c.date);
      byPerson[k].ids = Array.from(new Set(byPerson[k].ids.concat(c.ids)));
    });
    const items = Object.keys(byPerson).map(k => {
      const g = byPerson[k];
      const dates = g.dates.map(fmtShort).join(', ');
      return '<li><strong>' + esc(g.m.name) + ' (' + esc(g.m.role) + ')</strong> — bertugas pada <strong>' +
        g.ids.join(' & ') + '</strong> pada tanggal <strong>' + dates + ' 2025</strong></li>';
    }).join('');
    box.innerHTML = '<div class="conflict-warn">Ditemukan <strong>' + Object.keys(byPerson).length +
      '</strong> konflik penugasan (personel rangkap dua tahapan di hari kerja yang sama):<ul>' + items + '</ul>' +
      '<p class="hint">Solusi usulan: alihkan salah satu penugasan ke anggota tim dengan beban paling ringan, atau geser salah satu tahapan sesuai total float-nya.</p></div>';
  }
}

/* ---------------- Resource Chart (diagram beban kerja tim) ---------------- */
const LOAD_WARN = 0.35;   // ≥ 35% durasi proyek → beban tinggi (kuning)
const LOAD_OVER = 0.50;   // > 50% durasi proyek atau ada hari bentrok → over-allocation (merah)

/* Deteksi personel yang dijadwalkan pada ≥2 tahapan di hari kerja yang sama.
   Dipakai bersama oleh panel Sumber Daya dan Resource Chart. */
function detectConflicts(s){
  const conflicts = [];
  TEAM.forEach(m => {
    const used = {};
    TASKS.filter(t => t.team.includes(m.id)).forEach(t => {
      for (let i = 0; i < t.dur; i++){
        const d = s.dateAt(s.ES[t.id] + i);
        const k = dateKey(d);
        (used[k] = used[k] || []).push(t.id);
      }
    });
    Object.keys(used).forEach(k => {
      const ids = Array.from(new Set(used[k]));
      if (ids.length > 1) conflicts.push({ m, date: parseDate(k), ids });
    });
  });
  return conflicts;
}

/* Beban kerja per anggota tim dan per peran — sumber data sama dengan
   modul Sumber Daya & Assignment (TEAM + TASKS + jadwal CPM). */
function resourceLoad(s){
  const conflicts = detectConflicts(s);
  const rows = TEAM.map(m => {
    const tasksOf = TASKS.filter(t => t.team.includes(m.id));
    const days = tasksOf.reduce((a, t) => a + t.dur, 0);
    const util = s.end ? days / s.end : 0;
    const conflictDates = conflicts.filter(c => c.m.id === m.id).map(c => c.date)
      .sort((a, b) => a - b);
    const level = (conflictDates.length || util > LOAD_OVER) ? 'over'
      : (util >= LOAD_WARN ? 'warn' : 'ok');
    return { m, tasks: tasksOf, days, util, conflictDates, level };
  });
  const roleMap = {};
  rows.forEach(r => {
    const k = r.m.role;
    if (!roleMap[k]) roleMap[k] = { role: k, color: r.m.color, members: 0, tasks: 0, days: 0 };
    roleMap[k].members += 1;
    roleMap[k].tasks += r.tasks.length;
    roleMap[k].days += r.days;
  });
  const roles = Object.keys(roleMap).map(k => roleMap[k]);
  return { rows, roles, conflicts };
}

function renderResourceChart(){
  const chart = document.getElementById('rc-chart');
  if (!chart) return;
  const s = schedule;
  const { rows, roles, conflicts } = resourceLoad(s);
  const avg = rows.reduce((a, r) => a + r.days, 0) / (rows.length || 1);
  const overN = rows.filter(r => r.level === 'over').length;
  const warnN = rows.filter(r => r.level === 'warn').length;
  const top = rows.slice().sort((a, b) => b.days - a.days)[0];
  const conflictDays = Array.from(new Set(conflicts.map(c => dateKey(c.date)))).length;

  $('#rc-summary').innerHTML =
    statCard('Personel', String(TEAM.length), 'Terhubung ke modul Sumber Daya & Assignment') +
    statCard('Rata-rata Beban', (Math.round(avg * 10) / 10) + ' hari', 'Dari ' + s.end + ' hari kerja proyek', 'info') +
    statCard('Over-allocation', String(overN), overN ? 'Perlu penyeimbangan penugasan' : 'Tidak ada', overN ? 'crit' : '') +
    statCard('Beban Tinggi', String(warnN), 'Mendekati batas 50% durasi proyek', warnN ? 'warn' : '') +
    statCard('Beban Tertinggi', esc(top.m.name), top.days + ' hari kerja · ' + top.tasks.length + ' tahapan · ' + Math.round(top.util * 100) + '%', 'warn') +
    statCard('Hari Kerja Bentrok', String(conflictDays), conflictDays ? 'Tanggal personel rangkap tugas' : 'Tidak ada', conflictDays ? 'crit' : '');

  let html = '<div class="rc-head-row">' +
    '<span>Personel</span><span>Beban (batang = % dari ' + s.end + ' hari kerja proyek)</span>' +
    '<span>Jumlah</span><span>Status</span></div>';
  rows.forEach(r => {
    const pct = r.util * 100;
    const chips = r.tasks.map(t => '<span class="chip" title="' + esc(t.name) + '">' + t.id + '</span>').join('');
    const badge = r.level === 'over' ? '<span class="badge crit">Over-allocation</span>'
      : r.level === 'warn' ? '<span class="badge warn">Beban tinggi</span>'
      : '<span class="badge ok">Normal</span>';
    const conflict = r.conflictDates.length
      ? '<span class="rc-conflict" title="Personel rangkap tugas pada tanggal tersebut">Bentrok: ' +
        r.conflictDates.map(fmtShort).join(', ') + '</span>'
      : '';
    html += '<div class="rc-row ' + r.level + '">' +
      '<div class="rc-person"><span class="avatar" style="background:' + r.m.color + '">' + initials(r.m.name) + '</span>' +
        '<span class="rc-id"><strong>' + esc(r.m.name) + '</strong><small>' + esc(r.m.role) + '</small></span></div>' +
      '<div class="rc-track" title="' + r.days + ' dari ' + s.end + ' hari kerja proyek">' +
        '<div class="rc-fill ' + r.level + '" style="width:' + Math.min(100, pct).toFixed(2) + '%"></div>' +
        '<span class="rc-thr" style="left:' + (LOAD_OVER * 100) + '%"></span></div>' +
      '<div class="rc-nums"><strong>' + r.days + '</strong> hari<small>' + r.tasks.length + ' tugas · ' + Math.round(pct) + '%</small></div>' +
      '<div class="rc-state">' + badge + '</div>' +
      '<div class="rc-tasks">' + chips + conflict + '</div>' +
      '</div>';
  });
  chart.innerHTML = html;

  const roleChart = document.getElementById('rc-role-chart');
  if (roleChart){
    const maxRole = Math.max.apply(null, roles.map(r => r.days).concat([1]));
    roleChart.innerHTML = roles.map(r =>
      '<div class="rc-row role-row">' +
        '<div class="rc-person"><span class="rc-role-dot" style="background:' + r.color + '"></span>' +
          '<span class="rc-id"><strong>' + esc(r.role) + '</strong><small>' + r.members + ' personel · ' + r.tasks + ' penugasan</small></span></div>' +
        '<div class="rc-track" title="' + r.days + ' hari penugasan total">' +
          '<div class="rc-fill role" style="width:' + (r.days / maxRole * 100).toFixed(2) + '%"></div></div>' +
        '<div class="rc-nums"><strong>' + r.days + '</strong> hari<small>total penugasan</small></div>' +
        '<div class="rc-state">' +
          (r.days / maxRole >= 0.8 ? '<span class="badge warn">Beban peran tertinggi</span>' : '<span class="badge ok">Seimbang</span>') +
        '</div></div>'
    ).join('');
  }
}

/* ---------------- Render: manifes ---------------- */
function loadManifest(){
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw){ const arr = JSON.parse(raw); if (Array.isArray(arr)) return arr; }
  } catch (e){ /* localStorage tidak tersedia */ }
  return SAMPLE_MANIFEST.map(r => Object.assign({}, r));
}
function saveManifest(){
  try { localStorage.setItem(LS_KEY, JSON.stringify(manifest)); return true; }
  catch (e){ return false; }
}
function setSaveNote(msg){ const n = $('#save-note'); if (n) n.innerHTML = msg; }

function renderManifest(){
  const { count, total } = manifestStats();
  $('#manifest-count').textContent = count + ' kontainer · ' + fmtNum(total) + ' MT · rute Gorontalo → Surabaya';
  const tb = $('#manifest-table').querySelector('tbody');
  const stOpts = Object.keys(STATUS_CLS);
  if (!manifest.length){
    tb.innerHTML = '<tr><td colspan="9" style="text-align:center;color:#64748b">Belum ada data manifes.' +
      (isAdmin() ? ' Tambahkan lewat formulir di atas.' : '') + '</td></tr>';
  } else {
    /* Kolom STATUS berupa dropdown interaktif — Admin & Staf dapat mengubah status
       kontainer; setiap perubahan langsung disimpan ke LocalStorage. */
    tb.innerHTML = manifest.map((r, i) => {
      const cls = STATUS_CLS[r.status] || 'st-terdaftar';
      const st = STATUS_CLS[r.status] ? r.status : 'Terdaftar';
      const statusCell = currentUser
        ? '<select class="manifest-status ' + cls + '" data-manifest-id="' + r.id +
          '" aria-label="Status kontainer ' + esc(r.container) + '">' +
          stOpts.map(o => '<option' + (o === st ? ' selected' : '') + '>' + o + '</option>').join('') +
          '</select>'
        : '<span class="status-pill ' + cls + '">' + esc(st) + '</span>';
      const action = isAdmin()
        ? '<button class="row-del" type="button" data-del="' + r.id + '">Hapus</button>'
        : '<span class="mini" title="Hanya Admin yang dapat menghapus baris manifes">&mdash;</span>';
      return '<tr><td class="num">' + (i + 1) + '</td><td><strong>' + esc(r.container) + '</strong></td><td>' + esc(r.shipper) +
        '</td><td>' + esc(r.commodity) + '</td><td class="num">' + fmtNum(r.qty) + '</td><td>' + esc(r.consignee) +
        '</td><td class="mini">GTO → SUB</td><td>' + statusCell + '</td><td class="no-print">' + action + '</td></tr>';
    }).join('');
  }
  $('#manifest-table').querySelector('tfoot').innerHTML =
    '<tr><td colspan="4">Total</td><td class="num">' + fmtNum(total) + ' MT</td><td colspan="3">' + count +
    ' kontainer · ' + esc(VESSEL) + '</td><td class="no-print"></td></tr>';
}

/* ---------------- Cetak & ekspor ---------------- */
function renderPrintMeta(){
  const el = $('#print-meta');
  if (!el) return;
  const { count, total } = manifestStats();
  const now = new Date();
  const who = currentUser ? currentUser.name + ' (' + (isAdmin() ? 'Admin' : 'Staf') + ')' : 'Belum login';
  el.textContent = 'Dicetak: ' + fmtDate(now) + ' ' + String(now.getHours()).padStart(2,'0') + ':' +
    String(now.getMinutes()).padStart(2,'0') + ' · oleh ' + who + ' · ' + TASKS.length + ' tahapan · ' + schedule.end +
    ' hari kerja · jalur kritis ' + schedule.chain.length + ' tahapan · ' + count + ' kontainer (' + fmtNum(total) + ' MT)';
}
function updateVessel(){
  const el = $('#route-vessel');
  if (!el) return;
  const voyage = TASKS.find(t => t.id === 'T5') || TASKS.find(t => /pelayaran/i.test(t.name));
  const eta = voyage ? schedule.dateAt(schedule.EF[voyage.id]) : null;
  el.textContent = VESSEL + (eta ? ' · ETA ' + fmtShort(eta) + ' ' + MONTHS[eta.getMonth()] : '');
}

function download(filename, text, mime){
  const blob = new Blob([text], { type: mime || 'text/plain;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 0);
}
function csvCell(v){ return '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"'; }
function toCSV(header, rows){
  return [ header.map(csvCell).join(',') ].concat(rows.map(r => r.map(csvCell).join(','))).join('\r\n');
}

function exportScheduleCSV(){
  const s = schedule;
  const rows = s.order.map(t => [
    t.id, t.name, t.dur,
    t.deps.length ? t.deps.map(d => d.pred).join(' & ') : '-',
    t.deps.length ? t.deps.map(depLabel).join(' & ') : '-',
    fmtDate(s.dateAt(s.ES[t.id])), fmtDate(s.dateAt(s.EF[t.id])),
    'H' + s.ES[t.id], 'H' + s.EF[t.id], 'H' + s.LS[t.id], 'H' + s.LF[t.id],
    s.TF[t.id], s.TF[t.id] === 0 ? 'Kritis' : 'Non-kritis',
    t.status, taskPct(t) + '%',
    t.team.map(id => member(id).name).join(' & ')
  ]);
  download('jadwal-pengiriman-gto-sub-2025-11.csv',
    toCSV(['ID','Tahapan','Durasi (Hari Kerja)','Predecessor','Dependensi','Mulai','Selesai','ES','EF','LS','LF','Total Float','Keterangan','Status Progres','% Completed','Personel'], rows),
    'text/csv;charset=utf-8');
}
function exportManifestCSV(){
  const rows = manifest.map(r => [r.container, r.shipper, r.commodity, r.qty, r.consignee, 'Gorontalo - Surabaya', r.status]);
  download('manifes-kargo-gto-sub-2025-11.csv',
    toCSV(['No. Container','Shipper','Jenis Kargo','Volume (MT)','Penerima','Rute','Status'], rows),
    'text/csv;charset=utf-8');
}
function exportManifestJSON(){
  download('manifes-kargo-2025-11.json', JSON.stringify({
    perusahaan: 'PT Logistik Nusantara', rute: 'Gorontalo → Surabaya', periode: '01–30 November 2025',
    total_kontainer: manifestStats().count, total_volume_mt: Math.round(manifestStats().total * 10) / 10,
    manifes: manifest
  }, null, 2), 'application/json;charset=utf-8');
}
function exportFullJSON(){
  const s = schedule;
  download('scheduler-logistik-nusantara-2025-11.json', JSON.stringify({
    meta: { perusahaan:'PT Logistik Nusantara', vessel:VESSEL, rute:'Gorontalo → Surabaya',
            periode:'01–30 November 2025', tanggal_cetak:new Date().toISOString() },
    kalender: { aturan:'Sabtu = hari kerja; libur hari Minggu + libur custom',
                libur_custom: customHolidays, hari_kerja_periode: s.work.slice(0, PERIOD.days + 10).length },
    cpm: { durasi_hari_kerja: s.end, mulai: fmtDate(s.dateAt(1)), selesai: fmtDate(s.dateAt(s.end)),
           jalur_kritis: s.chain.map(t => t.id) },
    tahapan: s.order.map(t => ({
      id:t.id, nama:t.name, durasi:t.dur,
      predecessor:t.deps.map(d => ({ id:d.pred, tipe:d.type, lag:d.lag || 0 })),
      ES:s.ES[t.id], EF:s.EF[t.id], LS:s.LS[t.id], LF:s.LF[t.id], TF:s.TF[t.id],
      kritis:s.TF[t.id] === 0,
      status_progres:t.status, progres_persen:taskPct(t),
      mulai:fmtDate(s.dateAt(s.ES[t.id])), selesai:fmtDate(s.dateAt(s.EF[t.id])),
      personel:t.team.map(id => ({ id, nama:member(id).name, peran:member(id).role }))
    })),
    manifes: manifest
  }, null, 2), 'application/json;charset=utf-8');
}

/* ---------------- Navigasi tab ---------------- */
function activateTab(name){
  $$('.tab-btn').forEach(b => {
    const on = b.dataset.tab === name;
    b.classList.toggle('active', on);
    b.setAttribute('aria-selected', on ? 'true' : 'false');
  });
  $$('.tab-panel').forEach(p => p.classList.toggle('active', p.id === 'panel-' + name));
  if (name === 'dashboard') requestAnimationFrame(drawGanttLinks);
}

/* ---------------- Render semua ---------------- */
/* Render semua — tiap renderer dibungkus try/catch sendiri agar satu panel
   yang gagal (mis. data tahapan diedit Admin) tidak membekukan panel lain
   seperti Gantt, PERT/CPM, dan Resource Chart. */
function renderAll(){
  schedule = computeCPM();
  const steps = [
    ['statistik', renderStats],
    ['kalender', renderHolidays],
    ['gantt', renderGantt],
    ['detail', renderDetail],
    ['cpm', renderCPM],
    ['jaringan', renderNetwork],
    ['sumber daya', renderResources],
    ['resource chart', renderResourceChart],
    ['status progres', renderStatusTable],
    ['manajemen tugas', renderTaskAdminTable],
    ['manifes', renderManifest],
    ['meta cetak', renderPrintMeta],
    ['info kapal', updateVessel]
  ];
  const failed = [];
  steps.forEach(([name, fn]) => {
    try { fn(); }
    catch (e){ console.error(e); failed.push(name); }
  });
  if (failed.length) showErrorBanner('Beberapa panel gagal diperbarui: ' + failed.join(', ') + '.');
}

/* ============================================================
   AUTENTIKASI & HAK AKSES (Admin vs Staf)
   - Sesi disimpan di LocalStorage (LN_session)
   - Admin : akses penuh (tugas, dependensi, kalender, tim, manifes, ekspor)
   - Staf  : read-only Gantt / CPM / Jaringan / Resource Chart +
            update status progres pada tahapan yang ditugaskan kepadanya
   ============================================================ */
const AUTH_USERS = [
  { user:'fahri', pass:'admin123', name:'Fahri Ramadhan', role:'admin',
    title:'Admin / Project Manager', memberId:null },
  { user:'dewi',  pass:'staf123',  name:'Dewi Lestari',    role:'staf',
    title:'Staf Operasional (Logistics Coordinator)', memberId:'L1' }
];

function isAdmin(){ return !!currentUser && currentUser.role === 'admin'; }

/* Hak ubah sebuah tahapan: Admin selalu boleh; Staf hanya pada tahapan
   yang timnya memuat memberId akun tersebut. */
function canEditTask(t){
  if (!currentUser) return false;
  if (isAdmin()) return true;
  return !!(currentUser.memberId && t && Array.isArray(t.team) &&
    t.team.indexOf(currentUser.memberId) !== -1);
}

function sessionRestore(){
  try {
    const raw = localStorage.getItem(LS_SESSION);
    if (!raw) return null;
    const s = JSON.parse(raw);
    return AUTH_USERS.find(u => u && u.user === (s && s.user)) || null;
  } catch (e){ return null; }
}
function sessionSave(){
  try { localStorage.setItem(LS_SESSION, JSON.stringify({ user: currentUser.user, ts: Date.now() })); }
  catch (e){ /* localStorage tidak tersedia */ }
}
function sessionClear(){
  try { localStorage.removeItem(LS_SESSION); } catch (e){}
}

function openLogin(){
  const m = $('#login-modal');
  if (!m) return;
  const err = $('#login-err');
  if (err) err.hidden = true;
  m.hidden = false;
  document.body.classList.add('login-locked');
  setTimeout(() => { const u = $('#login-user'); if (u) u.focus(); }, 40);
}
function closeLogin(){
  const m = $('#login-modal');
  if (m) m.hidden = true;
  document.body.classList.remove('login-locked');
}

function doLogin(username, password){
  const u = String(username || '').trim().toLowerCase();
  const p = String(password || '');
  const found = AUTH_USERS.find(x => x.user === u && x.pass === p);
  const err = $('#login-err');
  if (!found){
    if (err){ err.textContent = 'Username atau password salah. Coba akun simulasi di bawah.'; err.hidden = false; }
    return false;
  }
  currentUser = found;
  sessionSave();
  closeLogin();
  applyRole();
  return true;
}
function doLogout(){
  currentUser = null;
  sessionClear();
  applyRole();
  openLogin();
}

/* Terapkan batasan role: sembunyikan tab/panel/form khusus Admin,
   perbarui indikator sesi di topbar, dan jaga tab aktif tetap sah. */
function applyRole(){
  const admin = isAdmin();
  const gated = new Set();
  $$('.admin-only').forEach(el => gated.add(el));
  $$('[data-min="admin"]').forEach(el => gated.add(el));
  gated.forEach(el => el.classList.toggle('role-hidden', !admin));

  const btnLogin = $('#btn-login');
  if (btnLogin) btnLogin.hidden = !!currentUser;
  const who = $('#who');
  if (who){
    who.hidden = !currentUser;
    if (currentUser){
      $('#who-avatar').textContent = initials(currentUser.name);
      $('#who-name').textContent = currentUser.name;
      const badge = $('#who-role');
      badge.textContent = admin ? '(Admin)' : '(Staf)';
      badge.className = 'role-badge ' + (admin ? 'rb-admin' : 'rb-staf');
      badge.title = currentUser.title + (currentUser.memberId ? ' · ' + currentUser.memberId : '');
    }
  }

  const active = document.querySelector('.tab-btn.active');
  if (active && active.dataset.min === 'admin' && !admin) activateTab('dashboard');
  if (schedule) renderStatusTable();
}

/* ---------------- Render: tabel status progres (peran Admin & Staf) ---------------- */
function renderStatusTable(){
  const wrap = $('#status-table');
  if (!wrap || !schedule) return;
  const s = schedule;
  let done = 0, editable = 0, pctSum = 0;
  const rows = s.order.map(t => {
    const st = TASK_STATUS[t.status] ? t.status : 'Belum Dimulai';
    const pct = taskPct(t);
    pctSum += pct;
    if (st === 'Selesai') done += 1;
    const can = canEditTask(t);
    if (can) editable += 1;
    const crit = s.TF[t.id] === 0;
    const people = t.team.map(id => {
      const m = member(id);
      return '<span class="chip role" title="' + esc(m.role) + '">' + initials(m.name) + ' · ' + esc(m.name) + '</span>';
    }).join(' ');
    /* % Completed — input interaktif (Admin semua tahapan; Staf hanya tugasnya) */
    const bar = '<div class="pct-bar"><div class="pct-fill' + (pct >= 100 ? ' done' : '') +
      '" style="width:' + pct + '%"></div></div>';
    const pctCell = can
      ? '<div class="pct-wrap"><input type="number" class="task-pct" data-pct-id="' + t.id +
        '" min="0" max="100" step="5" value="' + pct + '" aria-label="Persentase progres ' + t.id +
        '"><span class="pct-sign">%</span></div>' + bar
      : '<div class="pct-view"><strong>' + pct + '%</strong>' + bar + '</div>';
    const sel = '<select class="task-status" data-status-id="' + t.id + '"' + (can ? '' : ' disabled') + '>' +
      Object.keys(TASK_STATUS).map(o => '<option' + (o === st ? ' selected' : '') + '>' + o + '</option>').join('') +
      '</select>' + (can ? '' :
        '<span class="lock-note">' + (currentUser && currentUser.role === 'staf'
          ? 'Read-only — bukan penugasan Anda' : 'Butuh login') + '</span>');
    return '<tr class="' + (crit ? 'critical' : '') + '"><td>' + t.id + '</td>' +
      '<td>' + esc(t.name) + (crit ? ' <span class="badge crit">Kritis</span>' : '') + '</td>' +
      '<td><div class="chips">' + people + '</div></td>' +
      '<td>' + dayRangeLabel(s.dateAt(s.ES[t.id]), s.dateAt(s.EF[t.id])) +
        '<div class="mini">H' + s.ES[t.id] + '–H' + s.EF[t.id] + '</div></td>' +
      '<td>' + pctCell + '</td>' +
      '<td>' + sel + '</td></tr>';
  }).join('');
  wrap.querySelector('tbody').innerHTML = rows;

  const avg = s.order.length ? Math.round(pctSum / s.order.length) : 0;
  const cnt = $('#status-count');
  if (cnt) cnt.textContent = s.order.length + ' tahapan · ' + done + ' selesai · rata-rata progres ' + avg + '% · ' +
    (currentUser ? 'hak ubah: ' + editable + ' tahapan' : 'login untuk mengubah status & progres');
  const hint = $('#status-hint');
  if (hint){
    hint.innerHTML = !currentUser
      ? 'Belum login — seluruh status hanya-baca. Tekan tombol <strong>Login</strong> di kanan atas.'
      : isAdmin()
        ? 'Anda login sebagai <strong>Admin / Project Manager</strong> — persentase progres (% Completed) dan status seluruh tahapan dapat diubah. Memilih status <strong>Selesai</strong> menyetel progres ke 100%, dan memasukkan 100% menyetel status <strong>Selesai</strong>. Perubahan langsung tersimpan di browser (localStorage).'
        : 'Anda login sebagai <strong>Staf Operasional</strong> (' + esc(currentUser.name) +
          ') — perbarui <strong>% Completed</strong> dan status pada tahapan yang <strong>ditugaskan kepada Anda</strong>; tahapan lain hanya-baca. Setting 100% otomatis menyetel status <strong>Selesai</strong>, dan memilih <strong>Selesai</strong> menyetel progres 100%. Perubahan tersimpan di localStorage.';
  }
}

/* ---------------- Render: daftar tugas (Manajemen Tugas — Admin) ---------------- */
function hasSuccessors(id){ return TASKS.some(t => t.deps.some(d => d.pred === id)); }
function wouldCycle(tasks){ return topoSort(tasks).length !== tasks.length; }

function renderTaskAdminTable(){
  const wrap = $('#task-admin-table');
  if (!wrap || !schedule) return;
  const s = schedule;
  wrap.querySelector('tbody').innerHTML = s.order.map(t => {
    const preds = t.deps.length ? t.deps.map(d => d.pred + ' · ' + depLabel(d)).join('<br>') : '—';
    const chips = t.team.map(id => {
      const m = member(id);
      return '<span class="chip role" title="' + esc(m.role) + '">' + initials(m.name) + ' · ' + esc(m.name) + '</span>';
    }).join(' ');
    const st = TASK_STATUS[t.status] ? t.status : 'Belum Dimulai';
    const locked = hasSuccessors(t.id);
    return '<tr class="' + (s.TF[t.id] === 0 ? 'critical' : '') + '"><td>' + t.id + '</td><td>' + esc(t.name) +
      '</td><td class="num">' + t.dur + '</td><td>' + preds + '</td>' +
      '<td><div class="chips">' + chips + '</div></td>' +
      '<td><span class="status-pill ' + TASK_STATUS[st] + '">' + st + ' · ' + taskPct(t) + '%</span></td>' +
      '<td class="no-print"><div class="row-act">' +
        '<button class="btn small ghost" type="button" data-edit-task="' + t.id + '">Edit</button>' +
        '<button class="btn small danger" type="button" data-del-task="' + t.id + '"' +
          (locked ? ' disabled title="Tahapan ini masih menjadi predecessor tugas lain"' : '') +
        '>Hapus</button></div></td></tr>';
  }).join('');
  const cnt = $('#ta-count');
  if (cnt) cnt.textContent = TASKS.length + ' tahapan · ' + s.chain.length + ' kritis · tersimpan di LocalStorage browser';
}

/* ---------------- Form manajemen tugas (Admin) ---------------- */
function setTfMsg(txt, cls){
  const msg = $('#tf-msg');
  if (!msg) return;
  msg.className = 'hint' + (cls ? ' ' + cls : '');
  msg.textContent = txt;
}

function renderDepRows(deps){
  const box = $('#tf-deps');
  if (!box) return;
  const editingId = $('#tf-edit-id').value;
  const opts = TASKS.filter(t => t.id !== editingId)
    .map(t => '<option value="' + t.id + '">' + t.id + ' — ' + esc(t.name) + '</option>').join('');
  const list = (deps || []).filter(d => d && d.pred && d.pred !== editingId);
  if (!list.length){
    box.innerHTML = '<p class="hint" style="margin:0">Belum ada dependensi — tahapan ini menjadi titik mulai (start node).</p>';
    return;
  }
  box.innerHTML = list.map((d, i) =>
    '<div class="dep-row">' +
      '<select data-dep-pred="' + i + '" aria-label="Predecessor">' + opts + '</select>' +
      '<select data-dep-type="' + i + '" aria-label="Tipe dependensi">' +
        '<option value="FS"' + (d.type !== 'SS' ? ' selected' : '') + '>FS (Finish–Start)</option>' +
        '<option value="SS"' + (d.type === 'SS' ? ' selected' : '') + '>SS (Start–Start)</option>' +
      '</select>' +
      '<input type="number" min="0" max="15" value="' + (d.lag || 0) + '" data-dep-lag="' + i + '" aria-label="Lag (hari kerja)">' +
      '<button class="row-del" type="button" data-dep-rm="' + i + '" title="Hapus dependensi">Hapus</button>' +
    '</div>').join('');
  list.forEach((d, i) => {
    const sel = box.querySelector('[data-dep-pred="' + i + '"]');
    if (sel && d.pred) sel.value = d.pred;
  });
}

function readDepRows(){
  const box = $('#tf-deps');
  if (!box) return [];
  return Array.from(box.querySelectorAll('.dep-row')).map(r => {
    const p = r.querySelector('[data-dep-pred]');
    const ty = r.querySelector('[data-dep-type]');
    const lg = r.querySelector('[data-dep-lag]');
    return { pred: p ? p.value : '', type: ty && ty.value === 'SS' ? 'SS' : 'FS',
             lag: lg ? Math.max(0, Math.min(15, parseInt(lg.value, 10) || 0)) : 0 };
  }).filter(d => d.pred);
}

function renderTeamChecks(checked){
  const box = $('#tf-team');
  if (!box) return;
  const on = checked || [];
  box.innerHTML = TEAM.map(m =>
    '<label class="chk"><input type="checkbox" value="' + m.id + '"' +
      (on.indexOf(m.id) !== -1 ? ' checked' : '') + '> ' + esc(m.name) +
      ' <small>' + esc(m.role) + '</small></label>').join('') ||
    '<span class="hint" style="margin:0">Belum ada anggota tim — tambahkan lewat tab Sumber Daya.</span>';
}

function refreshTaskFormOptions(){
  const checked = $$('#tf-team input:checked').map(i => i.value);
  const deps = readDepRows();
  renderTeamChecks(checked);
  renderDepRows(deps);
}

function resetTaskForm(){
  const f = $('#task-form');
  if (!f) return;
  $('#tf-edit-id').value = '';
  $('#tf-name').value = '';
  $('#tf-dur').value = 2;
  $('#tf-status').value = 'Belum Dimulai';
  renderDepRows([]);
  renderTeamChecks([]);
  $('#tf-submit').textContent = 'Simpan Tugas';
  $('#tf-cancel').hidden = true;
  $('#tf-delete').hidden = true;
  setTfMsg('Isi formulir lalu tekan Simpan Tugas. Perubahan langsung memperbarui Gantt, CPM, Diagram Jaringan, dan Resource Chart.');
}

function loadTaskForm(id){
  const t = task(id);
  if (!t) return;
  $('#tf-edit-id').value = t.id;
  $('#tf-name').value = t.name;
  $('#tf-dur').value = t.dur;
  $('#tf-status').value = TASK_STATUS[t.status] ? t.status : 'Belum Dimulai';
  renderDepRows(t.deps.slice());
  renderTeamChecks(t.team.slice());
  $('#tf-submit').textContent = 'Simpan Perubahan ' + t.id;
  $('#tf-cancel').hidden = false;
  const del = $('#tf-delete');
  del.hidden = false;
  const locked = hasSuccessors(t.id);
  del.disabled = locked;
  del.title = locked ? 'Tahapan ini masih menjadi predecessor tugas lain — hapus dependennya dahulu'
    : 'Hapus tahapan ' + t.id;
  setTfMsg('Mode edit: ' + t.id + ' — ' + t.name + '. Batalkan dengan tombol Batal Edit.');
  document.getElementById('task-form').scrollIntoView({ behavior:'smooth', block:'nearest' });
}

function saveTaskForm(){
  const editId = $('#tf-edit-id').value;
  const name = $('#tf-name').value.trim();
  const dur = parseInt($('#tf-dur').value, 10);
  const status = TASK_STATUS[$('#tf-status').value] ? $('#tf-status').value : 'Belum Dimulai';
  const deps = readDepRows();
  const team = $$('#tf-team input:checked').map(i => i.value);

  if (!name){ setTfMsg('Nama tahapan wajib diisi.', 'err'); return; }
  if (!(dur >= 1 && dur <= 30)){ setTfMsg('Durasi harus antara 1–30 hari kerja.', 'err'); return; }
  if (!team.length){ setTfMsg('Pilih minimal satu personel untuk alokasi resource (agar Resource Chart akurat).', 'err'); return; }
  const seen = {};
  for (let i = 0; i < deps.length; i++){
    if (deps[i].pred === editId){ setTfMsg('Tahapan tidak boleh menjadi predecessor dirinya sendiri.', 'err'); return; }
    if (seen[deps[i].pred]){ setTfMsg('Predecessor ' + deps[i].pred + ' tercantum lebih dari satu kali.', 'err'); return; }
    seen[deps[i].pred] = true;
  }

  const newId = editId || nextTaskId();
  // Status & % Completed tetap sinkron saat Admin mengedit lewat formulir
  const pctFrom = st => st === 'Selesai' ? 100 : (st === 'Belum Dimulai' ? 0 : null);
  const candidate = TASKS.map(t => t.id === editId
    ? { id: t.id, name, dur, deps, team, status,
        pct: pctFrom(status) != null ? pctFrom(status) : taskPct(t), desc: t.desc }
    : t);
  if (!editId) candidate.push({ id: newId, name, dur, deps, team, status,
    pct: pctFrom(status) != null ? pctFrom(status) : 0,
    desc: 'Tahapan tambahan yang dibuat melalui Manajemen Tugas (Admin).' });
  if (wouldCycle(candidate)){
    setTfMsg('Dependensi yang dipilih membentuk siklus (cycle) — jadwal tidak dapat dihitung. Periksa kembali predecessor.', 'err');
    return;
  }

  TASKS = candidate;
  saveTasks();
  if (!task(selectedTaskId)) selectedTaskId = TASKS[0].id;
  renderAll();
  resetTaskForm();
  setTfMsg((editId ? 'Tahapan ' + editId + ' diperbarui' : 'Tahapan ' + newId + ' ditambahkan') +
    ' — Gantt, CPM, Diagram Jaringan, dan Resource Chart telah diperbarui.', 'ok');
}

function nextTaskId(){
  const used = {};
  let n = 1;
  TASKS.forEach(t => {
    used[t.id] = true;
    const m = /^T(\d+)$/.exec(t.id);
    if (m) n = Math.max(n, parseInt(m[1], 10) + 1);
  });
  while (used['T' + n]) n += 1;
  return 'T' + n;
}

/* ---------------- Init & event ---------------- */
function init(){
  /* Pasang SEMUA listener lebih dulu, sehingga tab & tombol tetap hidup
     walau render awal gagal (mis. data localStorage lama yang tidak valid). */
  $$('.tab-btn').forEach(b => b.addEventListener('click', () => activateTab(b.dataset.tab)));

  /* --- Autentikasi & role --- */
  $('#btn-login').addEventListener('click', openLogin);
  $('#btn-logout').addEventListener('click', doLogout);
  $('#login-form').addEventListener('submit', e => {
    e.preventDefault();
    if (doLogin($('#login-user').value, $('#login-pass').value)) e.target.reset();
  });
  $$('.quick-btn').forEach(b => b.addEventListener('click', () => {
    const q = b.dataset.quick;
    const u = AUTH_USERS.find(x => x.user === q || x.role === q);
    if (u && doLogin(u.user, u.pass)) $('#login-form').reset();
  }));

  /* --- Status progres & % Completed (Admin semua tahapan; Staf hanya tugasnya) --- */
  $('#status-table').addEventListener('change', e => {
    const sel = e.target.closest('select[data-status-id]');
    if (sel){
      const t = task(sel.dataset.statusId);
      if (!t || !canEditTask(t)){ renderStatusTable(); return; }
      t.status = TASK_STATUS[sel.value] ? sel.value : 'Belum Dimulai';
      // Sinkronisasi % Completed mengikuti status yang dipilih
      if (t.status === 'Selesai') t.pct = 100;
      else if (t.status === 'Belum Dimulai') t.pct = 0;
      else if (taskPct(t) >= 100) t.pct = 50;      // status 'Berjalan' tidak boleh 100%
      saveTasks();
      renderStatusTable();
      renderTaskAdminTable();
      return;
    }
    const pin = e.target.closest('input[data-pct-id]');
    if (pin){
      const t = task(pin.dataset.pctId);
      if (!t || !canEditTask(t)){ renderStatusTable(); return; }
      const p = clampPct(pin.value);
      t.pct = p != null ? p : taskPct(t);
      // Status progres mengikuti persentase yang dimasukkan
      t.status = t.pct >= 100 ? 'Selesai' : (t.pct <= 0 ? 'Belum Dimulai' : 'Berjalan');
      saveTasks();
      renderStatusTable();
      renderTaskAdminTable();
    }
  });

  /* --- Manajemen tugas (Admin) --- */
  $('#task-form').addEventListener('submit', e => { e.preventDefault(); saveTaskForm(); });
  $('#btn-add-dep').addEventListener('click', () => {
    const deps = readDepRows();
    const used = {};
    deps.forEach(d => used[d.pred] = true);
    const cand = TASKS.find(t => t.id !== $('#tf-edit-id').value && !used[t.id]);
    if (!cand){ setTfMsg('Semua tahapan lain sudah tercantum sebagai predecessor.', 'err'); return; }
    deps.push({ pred: cand.id, type: 'FS', lag: 0 });
    renderDepRows(deps);
  });
  $('#tf-deps').addEventListener('click', e => {
    const b = e.target.closest('[data-dep-rm]');
    if (!b) return;
    const deps = readDepRows();
    deps.splice(parseInt(b.dataset.depRm, 10), 1);
    renderDepRows(deps);
  });
  $('#tf-cancel').addEventListener('click', resetTaskForm);
  $('#tf-delete').addEventListener('click', () => {
    const id = $('#tf-edit-id').value;
    const t = task(id);
    if (!t) return;
    if (hasSuccessors(id)){ setTfMsg('Tahapan ' + id + ' masih menjadi predecessor tugas lain — hapus dependennya dahulu.', 'err'); return; }
    if (!window.confirm('Hapus tahapan ' + id + ' — ' + t.name + '?')) return;
    TASKS = TASKS.filter(x => x.id !== id);
    saveTasks();
    if (selectedTaskId === id) selectedTaskId = TASKS.length ? TASKS[0].id : null;
    resetTaskForm();
    renderAll();
    setTfMsg('Tahapan ' + id + ' dihapus. Gantt, CPM, Diagram Jaringan, dan Resource Chart telah diperbarui.', 'ok');
  });
  $('#task-admin-table').addEventListener('click', e => {
    const ed = e.target.closest('[data-edit-task]');
    if (ed){ loadTaskForm(ed.dataset.editTask); return; }
    const del = e.target.closest('[data-del-task]');
    if (del && !del.disabled){
      $('#tf-edit-id').value = del.dataset.delTask;
      $('#tf-delete').click();
    }
  });

  /* --- Tambah anggota tim (Admin) --- */
  $('#team-form').addEventListener('submit', e => {
    e.preventDefault();
    const f = e.target;
    const name = f.elements.name.value.trim();
    const role = f.elements.role.value;
    const duties = f.elements.duties.value.trim();
    if (!name) return;
    let n = 1;
    while (TEAM.some(m => m.id === 'M' + n)) n += 1;
    const palette = ['#0e8f8f','#0b6fa4','#f59e0b','#16a34a','#7c3aed','#db2777','#0f766e','#b45309'];
    TEAM.push({ id: 'M' + n, name, role, color: palette[TEAM.length % palette.length],
      duties: duties ? duties.split(',').map(x => x.trim()).filter(Boolean) : ['Mendukung operasional bongkar muat'] });
    saveTeam();
    f.reset();
    renderAll();
    refreshTaskFormOptions();
    $('#team-msg').innerHTML = '<strong>' + esc(name) + '</strong> (' + esc(role) +
      ') ditambahkan ke tim sebagai <strong>M' + n + '</strong> — langsung tersedia untuk alokasi penugasan di tab Manajemen Tugas dan memengaruhi Resource Chart.';
  });

  $('#gantt').addEventListener('click', e => {
    const el = e.target.closest('[data-id]');
    if (el) selectTask(el.dataset.id);
  });
  $('#cpm-table').addEventListener('click', e => {
    const tr = e.target.closest('tr[data-id]');
    if (tr){ selectTask(tr.dataset.id); activateTab('dashboard'); }
  });
  $('#network').addEventListener('click', e => {
    const g = e.target.closest('.net-node');
    if (g){ selectTask(g.dataset.id); activateTab('dashboard'); }
  });

  $('#holiday-form').addEventListener('submit', e => {
    e.preventDefault();
    const date = $('#hol-date').value;
    const label = $('#hol-label').value.trim();
    if (!date || !label) return;
    const d = parseDate(date);
    if (isOffDay(d)){ alert('Tanggal tersebut sudah merupakan hari libur.'); return; }
    customHolidays.push({ date, label });
    $('#hol-label').value = '';
    renderAll();
  });
  $('#holiday-list').addEventListener('click', e => {
    const b = e.target.closest('[data-del-holiday]');
    if (!b) return;
    customHolidays = customHolidays.filter(h => h.date !== b.dataset.delHoliday);
    renderAll();
  });

  $('#btn-sim').addEventListener('click', runSimulation);
  $('#btn-sim-reset').addEventListener('click', () => {
    $('#sim-days').value = 2;
    const box = $('#sim-result');
    box.className = 'sim-result';
    box.textContent = 'Pilih tahapan lalu tekan Simulasikan.';
  });

  $('#manifest-form').addEventListener('submit', e => {
    e.preventDefault();
    const f = e.target;
    manifest.unshift({
      id: Date.now(),
      container: f.container.value.trim().toUpperCase(),
      shipper: f.shipper.value.trim(),
      commodity: f.commodity.value.trim(),
      qty: Number(f.qty.value),
      consignee: f.consignee.value.trim(),
      status: f.status.value
    });
    saveManifest();
    f.reset();
    renderManifest();
    setSaveNote('Data tersimpan otomatis di browser (localStorage) pada ' + new Date().toLocaleString('id-ID') + '.');
  });
  $('#manifest-table').addEventListener('click', e => {
    const b = e.target.closest('[data-del]');
    if (!b || !isAdmin()) return;
    manifest = manifest.filter(r => String(r.id) !== b.dataset.del);
    saveManifest();
    renderManifest();
    setSaveNote('Baris manifes dihapus pada ' + new Date().toLocaleString('id-ID') + '.');
  });
  /* Dropdown STATUS kontainer (Admin & Staf) — nilainya langsung tersimpan ke LocalStorage */
  $('#manifest-table').addEventListener('change', e => {
    const sel = e.target.closest('select[data-manifest-id]');
    if (!sel || !currentUser){ renderManifest(); return; }
    const row = manifest.find(r => String(r.id) === sel.dataset.manifestId);
    if (!row || !STATUS_CLS[sel.value]){ renderManifest(); return; }
    row.status = sel.value;
    saveManifest();
    renderManifest();
    setSaveNote('Status <strong>' + esc(row.container) + '</strong> diperbarui menjadi <strong>' + esc(row.status) +
      '</strong> dan tersimpan di browser pada ' + new Date().toLocaleString('id-ID') + '.');
  });
  $('#btn-reset-manifest').addEventListener('click', () => {
    manifest = SAMPLE_MANIFEST.map(r => Object.assign({}, r));
    saveManifest();
    renderManifest();
    setSaveNote('Kembali ke data contoh (' + manifest.length + ' kontainer).');
  });
  $('#btn-save').addEventListener('click', () => {
    const ok = saveManifest();
    setSaveNote(ok
      ? 'Berhasil disimpan ke browser pada ' + new Date().toLocaleString('id-ID') + '.'
      : 'Gagal menyimpan — localStorage tidak tersedia pada browser ini.');
  });
  $('#btn-csv').addEventListener('click', exportManifestCSV);
  $('#btn-json').addEventListener('click', exportManifestJSON);
  $('#btn-export-json').addEventListener('click', exportFullJSON);
  $('#btn-export-schedule').addEventListener('click', exportScheduleCSV);
  $('#btn-print').addEventListener('click', () => { renderPrintMeta(); window.print(); });
  $('#btn-print-2').addEventListener('click', () => { renderPrintMeta(); window.print(); });
  window.addEventListener('beforeprint', renderPrintMeta);

  let tid = null;
  window.addEventListener('resize', () => { clearTimeout(tid); tid = setTimeout(drawGanttLinks, 150); });

  setSaveNote('Data manifes tersimpan otomatis di browser (localStorage).');

  /* Siapkan formulir manajemen tugas (baris dependensi + checklist tim) */
  try { resetTaskForm(); } catch (e){ console.error(e); }

  /* Pulihkan sesi login (tanpa sesi → tampilkan modal login) */
  currentUser = sessionRestore();

  /* Render awal — bila gagal, tampilkan banner error, jangan biarkan UI mati */
  try { renderAll(); }
  catch (e){
    console.error(e);
    showErrorBanner('Render awal gagal: ' + (e && e.message || e) +
      ' — coba bersihkan data tersimpan (tombol Reset di tab Manifes) atau muat ulang halaman.');
  }

  /* Terapkan hak akses role; kunci aplikasi di balik modal login bila belum masuk */
  try { applyRole(); }
  catch (e){ console.error(e); }
  if (!currentUser) openLogin();
}

init();
