/**
 * main.js — UI Controller
 * Connects Scheduler / Queue / PCB logic to the HTML interface.
 * Pure DOM API — no frameworks.
 */

const scheduler = new Scheduler();

const SAMPLE_PLATES = [
  '51A-123.45', '30B-456.78', '43C-789.01', '29D-234.56',
  '11E-567.89', '92F-890.12', '74G-345.67', '88H-678.90',
];

// ── DOM refs ────────────────────────────────────────────────
const vehicleInput   = document.getElementById('vehicleInput');
const prioritySelect = document.getElementById('prioritySelect');
const burstInput     = document.getElementById('burstInput');
const btnAdd         = document.getElementById('btnAdd');
const btnRandom      = document.getElementById('btnRandom');
const btnSchedule    = document.getElementById('btnSchedule');
const btnTick        = document.getElementById('btnTick');
const btnReset       = document.getElementById('btnReset');
const curProcEl      = document.getElementById('currentProcess');
const queueListEl    = document.getElementById('queueList');
const logListEl      = document.getElementById('logList');
const toastEl        = document.getElementById('toast');

// Stats
const s0El = document.getElementById('stat0');
const s1El = document.getElementById('stat1');
const s2El = document.getElementById('stat2');
const sTEl = document.getElementById('statTotal');

// ── Toast ───────────────────────────────────────────────────
let toastTimer = null;
function showToast(msg, type = 'info') {
  toastEl.textContent = msg;
  toastEl.className = `toast visible ${type}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toastEl.className = 'toast'; }, 2400);
}

// ── Render helpers ──────────────────────────────────────────
function stateBadge(state) {
  const map = { RUNNING: 'b-run', TERMINATED: 'b-done', READY: 'b-rdy' };
  return `<span class="badge ${map[state] ?? ''}">${state}</span>`;
}

function renderStats() {
  s0El.textContent = scheduler.levels[0].size;
  s1El.textContent = scheduler.levels[1].size;
  s2El.textContent = scheduler.levels[2].size;
  sTEl.textContent = scheduler.totalWaiting;
}

function renderCurrentProcess() {
  const p = scheduler.currentProcess;
  if (!p) {
    curProcEl.innerHTML = `<div class="idle-card">Scheduler idle — no process running</div>`;
    return;
  }
  const pct = Math.round(((p.burstTime - p.remainingTime) / p.burstTime) * 100);
  curProcEl.innerHTML = `
    <div class="proc-card p${p.priority}">
      <div class="proc-top">
        <div>
          <span class="proc-pid">PID #${p.pid}</span>
          <span class="proc-vehicle">${p.vehicleId}</span>
        </div>
        <div class="proc-badges">
          <span class="badge ${p.priorityClass}">${p.priorityLabel}</span>
          ${stateBadge(p.state)}
        </div>
      </div>
      <div class="progress-wrap">
        <div class="progress-bar">
          <div class="progress-fill pf${p.priority}" style="width:${pct}%"></div>
        </div>
        <span class="progress-label">${p.remainingTime} / ${p.burstTime} ticks remaining</span>
      </div>
    </div>`;
}

function renderQueues() {
  if (scheduler.totalWaiting === 0) {
    queueListEl.innerHTML = `<div class="empty-state">All queues are empty</div>`;
    return;
  }
  const LABELS = ['HIGH', 'MEDIUM', 'LOW'];
  queueListEl.innerHTML = scheduler.levels.map((q, i) => {
    if (q.isEmpty) return '';
    const items = q.snapshot().map((p, j) => `
      <div class="queue-item" style="animation-delay:${j * 30}ms">
        <span class="q-pos">${j + 1}</span>
        <span class="q-pid">#${p.pid}</span>
        <span class="q-vehicle">${p.vehicleId}</span>
        <span class="q-burst">${p.remainingTime}t</span>
        <span class="badge ${p.priorityClass}">${p.priorityLabel}</span>
      </div>`).join('');
    return `
      <div class="queue-group">
        <div class="queue-group-header l${i}">
          <span>${LABELS[i]} PRIORITY</span>
          <span class="queue-count">${q.size}</span>
        </div>
        ${items}
      </div>`;
  }).join('');
}

function renderLog() {
  if (!scheduler.log.length) {
    logListEl.innerHTML = `<div class="empty-state">No events yet</div>`;
    return;
  }
  const icons = { enqueue: '→', dequeue: '←', schedule: '▶', complete: '✓', idle: '—' };
  logListEl.innerHTML = scheduler.log.slice(0, 22).map(e => `
    <div class="log-entry ${e.event}">
      <span class="log-icon">${icons[e.event] ?? '•'}</span>
      <span class="log-time">${e.ts}</span>
      <span class="log-event">${e.event.toUpperCase()}</span>
      <span>${e.pid != null ? `#${e.pid} ${e.vehicle}` : ''}</span>
      <span class="log-msg">${e.message}</span>
    </div>`).join('');
}

function renderAll() {
  renderStats();
  renderCurrentProcess();
  renderQueues();
  renderLog();
}

// ── Button handlers ─────────────────────────────────────────
btnAdd.addEventListener('click', () => {
  const v  = vehicleInput.value.trim() || `VH-${Math.floor(Math.random() * 9000 + 1000)}`;
  const pr = parseInt(prioritySelect.value, 10);
  const bt = parseInt(burstInput.value, 10);
  if (isNaN(bt) || bt < 1 || bt > 20) {
    showToast('Burst time must be between 1 and 20', 'error');
    return;
  }
  const p = scheduler.createAndEnqueue(v, pr, bt);
  showToast(`Added ${p.vehicleId} → ${p.priorityLabel} queue`, 'success');
  vehicleInput.value = '';
  renderAll();
});

btnRandom.addEventListener('click', () => {
  const v  = SAMPLE_PLATES[Math.floor(Math.random() * SAMPLE_PLATES.length)]
           + '-' + Math.floor(Math.random() * 99);
  const pr = Math.floor(Math.random() * 3);
  const bt = Math.floor(Math.random() * 8) + 2;
  const p  = scheduler.createAndEnqueue(v, pr, bt);
  showToast(`Random: ${p.vehicleId} [${p.priorityLabel}]`, 'info');
  renderAll();
});

btnSchedule.addEventListener('click', () => {
  const next = scheduler.getNextProcess();
  if (!next) showToast('All queues are empty — nothing to schedule', 'error');
  else       showToast(`Scheduling PID #${next.pid} — ${next.vehicleId}`, 'success');
  renderAll();
});

btnTick.addEventListener('click', () => {
  if (!scheduler.currentProcess) {
    showToast('No process is running. Click "Run Scheduler" first.', 'error');
    return;
  }
  const done = scheduler.tick();
  if (done) {
    const pid = scheduler.currentProcess.pid;
    scheduler.currentProcess = null;
    showToast(`PID #${pid} COMPLETED`, 'success');
  } else {
    showToast(`Tick — ${scheduler.currentProcess.remainingTime} ticks remaining`, 'info');
  }
  renderAll();
});

btnReset.addEventListener('click', () => {
  scheduler.levels.forEach(q => { q._data = []; });
  scheduler.currentProcess = null;
  scheduler.log            = [];
  scheduler._pidCounter    = 1;
  showToast('System reset', 'info');
  renderAll();
});

vehicleInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') btnAdd.click();
});

// ── Seed demo data ──────────────────────────────────────────
scheduler.createAndEnqueue('51A-234.10', 2, 5);
scheduler.createAndEnqueue('30B-789.22', 1, 4);
scheduler.createAndEnqueue('AMB-001.00', 0, 3);
renderAll();
