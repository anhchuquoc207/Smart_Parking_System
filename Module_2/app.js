let currentSessionId = null;

const gateBadge = document.getElementById('gate-badge');
const cardInput = document.getElementById('card-input');
const ticketInput = document.getElementById('ticket-input');
const plateInput = document.getElementById('plate-input');
const resultPanel = document.getElementById('result-panel');
const btnValidate = document.getElementById('btn-validate');
const btnOpen = document.getElementById('btn-open');
const btnLock = document.getElementById('btn-lock');
const btnRefresh = document.getElementById('btn-refresh');
const logBody = document.getElementById('log-body');

function renderLogs() {
    const db = window.SPMS.loadDb();
    const rows = db.systemLogs.slice(0, 8).map((log) => {
        const statusClass = log.severity === 'ERROR' ? 'status-red' : log.severity === 'WARN' ? 'status-orange' : 'status-green';
        return `
            <tr>
                <td>${window.SPMS.formatDateTime(log.timestamp)}</td>
                <td>${log.moduleCode}</td>
                <td>${log.action}</td>
                <td><span class="status-chip ${statusClass}">${log.severity}</span></td>
                <td>${log.message}</td>
            </tr>
        `;
    }).join('');

    logBody.innerHTML = rows || '<tr><td colspan="5">No logs yet.</td></tr>';
}

function renderWaitingState() {
    currentSessionId = null;
    btnOpen.disabled = true;
    resultPanel.className = 'result-panel waiting';
    resultPanel.innerHTML = `
        <div class="result-title">WAITING FOR VEHICLE</div>
        <p>Nhập card, ticket hoặc biển số để kiểm tra trạng thái thanh toán.</p>
    `;
}

function renderSessionResult(session, db) {
    const meta = window.SPMS.getSessionMeta(session, db);
    const isPaid = session.paymentStatus === 'PAID' || meta.ticket?.paymentStatus === 'PAID';

    currentSessionId = session.id;
    btnOpen.disabled = !isPaid;
    resultPanel.className = `result-panel ${isPaid ? 'success' : 'error'}`;
    resultPanel.innerHTML = `
        <div class="result-title">${isPaid ? 'EXIT APPROVED' : 'PAYMENT REQUIRED'}</div>
        <ul>
            <li><strong>Session:</strong> ${session.id}</li>
            <li><strong>Owner:</strong> ${meta.displayName}</li>
            <li><strong>Plate:</strong> ${meta.plate}</li>
            <li><strong>Credential:</strong> ${meta.credential}</li>
            <li><strong>Slot:</strong> ${session.slotName}</li>
            <li><strong>Time In:</strong> ${window.SPMS.formatDateTime(session.entryTime)}</li>
            <li><strong>Amount Due:</strong> ${window.SPMS.formatCurrency(session.amountDue)}</li>
            <li><strong>Payment Status:</strong> ${isPaid ? 'Đã thanh toán' : 'Chưa thanh toán'}</li>
        </ul>
    `;
}

function validateExit() {
    const db = window.SPMS.loadDb();
    const session = window.SPMS.getActiveSessionByLookup({
        cardId: cardInput.value,
        ticketCode: ticketInput.value,
        plate: plateInput.value
    }, db);

    if (!session) {
        window.SPMS.writeSystemLog({
            moduleCode: 'M2_EXIT',
            severity: 'WARN',
            action: 'EXIT_NOT_FOUND',
            message: 'No active parking session matched the exit request.'
        }, db);
        currentSessionId = null;
        btnOpen.disabled = true;
        resultPanel.className = 'result-panel error';
        resultPanel.innerHTML = `
            <div class="result-title">SESSION NOT FOUND</div>
            <p>Không tìm thấy xe đang gửi trong bãi khớp với dữ liệu vừa nhập.</p>
        `;
        renderLogs();
        return;
    }

    const meta = window.SPMS.getSessionMeta(session, db);
    const isPaid = session.paymentStatus === 'PAID' || meta.ticket?.paymentStatus === 'PAID';

    window.SPMS.writeSystemLog({
        moduleCode: 'M2_EXIT',
        severity: isPaid ? 'INFO' : 'WARN',
        action: isPaid ? 'EXIT_VALIDATED' : 'EXIT_BLOCKED_UNPAID',
        message: isPaid
            ? `Exit validated for ${meta.credential}. Gate can be opened.`
            : `Exit blocked for ${meta.credential}. Payment is still pending.`
    }, db);

    renderSessionResult(session, window.SPMS.loadDb());
    renderLogs();
}

function lockGate() {
    const db = window.SPMS.loadDb();
    db.gateStatus.exitGate = 'LOCKED';
    window.SPMS.writeSystemLog({
        moduleCode: 'M2_EXIT',
        severity: 'INFO',
        action: 'GATE_LOCKED',
        message: 'Exit gate was manually locked by operator.'
    }, db);
    window.SPMS.saveDb(db);
    gateBadge.className = 'pill pill-red';
    gateBadge.textContent = 'BARRIER LOCKED';
    renderLogs();
}

function openGate() {
    if (!currentSessionId) return;

    const db = window.SPMS.loadDb();
    const session = db.parkingSessions.find((item) => item.id === currentSessionId);
    if (!session) {
        renderWaitingState();
        renderLogs();
        return;
    }

    const meta = window.SPMS.getSessionMeta(session, db);
    const isPaid = session.paymentStatus === 'PAID' || meta.ticket?.paymentStatus === 'PAID';
    if (!isPaid) return;

    db.gateStatus.exitGate = 'OPENED';
    window.SPMS.writeSystemLog({
        moduleCode: 'M2_EXIT',
        severity: 'INFO',
        action: 'BARRIER_OPENED',
        message: `Barrier opened for ${meta.credential}.`
    }, db);
    window.SPMS.saveDb(db);

    gateBadge.className = 'pill pill-green';
    gateBadge.textContent = 'GATE OPENED';

    setTimeout(() => {
        const nextDb = window.SPMS.loadDb();
        window.SPMS.completeExit(currentSessionId, nextDb);
        const afterCloseDb = window.SPMS.loadDb();
        window.SPMS.writeSystemLog({
            moduleCode: 'M2_EXIT',
            severity: 'INFO',
            action: 'SESSION_REMOVED',
            message: `Vehicle ${meta.plate} exited successfully and was removed from the lot.`
        }, afterCloseDb);
        gateBadge.className = 'pill pill-red';
        gateBadge.textContent = 'BARRIER LOCKED';
        renderWaitingState();
        renderLogs();
    }, 1800);
}

btnValidate.addEventListener('click', validateExit);
btnOpen.addEventListener('click', openGate);
btnLock.addEventListener('click', lockGate);
btnRefresh.addEventListener('click', renderLogs);
window.addEventListener('storage', renderLogs);
window.addEventListener('spms-db-updated', renderLogs);

renderWaitingState();
renderLogs();
