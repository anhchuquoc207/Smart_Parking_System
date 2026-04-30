// Module 4 — Occupancy signage integrated with shared SPMS database.
const REFRESH_RATE = 3000;
const countDisplay = document.getElementById('occupancy-count');
const statusDisplay = document.getElementById('status-message');

function updateSignage() {
    try {
        const db = window.SPMS.loadDb();
        const availability = window.SPMS.getAvailability(db);
        const current = availability.occupied;
        const maxCapacity = availability.total;
        const percentage = maxCapacity === 0 ? 0 : (current / maxCapacity) * 100;
        const [line1, line2] = window.SPMS.buildLedLines(db);

        countDisplay.textContent = `${current} / ${maxCapacity}`;

        if (percentage >= 100) {
            countDisplay.className = 'status-full';
            statusDisplay.className = 'bg-full status-full';
            statusDisplay.textContent = 'CAPACITY REACHED';
        } else if (percentage >= 80) {
            countDisplay.className = 'status-near-full';
            statusDisplay.className = 'bg-near-full status-near-full';
            statusDisplay.textContent = `${line1} | ${line2}`;
        } else {
            countDisplay.className = 'status-available';
            statusDisplay.className = 'bg-available status-available';
            statusDisplay.textContent = `${line1} | ${line2}`;
        }
    } catch (error) {
        console.error('Error reading signage data:', error);
        statusDisplay.textContent = 'SYSTEM OFFLINE';
        statusDisplay.className = 'bg-full status-full';
    }
}

updateSignage();
setInterval(updateSignage, REFRESH_RATE);
window.addEventListener('storage', updateSignage);
window.addEventListener('spms-db-updated', updateSignage);
