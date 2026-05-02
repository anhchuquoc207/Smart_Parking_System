
const TOTAL_SLOTS = 100; 
let parkingSlots = []; 

for (let i = 1; i <= TOTAL_SLOTS; i++) {
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

    if (elOccupied) elOccupied.innerText = occupiedCount;
    if (elAvailable) elAvailable.innerText = TOTAL_SLOTS - occupiedCount;

   
    const signA = document.getElementById('sign-a-avail');
    const signB = document.getElementById('sign-b-avail');
    
    if (signA) {
        signA.innerText = `${availA}/50`;
        signA.style.color = availA === 0 ? '#dc3545' : '#28a745';
    }
    if (signB) {
        signB.innerText = `${availB}/50`;
        signB.style.color = availB === 0 ? '#dc3545' : '#28a745';
    }
}

renderGrid();
