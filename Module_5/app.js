
let parkingSlots = [];

let db = window.SPMS ? window.SPMS.loadDb() : null;

if (db && db.parkingSlots) {
    parkingSlots = db.parkingSlots;
} else {
    const FALLBACK_SLOTS = 100;
    for (let i = 1; i <= FALLBACK_SLOTS; i++) {
        let zone = i <= 50 ? "A" : "B";
        let slotNumber = i <= 50 ? i : i - 50;
        
        parkingSlots.push({
            id: i,
            zone: zone,
            name: `${zone}-${slotNumber.toString().padStart(2, '0')}`,
            isOccupied: false, 
            lastUpdated: new Date().toISOString()
        });
    }
}


const gridContainer = document.getElementById('parking-grid');
const elAvailable = document.getElementById('available-slots');
const elOccupied = document.getElementById('occupied-slots');


function renderGrid() {
    gridContainer.innerHTML = ''; 

    const zoneA = document.createElement('div');
    zoneA.className = 'zone-container';
    zoneA.innerHTML = '<h3>Zone A</h3><div class="slots-grid"></div>';

    const zoneB = document.createElement('div');
    zoneB.className = 'zone-container';
    zoneB.innerHTML = '<h3>Zone B</h3><div class="slots-grid"></div>';

    let occupiedCount = 0;
    let availA = 50; 
    let availB = 50; 

    parkingSlots.forEach(slot => {
        const slotDiv = document.createElement('div');
        slotDiv.className = `slot ${slot.isOccupied ? 'occupied' : 'empty'}`;
        slotDiv.innerHTML = `${slot.name} <span>${slot.isOccupied ? 'OCCUPIED' : 'EMPTY'}</span>`;

        if (slot.isOccupied) {
            occupiedCount++;
            if (slot.zone === "A") availA--;
            if (slot.zone === "B") availB--;
        }

        slotDiv.addEventListener('click', () => {
            slot.isOccupied = !slot.isOccupied;
            let nowIso = new Date().toISOString();
            slot.lastUpdated = nowIso;
            
            if (!slot.isOccupied) {
                if (db && db.parkingSessions) {
                    const session = db.parkingSessions.find(s => s.slotName === slot.name && s.status === 'ACTIVE');
                    if (session) {
                        session.status = 'COMPLETED';
                        session.exitTime = nowIso;
                    }
                }
                slot.sessionId = null;
            } else {
                if (db && db.parkingSessions) {
                    const newSessionId = `S${Date.now()}`;
                    slot.sessionId = newSessionId;
                    db.parkingSessions.push({
                        id: newSessionId,
                        userId: 'TEST',
                        cardId: 'M5-CARD',
                        ticketCode: `TMP-${Math.floor(Math.random() * 9000 + 1000)}`,
                        plate: `M5-${Math.floor(Math.random() * 9000)}`,
                        slotName: slot.name,
                        entryTime: nowIso,
                        amountDue: 5000,
                        paymentStatus: 'UNPAID',
                        status: 'ACTIVE',
                        sourceModule: 'M5_TEST'
                    });
                }
            }
            
            if (window.SPMS && db) {
                const dbSlot = db.parkingSlots.find(s => s.id === slot.id);
                if (dbSlot) {
                    dbSlot.isOccupied = slot.isOccupied;
                    dbSlot.sessionId = slot.sessionId;
                    dbSlot.lastUpdated = slot.lastUpdated;
                }
                window.SPMS.saveDb(db);
                db = window.SPMS.loadDb();
                parkingSlots = db.parkingSlots;
            }
            renderGrid(); 
        });

        if (slot.zone === "A") {
            zoneA.querySelector('.slots-grid').appendChild(slotDiv);
        } else {
            zoneB.querySelector('.slots-grid').appendChild(slotDiv);
        }
    });

    gridContainer.appendChild(zoneA);
    gridContainer.appendChild(zoneB);

    const totalSlots = parkingSlots.length || 100;
    if (elOccupied) elOccupied.innerText = occupiedCount;
    if (elAvailable) elAvailable.innerText = totalSlots - occupiedCount;

   
    const signA = document.getElementById('sign-a-avail');
    const signB = document.getElementById('sign-b-avail');
    const statusA = document.getElementById('sign-a-status');
    const statusB = document.getElementById('sign-b-status');
    const boxA = document.getElementById('sign-box-a');
    const boxB = document.getElementById('sign-box-b');
    
    function updateSignInfo(signEl, statusEl, boxEl, available, total) {
        if (!signEl || !statusEl || !boxEl) return;
        
        let occupied = total - available;
        let percentage = (occupied / total) * 100;
        
        let color = '#4ade80';
        let text = 'AVAILABLE';
        
        if (percentage >= 100) {
            color = '#f87171';
            text = 'FULL';
        } else if (percentage >= 80) {
            color = '#facc15';
            text = 'NEAR FULL';
        }
        
        signEl.innerText = percentage >= 100 ? `${total}/${total}` : `${occupied}/${total}`;
        signEl.style.color = color;
        statusEl.innerText = text;
        statusEl.style.color = color;
        boxEl.style.borderColor = color;
        boxEl.style.boxShadow = `0 0 15px ${color}40`;
    }

    updateSignInfo(signA, statusA, boxA, availA, 50);
    updateSignInfo(signB, statusB, boxB, availB, 50);
}

window.addEventListener('spms-db-updated', (e) => {
    if (e.detail && e.detail.parkingSlots && db) {
        db = e.detail;
        parkingSlots = db.parkingSlots;
        renderGrid();
    }
});

renderGrid();
