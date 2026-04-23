const statSessions = document.getElementById('stat-sessions');
const statPolicies = document.getElementById('stat-policies');
const statAlerts = document.getElementById('stat-alerts');
const statAvailable = document.getElementById('stat-available');
const roleSwitcher = document.getElementById('role-switcher');
const systemStatus = document.getElementById('system-status');
const roleBody = document.getElementById('role-body');
const policyBody = document.getElementById('policy-body');
const logBody = document.getElementById('log-body');
const ledLine1 = document.getElementById('led-line-1');
const ledLine2 = document.getElementById('led-line-2');
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
    statSessions.textContent = db.parkingSessions.length;
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

function renderRoles(db) {
    const readOnly = currentRole() !== 'admin';
    roleBody.innerHTML = db.rolesPermissions.map((role) => `
        <tr>
            <td>${role.role}</td>
            <td><input class="checkbox" type="checkbox" data-role="${role.role}" data-key="canValidateExit" ${role.canValidateExit ? 'checked' : ''} ${readOnly ? 'disabled' : ''}></td>
            <td><input class="checkbox" type="checkbox" data-role="${role.role}" data-key="canManagePricing" ${role.canManagePricing ? 'checked' : ''} ${readOnly ? 'disabled' : ''}></td>
            <td><input class="checkbox" type="checkbox" data-role="${role.role}" data-key="canViewLogs" ${role.canViewLogs ? 'checked' : ''} ${readOnly ? 'disabled' : ''}></td>
        </tr>
    `).join('');

    btnSaveRoles.disabled = readOnly;
    btnSaveRoles.style.opacity = readOnly ? '0.5' : '1';
}

function renderPolicies(db) {
    const readOnly = currentRole() !== 'admin';
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

function renderLed(db) {
    const [line1, line2] = window.SPMS.buildLedLines(db);
    ledLine1.textContent = line1;
    ledLine2.textContent = line2;
}

function renderLogs(db) {
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
    if (currentRole() !== 'admin') return;
    const db = window.SPMS.loadDb();
    document.querySelectorAll('[data-policy]').forEach((input) => {
        const policy = db.feePolicies.find((item) => item.id === input.dataset.policy);
        if (!policy) return;
        if (input.dataset.field === 'flatRate') {
            policy.flatRate = Number(input.value || 0);
        }
        if (input.dataset.field === 'paymentRequiredAtExit') {
            policy.paymentRequiredAtExit = input.checked;
        }
    });
    window.SPMS.writeSystemLog({
        moduleCode: 'M6_ADMIN',
        severity: 'INFO',
        action: 'FEE_POLICIES_UPDATED',
        message: 'Fee policies were updated by admin.'
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

renderAll();
