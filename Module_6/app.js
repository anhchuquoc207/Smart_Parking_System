const statSessions = document.getElementById('stat-sessions');
const statPolicies = document.getElementById('stat-policies');
const statAlerts = document.getElementById('stat-alerts');
const statAvailable = document.getElementById('stat-available');
const roleSwitcher = document.getElementById('role-switcher');
const systemStatus = document.getElementById('system-status');
const roleBody = document.getElementById('role-body');
const policyBody = document.getElementById('policy-body');
const logBody = document.getElementById('log-body');
const zoneACard = document.getElementById('zone-a-card');
const zoneAStatus = document.getElementById('zone-a-status');
const zoneACount = document.getElementById('zone-a-count');

const zoneBCard = document.getElementById('zone-b-card');
const zoneBStatus = document.getElementById('zone-b-status');
const zoneBCount = document.getElementById('zone-b-count');
const btnSaveRoles = document.getElementById('btn-save-roles');
const btnSavePolicy = document.getElementById('btn-save-policy');
const btnRefreshLed = document.getElementById('btn-refresh-led');
const btnRefreshLogs = document.getElementById('btn-refresh-logs');
const btnResetDemo = document.getElementById('btn-reset-demo');

function currentRole() {
    return roleSwitcher.value;
}

function canManagePricing(db) {
    return db.rolesPermissions.find((item) => item.role === currentRole())?.canManagePricing;
}

function countAlerts(db) {
    return db.systemLogs.filter((log) => log.severity === 'WARN' || log.severity === 'ERROR').length;
}

function renderStats(db) {
    const availability = window.SPMS.getAvailability(db);
    statSessions.textContent = db.parkingSessions.filter((item) => item.status === 'ACTIVE').length;
    statPolicies.textContent = db.feePolicies.length;
    statAlerts.textContent = countAlerts(db);
    statAvailable.textContent = availability.available;

    if (currentRole() === 'admin') {
        systemStatus.className = 'pill pill-green';
        systemStatus.textContent = 'SYSTEM STABLE';
    } else {
        systemStatus.className = 'pill pill-orange';
        systemStatus.textContent = `${currentRole().toUpperCase()} VIEW`;
    }
}

function currentRolePermissions(db) {
    return db.rolesPermissions.find((item) => item.role === currentRole()) || { canValidateExit: false, canManagePricing: false, canViewLogs: false };
}

function renderRoles(db) {
    const readOnly = currentRole() !== 'admin';
    roleBody.innerHTML = db.rolesPermissions.map((role) => {
        const rowReadOnly = readOnly || role.role === 'admin';
        return `
        <tr class="${role.role === currentRole() ? 'current-role-row' : ''} ${role.role === 'admin' ? 'admin-role-row' : ''}">
            <td>${role.role}</td>
            <td><input class="checkbox" type="checkbox" data-role="${role.role}" data-key="canValidateExit" ${role.canValidateExit ? 'checked' : ''} ${rowReadOnly ? 'disabled' : ''}></td>
            <td><input class="checkbox" type="checkbox" data-role="${role.role}" data-key="canManagePricing" ${role.canManagePricing ? 'checked' : ''} ${rowReadOnly ? 'disabled' : ''}></td>
            <td><input class="checkbox" type="checkbox" data-role="${role.role}" data-key="canViewLogs" ${role.canViewLogs ? 'checked' : ''} ${rowReadOnly ? 'disabled' : ''}></td>
        </tr>
    `;
    }).join('');

    btnSaveRoles.disabled = readOnly;
    btnSaveRoles.style.opacity = readOnly ? '0.5' : '1';
}

function renderRoleInfo(db) {
    const role = db.rolesPermissions.find((item) => item.role === currentRole());
    const roleMessage = document.getElementById('role-message');
    if (!role) {
        roleMessage.textContent = 'Unknown role selected. Please choose a valid view.';
        return;
    }

    roleMessage.textContent = `Viewing as ${role.role.toUpperCase()}: Validate Exit=${role.canValidateExit ? 'Yes' : 'No'}, Manage Pricing=${role.canManagePricing ? 'Yes' : 'No'}, View Logs=${role.canViewLogs ? 'Yes' : 'No'}. ${currentRole() !== 'admin' ? 'You can only update actions for the current role if that role has permission.' : 'Use the table below to update permissions for each role.'}`;
}

function renderPolicies(db) {
    const rolePerms = currentRolePermissions(db);
    const readOnly = !rolePerms.canManagePricing;
    policyBody.innerHTML = db.feePolicies.map((policy) => `
        <tr>
            <td>${policy.label}</td>
            <td>
                <input class="input-inline" type="number" min="0" data-policy="${policy.id}" data-field="flatRate" value="${policy.flatRate}" ${readOnly ? 'disabled' : ''}>
            </td>
            <td>
                <input class="checkbox" type="checkbox" data-policy="${policy.id}" data-field="paymentRequiredAtExit" ${policy.paymentRequiredAtExit ? 'checked' : ''} ${readOnly ? 'disabled' : ''}>
            </td>
        </tr>
    `).join('');

    btnSavePolicy.disabled = readOnly;
    btnSavePolicy.style.opacity = readOnly ? '0.5' : '1';
}

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

function renderLed(db) {
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
}

function renderLogs(db) {
    const rolePerms = currentRolePermissions(db);
    if (!rolePerms.canViewLogs) {
        logBody.innerHTML = `<tr><td colspan="5" class="muted">You do not have permission to view system logs under this role.</td></tr>`;
        return;
    }

    logBody.innerHTML = db.systemLogs.slice(0, 12).map((log) => {
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
}

function renderAll() {
    const db = window.SPMS.loadDb();
    renderStats(db);
    renderRoleInfo(db);
    renderRoles(db);
    renderPolicies(db);
    renderLed(db);
    renderLogs(db);
}

function saveRoles() {
    if (currentRole() !== 'admin') return;
    const db = window.SPMS.loadDb();
    document.querySelectorAll('#role-body input[type="checkbox"]').forEach((input) => {
        const role = db.rolesPermissions.find((item) => item.role === input.dataset.role);
        if (role) role[input.dataset.key] = input.checked;
    });
    window.SPMS.writeSystemLog({
        moduleCode: 'M6_ADMIN',
        severity: 'INFO',
        action: 'ROLES_UPDATED',
        message: 'Roles and permissions were updated by admin.'
    }, db);
    window.SPMS.saveDb(db);
    renderAll();
}

function savePolicies() {
    const db = window.SPMS.loadDb();
    const rolePerms = currentRolePermissions(db);
    if (!rolePerms.canManagePricing) return;

    const changes = [];
    document.querySelectorAll('[data-policy]').forEach((input) => {
        const policy = db.feePolicies.find((item) => item.id === input.dataset.policy);
        if (!policy) return;
        if (input.dataset.field === 'flatRate') {
            const nextRate = Number(input.value || 0);
            if (policy.flatRate !== nextRate) changes.push(`${policy.label}: Flat Rate ${policy.flatRate} -> ${nextRate}`);
            policy.flatRate = nextRate;
        }
        if (input.dataset.field === 'paymentRequiredAtExit') {
            const nextRequired = input.checked;
            if (policy.paymentRequiredAtExit !== nextRequired) changes.push(`${policy.label}: Exit Payment Required ${policy.paymentRequiredAtExit ? 'ON' : 'OFF'} -> ${nextRequired ? 'ON' : 'OFF'}`);
            policy.paymentRequiredAtExit = nextRequired;
        }
    });

    window.SPMS.writeSystemLog({
        moduleCode: 'M6_ADMIN',
        severity: 'INFO',
        action: 'FEE_POLICIES_UPDATED',
        message: changes.length ? changes.join(' | ') : `Fee policies were saved by ${currentRole()} with no value changes.`
    }, db);
    window.SPMS.saveDb(db);
    renderAll();
}

function refreshLed() {
    const db = window.SPMS.loadDb();
    const [line1, line2] = window.SPMS.buildLedLines(db);
    window.SPMS.writeSystemLog({
        moduleCode: 'M4_SIGNAGE',
        severity: 'INFO',
        action: 'LED_REFRESH',
        message: `${line1} | ${line2}`
    }, db);
    renderAll();
}

function resetDemo() {
    const db = window.SPMS.resetDb();
    window.SPMS.writeSystemLog({
        moduleCode: 'M6_ADMIN',
        severity: 'INFO',
        action: 'DEMO_RESET',
        message: 'Demo data was reset to the default seed.'
    }, db);
    renderAll();
}

roleSwitcher.addEventListener('change', renderAll);
btnSaveRoles.addEventListener('click', saveRoles);
btnSavePolicy.addEventListener('click', savePolicies);
btnRefreshLed.addEventListener('click', refreshLed);
btnRefreshLogs.addEventListener('click', renderAll);
btnResetDemo.addEventListener('click', resetDemo);
window.addEventListener('storage', renderAll);
window.addEventListener('spms-db-updated', renderAll);

renderAll();
