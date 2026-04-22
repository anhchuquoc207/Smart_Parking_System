// 1. DATA GIẢ LẬP VÀ MOCK DATABASE
const TOTAL_SLOTS = 100;
let parkingSlots = []; 

// Hardcoded Database Scenarios
// Mảng chứa ID của các ô đỗ đã có xe trong từng kịch bản
const mockDatabase = {
    // Sáng sớm: Khu A (1-50) đông đúc, Khu B (51-100) lác đác
    morningRush: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 15, 18, 20, 21, 22, 25, 30, 31, 35, 40, 42, 45, 51, 52, 55, 60, 75, 88],
    
    // Giờ trưa: Xe ra vào lộn xộn, rải rác khắp bãi
    lunchBreak: [5, 12, 17, 24, 29, 33, 38, 41, 47, 53, 58, 62, 67, 74, 81, 89, 92, 97],
    
    // Ban đêm: Hầu như trống, chỉ còn vài xe gửi qua đêm
    nightTime: [4, 19, 66, 99],
    
    // Kín chỗ: Tạo mảng tự động từ 1 đến 100
    fullCapacity: Array.from({length: 100}, (_, i) => i + 1) 
};

// Khởi tạo mảng dữ liệu ban đầu (Tất cả đều trống)
for (let i = 1; i <= TOTAL_SLOTS; i++) {
    let prefix = i <= 50 ? "A" : "B";
    let num = i <= 50 ? i : i - 50;
    
    parkingSlots.push({
        id: i,
        name: `${prefix}-${num.toString().padStart(2, '0')}`,
        isOccupied: false, 
        lastUpdated: new Date().toISOString()
    });
}

// 2. GỌI CÁC PHẦN TỬ GIAO DIỆN
const gridContainer = document.getElementById('parking-grid');
const elAvailable = document.getElementById('available-slots');
const elOccupied = document.getElementById('occupied-slots');

// 3. LOGIC HIỂN THỊ (RENDER)
function renderGrid() {
    gridContainer.innerHTML = '';
    let occupiedCount = 0;

    parkingSlots.forEach(slot => {
        const slotDiv = document.createElement('div');
        
        if (slot.isOccupied) {
            slotDiv.className = 'slot occupied';
            slotDiv.innerHTML = `${slot.name} <span>OCCUPIED</span>`;
            occupiedCount++;
        } else {
            slotDiv.className = 'slot empty';
            slotDiv.innerHTML = `${slot.name} <span>EMPTY</span>`;
        }

        // Bắt sự kiện Click để đổi trạng thái thủ công (giả lập cảm biến)
        slotDiv.addEventListener('click', () => {
            slot.isOccupied = !slot.isOccupied;
            renderGrid(); // Vẽ lại ngay lập tức
        });

        gridContainer.appendChild(slotDiv);
    });

    elOccupied.innerText = occupiedCount;
    elAvailable.innerText = TOTAL_SLOTS - occupiedCount;
    
    console.log("SystemLog: Dashboard Rendered. Occupied:", occupiedCount);
}

// 4. LOGIC LOAD KỊCH BẢN TỪ MOCK DATABASE
function loadScenario(scenarioArray) {
    // Duyệt qua 100 ô, nếu ID của ô nằm trong mảng kịch bản -> Đánh dấu là có xe
    parkingSlots.forEach(slot => {
        slot.isOccupied = scenarioArray.includes(slot.id);
        slot.lastUpdated = new Date().toISOString();
    });
    
    renderGrid();
}

// 5. GẮN SỰ KIỆN CHO CÁC NÚT KỊCH BẢN
document.getElementById('btn-scene-morning').addEventListener('click', () => {
    loadScenario(mockDatabase.morningRush);
});

document.getElementById('btn-scene-lunch').addEventListener('click', () => {
    loadScenario(mockDatabase.lunchBreak);
});

document.getElementById('btn-scene-night').addEventListener('click', () => {
    loadScenario(mockDatabase.nightTime);
});

document.getElementById('btn-scene-full').addEventListener('click', () => {
    loadScenario(mockDatabase.fullCapacity);
});

document.getElementById('btn-reset').addEventListener('click', () => {
    loadScenario([]); // Truyền mảng rỗng để xóa hết
});

// Chạy lần đầu tiên khi tải trang
renderGrid();