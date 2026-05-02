const REFRESH_RATE = 3000;

const zoneACard = document.getElementById('zone-a-card');
const zoneAStatus = document.getElementById('zone-a-status');
const zoneACount = document.getElementById('zone-a-count');

const zoneBCard = document.getElementById('zone-b-card');
const zoneBStatus = document.getElementById('zone-b-status');
const zoneBCount = document.getElementById('zone-b-count');

function parseZoneData(lineString, zoneMaxCapacity = 50) {
    let statusText = "AVAILABLE"; 
    let displayCount = "--/--";
    let colorTheme = "available";

    if (!lineString) return { statusText, displayCount, colorTheme };

    const match = lineString.match(/(\d+)\/(\d+)/);
    
    if (match) {
        const available = parseInt(match[1], 10);
        const total = parseInt(match[2], 10);
        
        const occupied = total - available;
        displayCount = `${occupied}/${total}`;

        const percentage = total === 0 ? 0 : (occupied / total) * 100;
        
        if (percentage >= 100) {
            statusText = "FULL";
            colorTheme = "full";
        } else if (percentage >= 80) {
            statusText = "NEAR FULL";
            colorTheme = "near-full";
        } else {
            statusText = "AVAILABLE";
            colorTheme = "available";
        }
    } else {
        if (lineString.includes("FULL") || lineString.includes("CAPACITY")) {
            statusText = "FULL";
            colorTheme = "full";
            displayCount = `${zoneMaxCapacity}/${zoneMaxCapacity}`;
        } else if (lineString.includes("NEAR FULL")) {
            statusText = "NEAR FULL";
            colorTheme = "near-full";
        }
    }

    return { statusText, displayCount, colorTheme };
}

function updateSignage() {
    try {
        const db = window.SPMS.loadDb();
        const availability = window.SPMS.getAvailability(db);
        
        const fallbackZoneMax = availability.total > 0 ? (availability.total / 2) : 50;
        
        const [line1, line2] = window.SPMS.buildLedLines(db);

        const zoneA = parseZoneData(line1, fallbackZoneMax);
        const zoneB = parseZoneData(line2, fallbackZoneMax);

        zoneACard.className = `zone-card border-${zoneA.colorTheme}`;
        zoneAStatus.className = `zone-status text-${zoneA.colorTheme}`;
        zoneAStatus.textContent = zoneA.statusText;
        zoneACount.className = `zone-count text-${zoneA.colorTheme}`;
        zoneACount.textContent = zoneA.displayCount;

        zoneBCard.className = `zone-card border-${zoneB.colorTheme}`;
        zoneBStatus.className = `zone-status text-${zoneB.colorTheme}`;
        zoneBStatus.textContent = zoneB.statusText;
        zoneBCount.className = `zone-count text-${zoneB.colorTheme}`;
        zoneBCount.textContent = zoneB.displayCount;

    } catch (error) {
        console.error('Error reading signage data:', error);
        
        zoneACard.className = 'zone-card border-full';
        zoneAStatus.className = 'zone-status text-full';
        zoneAStatus.textContent = 'ERROR';
        zoneACount.className = 'zone-count text-full';
        zoneACount.textContent = '--/--';
        
        zoneBCard.className = 'zone-card border-full';
        zoneBStatus.className = 'zone-status text-full';
        zoneBStatus.textContent = 'ERROR';
        zoneBCount.className = 'zone-count text-full';
        zoneBCount.textContent = '--/--';
    }
}

updateSignage();
setInterval(updateSignage, REFRESH_RATE);
window.addEventListener('storage', updateSignage);
window.addEventListener('spms-db-updated', updateSignage);
