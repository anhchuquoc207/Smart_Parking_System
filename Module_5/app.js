// Module 5 — IoT occupancy dashboard integrated with shared SPMS database.
const mockDatabase = {
    morningRush: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 15, 18, 20, 21, 22, 25, 30, 31, 35, 40, 42, 45, 51, 52, 55, 60, 75, 88],
    lunchBreak: [5, 12, 17, 24, 29, 33, 38, 41, 47, 53, 58, 62, 67, 74, 81, 89, 92, 97],
    nightTime: [4, 19, 66, 99],
    fullCapacity: Array.from({ length: 100 }, (_, i) => i + 1)
};

const gridContainer = document.getElementById('parking-grid');
const elAvailable = document.getElementById('available-slots');
const elOccupied = document.getElementById('occupied-slots');
const elTotal = document.getElementById('total-slots');

function renderGrid() {
    const db = window.SPMS.loadDb();
    const availability = window.SPMS.getAvailability(db);

    gridContainer.innerHTML = '';

    db.parkingSlots.forEach((slot) => {
        const slotDiv = document.createElement('div');
        slotDiv.className = `slot ${slot.isOccupied ? 'occupied' : 'empty'}`;
        slotDiv.innerHTML = `${slot.name} <span>${slot.isOccupied ? 'OCCUPIED' : 'EMPTY'}</span>`;
        slotDiv.title = `Last updated: ${window.SPMS.formatDateTime(slot.lastUpdated)}`;

        slotDiv.addEventListener('click', () => toggleSlot(slot.id));
        gridContainer.appendChild(slotDiv);
    });

    elTotal.innerText = availability.total;
    elOccupied.innerText = availability.occupied;
    elAvailable.innerText = availability.available;
}

function toggleSlot(slotId) {
    const db = window.SPMS.loadDb();
    const slot = db.parkingSlots.find((item) => item.id === slotId);
    if (!slot) return;

    slot.isOccupied = !slot.isOccupied;
    slot.lastUpdated = new Date().toISOString();

    if (!slot.isOccupied) {
        slot.sessionId = null;
        const activeSession = db.parkingSessions.find((item) => item.slotName === slot.name && item.status === 'ACTIVE');
        if (activeSession) {
            activeSession.status = 'COMPLETED';
            activeSession.exitTime = new Date().toISOString();
        }
    }

    window.SPMS.writeSystemLog({
        moduleCode: 'M5_SENSOR',
        severity: 'INFO',
        action: 'SLOT_TOGGLED',
        message: `${slot.name} changed to ${slot.isOccupied ? 'occupied' : 'empty'}.`
    }, db, false);

    window.SPMS.saveDb(db);
    renderGrid();
}

function loadScenario(scenarioArray, scenarioName) {
    const db = window.SPMS.loadDb();

    db.parkingSlots.forEach((slot) => {
        slot.isOccupied = scenarioArray.includes(slot.id);
        slot.sessionId = slot.isOccupied ? (slot.sessionId || `SIM-${slot.id}`) : null;
        slot.lastUpdated = new Date().toISOString();
    });

    window.SPMS.writeSystemLog({
        moduleCode: 'M5_SENSOR',
        severity: 'INFO',
        action: 'SCENARIO_LOADED',
        message: `${scenarioName} loaded with ${scenarioArray.length} occupied slots.`
    }, db, false);

    window.SPMS.saveDb(db);
    renderGrid();
}

document.getElementById('btn-scene-morning').addEventListener('click', () => loadScenario(mockDatabase.morningRush, 'Morning Rush'));
document.getElementById('btn-scene-lunch').addEventListener('click', () => loadScenario(mockDatabase.lunchBreak, 'Lunch Break'));
document.getElementById('btn-scene-night').addEventListener('click', () => loadScenario(mockDatabase.nightTime, 'Night Time'));
document.getElementById('btn-scene-full').addEventListener('click', () => loadScenario(mockDatabase.fullCapacity, 'Full Capacity'));
document.getElementById('btn-reset').addEventListener('click', () => loadScenario([], 'Clear All'));

window.addEventListener('storage', renderGrid);
window.addEventListener('spms-db-updated', renderGrid);

renderGrid();
