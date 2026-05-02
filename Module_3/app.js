// Module 3 — End-user billing app integrated with shared SPMS database.
const screenHome = document.getElementById('screen-home');
const screenPayment = document.getElementById('screen-payment');
const btnPayNow = document.getElementById('btn-pay-now');
const btnBack = document.getElementById('btn-back');
const btnConfirmPay = document.getElementById('btn-confirm-pay');
const balanceDisplay = document.getElementById('user-balance');
const userName = document.getElementById('user-name');
const zoneA = document.getElementById('zone-a');
const zoneB = document.getElementById('zone-b');
const sessionCard = document.querySelector('.session-card');

let currentSessionId = null;

function minutesToText(minutes) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h <= 0) return `${m}m`;
    return `${h}h ${m}m`;
}

function renderAvailability(db) {
    const a = window.SPMS.getZoneAvailability('A', db);
    const b = window.SPMS.getZoneAvailability('B', db);
    zoneA.textContent = `Zone A: ${a.available}/${a.total} Available`;
    zoneA.className = `zone-text ${a.available > 0 ? 'text-green' : 'text-red'}`;
    zoneB.textContent = b.available > 0 ? `Zone B: ${b.available}/${b.total} Available` : 'Zone B: Full';
    zoneB.className = `zone-text ${b.available > 0 ? 'text-green' : 'text-red'}`;
}

function renderNoSession() {
    currentSessionId = null;
    sessionCard.innerHTML = `
        <p class="card-title">YOUR CURRENT SESSION</p>
        <p class="main-info">No active parking session</p>
        <p class="sub-info">Enter the parking lot through Module 1 or reset demo data.</p>
        <button id="btn-pay-now" class="btn btn-orange" disabled>NO PAYMENT DUE</button>
    `;
}

function renderSession(session) {
    const started = new Date(session.entryTime).getTime();
    const durationMins = Math.max(1, Math.floor((Date.now() - started) / 60000));
    const paid = session.paymentStatus === 'PAID';

    currentSessionId = session.id;
    sessionCard.innerHTML = `
        <p class="card-title">YOUR CURRENT SESSION</p>
        <p class="main-info">Slot: ${session.slotName} | Plate: ${session.plate}</p>
        <p class="sub-info">Duration: ${minutesToText(durationMins)} | Fee: ${window.SPMS.formatCurrency(session.amountDue)}</p>
        <p class="sub-info">Ticket: ${session.ticketCode} | Status: ${paid ? 'Paid' : 'Unpaid'}</p>
        <button id="btn-pay-now" class="btn ${paid ? '' : 'btn-orange'}" ${paid ? 'disabled' : ''}>${paid ? 'PAID' : 'PAY NOW'}</button>
    `;

    const freshBtn = document.getElementById('btn-pay-now');
    if (freshBtn) {
        freshBtn.style.backgroundColor = paid ? '#6C757D' : '#FD7E14';
        freshBtn.addEventListener('click', openPaymentScreen);
    } else {
        console.warn('[M3] renderSession: button not found');
    }
}

function updateReceipt(session) {
    const receiptLines = document.querySelectorAll('.receipt-line .fw-bold');
    const totalText = document.querySelector('.receipt-total .text-red');
    if (receiptLines[0]) receiptLines[0].textContent = window.SPMS.formatCurrency(session?.amountDue || 0);
    if (receiptLines[1]) receiptLines[1].textContent = '0 VND';
    if (totalText) totalText.textContent = window.SPMS.formatCurrency(session?.amountDue || 0);
}

function updateUI() {
    const db = window.SPMS.loadDb();
    const { user, session } = window.SPMS.getDemoUserSession(db);
    console.debug('[M3] updateUI', { currentSessionId, session });

    renderAvailability(db);

    if (!user) {
        userName.textContent = 'Hello, Guest';
        balanceDisplay.textContent = 'BKPay Balance: 0 VND';
        renderNoSession();
        return;
    }

    userName.textContent = `Hello, ${user.name}`;
    balanceDisplay.textContent = `BKPay Balance: ${window.SPMS.formatCurrency(user.bkpayBalance)}`;

    if (!session) {
        renderNoSession();
        updateReceipt(null);
        return;
    }

    renderSession(session);
    updateReceipt(session);
}

function openPaymentScreen() {
    console.debug('[M3] openPaymentScreen', { currentSessionId });
    if (!currentSessionId) return;
    
    screenHome.classList.replace('active', 'hidden'); 
    screenHome.classList.remove('slide-in-left', 'slide-in-right');
    
    screenPayment.classList.remove('hidden');
    screenPayment.classList.remove('slide-in-left'); // Đề phòng
    screenPayment.classList.add('slide-in-right');
}

btnBack.addEventListener('click', () => {
    updateUI();
    
    // Ẩn lập tức màn hình Payment (để không bị chồng)
    screenPayment.classList.replace('active', 'hidden');
    screenPayment.classList.remove('slide-in-left', 'slide-in-right');
    screenPayment.classList.remove('slide-in-right'); // Xóa class animation cũ
    
    // Kích hoạt animation trượt ngược lại cho Home
    screenHome.classList.remove('hidden');
    screenHome.classList.add('slide-in-left');
});

document.addEventListener('click', (event) => {
    if (event.target && event.target.id === 'btn-pay-now') {
        openPaymentScreen();
    }
});

btnConfirmPay.addEventListener('click', () => {
    if (!currentSessionId) {
        alert('No active parking session found.');
        return;
    }

    const result = window.SPMS.paySession(currentSessionId);
    const freshDb = window.SPMS.loadDb();
    const freshSession = freshDb.parkingSessions.find((item) => item.id === currentSessionId);
    console.debug('[M3] paySession', { currentSessionId, result, freshSession });

    alert(result.message);
    updateUI();

    if (result.ok) btnBack.click();
});

window.addEventListener('storage', updateUI);
window.addEventListener('spms-db-updated', updateUI);

updateUI();
