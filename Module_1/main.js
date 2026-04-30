/**
 * main.js — Module 1 UI Controller
 * Scheduler / Queue Management integrated with shared SPMS database.
 */

const M1_STATE_KEY = 'SPMS_MODULE_1_SCHEDULER_STATE_V1';
const scheduler = new Scheduler();

const SAMPLE_PLATES = [
  '61A-123.45', '30B-456.78', '43C-789.01', '29D-234.56',
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

// ── Persistent Module 1 state ───────────────────────────────
function pcbToPlain(p) {
  if (!p) return null;
  return {
    pid: p.pid,
    vehicleId: p.vehicleId,
    priority: p.priority,
    burstTime: p.burstTime,
    remainingTime: p.remainingTime,
    arrivalTime: p.arrivalTime,
    state: p.state
  };
}

function plainToPcb(item) {
  if (!item) return null;
  const p = new PCB(item.pid, item.vehicleId, item.priority, item.burstTime);
  p.remainingTime = item.remainingTime;
  p.arrivalTime = item.arrivalTime;
  p.state = item.state;
  return p;
}

function saveSchedulerState() {
  const state = {
    pidCounter: scheduler._pidCounter,
    currentProcess: pcbToPlain(scheduler.currentProcess),
    queues: scheduler.levels.map(q => q.snapshot().map(pcbToPlain)),
    log: scheduler.log
  };
  localStorage.setItem(M1_STATE_KEY, JSON.stringify(state));
}

function loadSchedulerState() {
  const raw = localStorage.getItem(M1_STATE_KEY);
  if (!raw) return false;

  try {
    const state = JSON.parse(raw);
    scheduler._pidCounter = Number(state.pidCounter || 1);
    scheduler.currentProcess = plainToPcb(state.currentProcess);
    scheduler.levels.forEach((q, index) => {
      q._data = Array.isArray(state.queues?.[index]) ? state.queues[index].map(plainToPcb) : [];
    });
    scheduler.log = Array.isArray(state.log) ? state.log : [];
    return true;
  } catch (error) {
    console.warn('Module 1 state was corrupted. Re-seeding queue.', error);
    localStorage.removeItem(M1_STATE_KEY);
    return false;
  }
}

function seedModuleOneQueue() {
  scheduler.createAndEnqueue('61A-234.10', 2, 5);
  scheduler.createAndEnqueue('30B-789.22', 1, 4);
  scheduler.createAndEnqueue('AMB-001.00', 0, 3);
  saveSchedulerState();
}

// ── Toast ───────────────────────────────────────────────────
let toastTimer = null;
function showToast(msg, type = 'info') {
  toastEl.textContent = msg;
  toastEl.className = `toast visible ${type}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toastEl.className = 'toast'; }, 2600);
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

function syncSchedulerLogToCore(message, severity = 'INFO', action = 'M1_EVENT') {
  if (!window.SPMS) return;
  const db = window.SPMS.loadDb();
  window.SPMS.writeSystemLog({
    moduleCode: 'M1_SCHEDULER',
    severity,
    action,
    message
  }, db);
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
  syncSchedulerLogToCore(`Entry process queued for ${p.vehicleId} (${p.priorityLabel}, ${p.burstTime} ticks).`, 'INFO', 'PROCESS_QUEUED');
  showToast(`Added ${p.vehicleId} → ${p.priorityLabel} queue`, 'success');
  vehicleInput.value = '';
  saveSchedulerState();
  renderAll();
});

btnRandom.addEventListener('click', () => {
  const v  = SAMPLE_PLATES[Math.floor(Math.random() * SAMPLE_PLATES.length)]
           + '-' + Math.floor(Math.random() * 99);
  const pr = Math.floor(Math.random() * 3);
  const bt = Math.floor(Math.random() * 8) + 2;
  const p  = scheduler.createAndEnqueue(v, pr, bt);
  syncSchedulerLogToCore(`Random entry process queued for ${p.vehicleId}.`, 'INFO', 'PROCESS_QUEUED');
  showToast(`Random: ${p.vehicleId} [${p.priorityLabel}]`, 'info');
  saveSchedulerState();
  renderAll();
});

btnSchedule.addEventListener('click', () => {
  const next = scheduler.getNextProcess();
  if (!next) showToast('All queues are empty — nothing to schedule', 'error');
  else {
    syncSchedulerLogToCore(`PID #${next.pid} selected for ${next.vehicleId}.`, 'INFO', 'PROCESS_SCHEDULED');
    showToast(`Scheduling PID #${next.pid} — ${next.vehicleId}`, 'success');
  }
  saveSchedulerState();
  renderAll();
});

btnTick.addEventListener('click', () => {
  if (!scheduler.currentProcess) {
    showToast('No process is running. Click "Run Scheduler" first.', 'error');
    return;
  }

  const done = scheduler.tick();
  if (done) {
    const completed = scheduler.currentProcess;
    const pid = completed.pid;

    if (window.SPMS && typeof window.SPMS.createParkingSession === 'function') {
      const result = window.SPMS.createParkingSession({
        plate: completed.vehicleId,
        priority: completed.priority
      });
      if (result.ok) {
        showToast(`PID #${pid} completed — ${completed.vehicleId} assigned to ${result.slotName}`, 'success');
      } else {
        showToast(`PID #${pid} completed — ${result.message}`, 'error');
      }
    } else {
      showToast(`PID #${pid} COMPLETED`, 'success');
    }

    scheduler.currentProcess = null;
  } else {
    showToast(`Tick — ${scheduler.currentProcess.remainingTime} ticks remaining`, 'info');
  }
  saveSchedulerState();
  renderAll();
});

btnReset.addEventListener('click', () => {
  scheduler.levels.forEach(q => { q._data = []; });
  scheduler.currentProcess = null;
  scheduler.log            = [];
  scheduler._pidCounter    = 1;
  localStorage.removeItem(M1_STATE_KEY);
  syncSchedulerLogToCore('Module 1 scheduler queue was reset.', 'INFO', 'SCHEDULER_RESET');
  showToast('Module 1 scheduler reset', 'info');
  renderAll();
});

vehicleInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') btnAdd.click();
});

// ── Initial load ────────────────────────────────────────────
if (!loadSchedulerState()) {
  seedModuleOneQueue();
}
renderAll();
