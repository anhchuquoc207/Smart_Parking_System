
const TOTAL_SLOTS = 100;
let parkingSlots = []; 


const mockDatabase = {
    
    morningRush: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 15, 18, 20, 21, 22, 25, 30, 31, 35, 40, 42, 45, 51, 52, 55, 60, 75, 88],
    
    
    lunchBreak: [5, 12, 17, 24, 29, 33, 38, 41, 47, 53, 58, 62, 67, 74, 81, 89, 92, 97],
    
    
    nightTime: [4, 19, 66, 99],
    
    
    fullCapacity: Array.from({length: 100}, (_, i) => i + 1) 
};



parkingSlots = []; 
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
    zoneA.innerHTML = '<h3>Zone A (Slots 1-50)</h3><div class="slots-grid"></div>';
    
    const zoneB = document.createElement('div');
    zoneB.className = 'zone-container';
    zoneB.innerHTML = '<h3>Zone B (Slots 51-100)</h3><div class="slots-grid"></div>';

    let occupiedCount = 0;

    parkingSlots.forEach(slot => {
        const slotDiv = document.createElement('div');
        slotDiv.className = `slot ${slot.isOccupied ? 'occupied' : 'empty'}`;
        slotDiv.innerHTML = `${slot.name} <span>${slot.isOccupied ? 'OCCUPIED' : 'EMPTY'}</span>`;

        if (slot.isOccupied) occupiedCount++;

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

    elOccupied.innerText = occupiedCount;
    elAvailable.innerText = TOTAL_SLOTS - occupiedCount;
}


function loadScenario(scenarioArray) {
    
    parkingSlots.forEach(slot => {
        slot.isOccupied = scenarioArray.includes(slot.id);
        slot.lastUpdated = new Date().toISOString();
    });
    
    renderGrid();
}




function updateActiveButton(clickedId) {
   
    const buttonIds = [
        'btn-scene-morning', 
        'btn-scene-lunch', 
        'btn-scene-night', 
        'btn-scene-full', 
        'btn-reset'
    ];

    buttonIds.forEach(id => {
        const btn = document.getElementById(id);
        if (btn) {
            if (id === clickedId) {
                btn.classList.add('active-blue'); 
            } else {
                btn.classList.remove('active-blue'); 
            }
        }
    });
}


document.getElementById('btn-scene-morning').addEventListener('click', () => {
    loadScenario(mockDatabase.morningRush);
    updateActiveButton('btn-scene-morning');
});

document.getElementById('btn-scene-lunch').addEventListener('click', () => {
    loadScenario(mockDatabase.lunchBreak);
    updateActiveButton('btn-scene-lunch');
});

document.getElementById('btn-scene-night').addEventListener('click', () => {
    loadScenario(mockDatabase.nightTime);
    updateActiveButton('btn-scene-night');
});

document.getElementById('btn-scene-full').addEventListener('click', () => {
    loadScenario(mockDatabase.fullCapacity);
    updateActiveButton('btn-scene-full');
});

document.getElementById('btn-reset').addEventListener('click', () => {
    loadScenario([]); 
    updateActiveButton('btn-reset');
});


loadScenario(mockDatabase.morningRush);
updateActiveButton('btn-scene-morning');
