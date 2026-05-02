/**
 * shared/spms-db.js
 * Central shared database and helper API for all Smart Parking modules.
 * MVP integration approach: localStorage + window.SPMS API.
 */
(function () {
    const DB_KEY = 'SPMS_DATABASE_V2';

    function nowISO() {
        return new Date().toISOString();
    }

    function clone(value) {
        return JSON.parse(JSON.stringify(value));
    }

    function normalizePlate(plate) {
        return String(plate || '').trim().toUpperCase().replace(/\s+/g, ' ');
    }

    function createDefaultSlots() {
        return Array.from({ length: 100 }, (_, i) => {
            const id = i + 1;
            const zone = id <= 50 ? 'A' : 'B';
            const number = id <= 50 ? id : id - 50;
            const occupied = id === 1 || id === 52;
            return {
                id,
                name: `${zone}-${String(number).padStart(2, '0')}`,
                zone,
                isOccupied: occupied,
                sessionId: id === 1 ? 'S001' : id === 52 ? 'S002' : null,
                lastUpdated: nowISO()
            };
        });
    }

    function createDefaultDb() {
        return {
            users: [
                { id: 'U001', name: 'Nguyen Van Quan', bkpayBalance: 50000, cardId: 'CARD201001', plate: '59-X1 123.45' },
                { id: 'U002', name: 'Tran Minh Anh', bkpayBalance: 25000, cardId: 'CARD201002', plate: '51A-234.10' }
            ],
            parkingSlots: createDefaultSlots(),
            parkingSessions: [
                {
                    id: 'S001', userId: 'U001', cardId: 'CARD201001', ticketCode: 'TMP-001', plate: '59-X1 123.45',
                    slotName: 'A-01', entryTime: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
                    amountDue: 5000, paymentStatus: 'UNPAID', status: 'ACTIVE', sourceModule: 'SEED'
                },
                {
                    id: 'S002', userId: 'U002', cardId: 'CARD201002', ticketCode: 'TMP-002', plate: '51A-234.10',
                    slotName: 'B-02', entryTime: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
                    amountDue: 5000, paymentStatus: 'PAID', status: 'ACTIVE', sourceModule: 'SEED'
                }
            ],
            feePolicies: [
                { id: 'standard', label: 'Standard Parking Fee', flatRate: 5000, paymentRequiredAtExit: true }
            ],
            rolesPermissions: [
                { role: 'admin', canValidateExit: true, canManagePricing: true, canViewLogs: true },
                { role: 'operator', canValidateExit: true, canManagePricing: false, canViewLogs: true }
            ],
            gateStatus: { exitGate: 'LOCKED' },
            systemLogs: [
                { id: `LOG-${Date.now()}`, timestamp: nowISO(), moduleCode: 'CORE', severity: 'INFO', action: 'DATABASE_READY', message: 'Shared SPMS database initialized.' }
            ]
        };
    }

    function normalizeDb(db) {
        const fresh = createDefaultDb();
        const normalized = {
            ...fresh,
            ...(db || {}),
            users: Array.isArray(db?.users) ? db.users : fresh.users,
            parkingSlots: Array.isArray(db?.parkingSlots) ? db.parkingSlots : fresh.parkingSlots,
            parkingSessions: Array.isArray(db?.parkingSessions) ? db.parkingSessions : fresh.parkingSessions,
            feePolicies: Array.isArray(db?.feePolicies) ? db.feePolicies : fresh.feePolicies,
            rolesPermissions: Array.isArray(db?.rolesPermissions)
                ? db.rolesPermissions
                    .filter((item) => item && ['admin', 'operator'].includes(item.role))
                    .map((item) => ({
                        role: item.role,
                        canValidateExit: Boolean(item.canValidateExit),
                        canManagePricing: Boolean(item.canManagePricing),
                        canViewLogs: Boolean(item.canViewLogs)
                    }))
                : fresh.rolesPermissions,
            gateStatus: db?.gateStatus || fresh.gateStatus,
            systemLogs: Array.isArray(db?.systemLogs) ? db.systemLogs : fresh.systemLogs
        };

        if (!normalized.rolesPermissions.length) {
            normalized.rolesPermissions = fresh.rolesPermissions;
        }

        // Repair slot/session links so Module 1, 2, 4, 5, and 6 stay synced.
        normalized.parkingSlots.forEach((slot) => {
            const session = normalized.parkingSessions.find((item) => item.status === 'ACTIVE' && item.slotName === slot.name);
            if (session) {
                slot.isOccupied = true;
                slot.sessionId = session.id;
            } else if (!slot.isOccupied) {
                slot.sessionId = null;
            }
        });

        return normalized;
    }

    function loadDb() {
        const raw = localStorage.getItem(DB_KEY);
        if (!raw) {
            const fresh = createDefaultDb();
            saveDb(fresh, false);
            return clone(fresh);
        }
        try {
            return clone(normalizeDb(JSON.parse(raw)));
        } catch (error) {
            console.warn('SPMS database was corrupted. Resetting demo data.', error);
            const fresh = createDefaultDb();
            saveDb(fresh, false);
            return clone(fresh);
        }
    }

    function saveDb(db, notify = true) {
        const normalized = normalizeDb(db);
        localStorage.setItem(DB_KEY, JSON.stringify(normalized));
        if (notify) window.dispatchEvent(new CustomEvent('spms-db-updated', { detail: clone(normalized) }));
    }

    function resetDb() {
        const fresh = createDefaultDb();
        saveDb(fresh);
        return loadDb();
    }

    function formatDateTime(value) {
        if (!value) return '-';
        return new Date(value).toLocaleString('vi-VN');
    }

    function formatCurrency(amount) {
        return `${Number(amount || 0).toLocaleString('vi-VN')} VND`;
    }

    function writeSystemLog({ moduleCode, severity = 'INFO', action, message }, db = loadDb(), shouldSave = true) {
        db.systemLogs = Array.isArray(db.systemLogs) ? db.systemLogs : [];
        db.systemLogs.unshift({
            id: `LOG-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
            timestamp: nowISO(),
            moduleCode,
            severity,
            action,
            message
        });
        if (db.systemLogs.length > 150) db.systemLogs = db.systemLogs.slice(0, 150);
        if (shouldSave) saveDb(db);
        return db;
    }

    function getAvailability(db = loadDb()) {
        const total = db.parkingSlots.length;
        const occupied = db.parkingSlots.filter((slot) => slot.isOccupied).length;
        return { total, occupied, available: total - occupied };
    }

    function getZoneAvailability(zone, db = loadDb()) {
        const slots = db.parkingSlots.filter((slot) => slot.zone === zone);
        const occupied = slots.filter((slot) => slot.isOccupied).length;
        return { total: slots.length, occupied, available: slots.length - occupied };
    }

    function getActiveSessionByLookup({ cardId, ticketCode, plate }, db = loadDb()) {
        const cleanCard = String(cardId || '').trim().toUpperCase();
        const cleanTicket = String(ticketCode || '').trim().toUpperCase();
        const cleanPlate = normalizePlate(plate);
        return [...db.parkingSessions]
            .filter((session) => session.status === 'ACTIVE')
            .sort((a, b) => new Date(b.entryTime || 0) - new Date(a.entryTime || 0))
            .find((session) => (
                (cleanCard && String(session.cardId).toUpperCase() === cleanCard) ||
                (cleanTicket && String(session.ticketCode).toUpperCase() === cleanTicket) ||
                (cleanPlate && normalizePlate(session.plate) === cleanPlate)
            )) || null;
    }

    function getSessionMeta(session, db = loadDb()) {
        const user = db.users.find((item) => item.id === session.userId);
        return {
            user,
            displayName: user?.name || 'Guest User',
            plate: session.plate,
            credential: session.ticketCode || session.cardId || session.plate,
            ticket: session
        };
    }

    function paySession(sessionId, db = loadDb()) {
        const session = db.parkingSessions.find((item) => item.id === sessionId && item.status === 'ACTIVE');
        if (!session) return { ok: false, message: 'No active session found.' };
        if (session.paymentStatus === 'PAID') return { ok: false, message: 'This parking session is already paid.' };

        const user = db.users.find((item) => item.id === session.userId);
        if (!user) return { ok: false, message: 'User wallet not found.' };
        if (Number(user.bkpayBalance) < Number(session.amountDue)) return { ok: false, message: 'Insufficient BKPay balance.' };

        user.bkpayBalance -= Number(session.amountDue);
        session.paymentStatus = 'PAID';
        session.paidAt = nowISO();
        writeSystemLog({
            moduleCode: 'M3_PAYMENT', severity: 'INFO', action: 'PAYMENT_SUCCESS',
            message: `${user.name} paid ${formatCurrency(session.amountDue)} for ${session.plate}.`
        }, db, false);
        saveDb(db);
        return { ok: true, message: 'Payment successful. You may proceed to the exit checkpoint.' };
    }

    function completeExit(sessionId, db = loadDb()) {
        const session = db.parkingSessions.find((item) => item.id === sessionId);
        if (!session) return { ok: false, message: 'Session not found.' };
        session.status = 'COMPLETED';
        session.exitTime = nowISO();

        const slot = db.parkingSlots.find((item) => item.name === session.slotName);
        if (slot) {
            slot.isOccupied = false;
            slot.sessionId = null;
            slot.lastUpdated = nowISO();
        }

        writeSystemLog({
            moduleCode: 'M2_EXIT', severity: 'INFO', action: 'SESSION_COMPLETED',
            message: `${session.plate} exited. Slot ${session.slotName} is now available.`
        }, db, false);
        saveDb(db);
        return { ok: true, message: 'Exit completed.' };
    }

    function findOrCreateUserForPlate(plate, db) {
        const cleanPlate = normalizePlate(plate);
        let user = db.users.find((item) => normalizePlate(item.plate) === cleanPlate);
        if (user) return user;

        const id = `UG${Date.now()}${Math.floor(Math.random() * 1000)}`;
        user = {
            id,
            name: `Guest ${cleanPlate || 'Vehicle'}`,
            bkpayBalance: 50000,
            cardId: `CARD${String(Math.floor(Math.random() * 900000 + 100000))}`,
            plate: plate
        };
        db.users.push(user);
        return user;
    }

    function createParkingSession({ plate, priority = 1, cardId, ticketCode }, db = loadDb()) {
        const cleanPlate = normalizePlate(plate);
        if (!cleanPlate) return { ok: false, message: 'Vehicle plate is required.' };

        const alreadyInside = db.parkingSessions.find((item) => item.status === 'ACTIVE' && normalizePlate(item.plate) === cleanPlate);
        if (alreadyInside) {
            writeSystemLog({
                moduleCode: 'M1_SCHEDULER', severity: 'WARN', action: 'ENTRY_REJECTED_DUPLICATE',
                message: `${plate} already has an active session in slot ${alreadyInside.slotName}.`
            }, db);
            return { ok: false, message: `${plate} is already inside at ${alreadyInside.slotName}.`, duplicate: true };
        }

        const slot = db.parkingSlots.find((item) => !item.isOccupied);
        if (!slot) {
            writeSystemLog({
                moduleCode: 'M1_SCHEDULER', severity: 'ERROR', action: 'ENTRY_REJECTED_FULL',
                message: `No available slot for ${plate}. Parking lot is full.`
            }, db);
            return { ok: false, message: 'Parking lot is full.' };
        }

        const user = findOrCreateUserForPlate(plate, db);
        const sessionId = `S${Date.now()}${Math.floor(Math.random() * 1000)}`;
        const generatedTicket = ticketCode || `TMP-${String(Math.floor(Math.random() * 9000 + 1000))}`;

        slot.isOccupied = true;
        slot.sessionId = sessionId;
        slot.lastUpdated = nowISO();

        const session = {
            id: sessionId,
            userId: user.id,
            cardId: cardId || user.cardId,
            ticketCode: generatedTicket,
            plate,
            slotName: slot.name,
            entryTime: nowISO(),
            amountDue: db.feePolicies[0]?.flatRate || 5000,
            paymentStatus: 'UNPAID',
            status: 'ACTIVE',
            priority,
            sourceModule: 'M1_SCHEDULER'
        };
        db.parkingSessions.push(session);

        writeSystemLog({
            moduleCode: 'M1_SCHEDULER', severity: 'INFO', action: 'SESSION_CREATED',
            message: `${plate} assigned to slot ${slot.name}. Ticket ${generatedTicket}. Card ${session.cardId}.`
        }, db, false);
        saveDb(db);

        return { ok: true, message: `${plate} assigned to ${slot.name}.`, sessionId, slotName: slot.name, ticketCode: generatedTicket, cardId: session.cardId };
    }

    function buildLedLines(db = loadDb()) {
        const zoneA = getZoneAvailability('A', db);
        const zoneB = getZoneAvailability('B', db);
        return [
            `ZONE A ➜ AVAILABLE: ${zoneA.available}/${zoneA.total}`,
            zoneB.available > 0 ? `ZONE B ➜ AVAILABLE: ${zoneB.available}/${zoneB.total}` : 'ZONE B ➜ FULL'
        ];
    }

    function getExitValidation(session, db = loadDb()) {
    const policy = Array.isArray(db?.feePolicies) ? db.feePolicies[0] : null;
    const paymentRequiredAtExit = policy
        ? policy.paymentRequiredAtExit !== false
        : true;

    const isPaid =
        session?.paymentStatus === 'PAID' ||
        Number(session?.amountDue || 0) <= 0;

    const canExit =
        Boolean(session) &&
        session.status === 'ACTIVE' &&
        (!paymentRequiredAtExit || isPaid);

    return {
        isPaid,
        paymentRequiredAtExit,
        canExit
    };
}

    function getDemoUserSession(db = loadDb()) {
        const activeSessions = [...db.parkingSessions]
            .filter((item) => item.status === 'ACTIVE');

        const unpaidSession = activeSessions
            .filter((item) => item.paymentStatus !== 'PAID')
            .sort((a, b) => new Date(b.entryTime || 0) - new Date(a.entryTime || 0))[0] || null;

        const session = unpaidSession || activeSessions
            .sort((a, b) => new Date(b.entryTime || 0) - new Date(a.entryTime || 0))[0] || null;

        const user = session ? db.users.find((item) => item.id === session.userId) || null : null;
        return { user, session };
    }

    window.SPMS = {
        DB_KEY,
        loadDb,
        saveDb,
        resetDb,
        formatDateTime,
        formatCurrency,
        writeSystemLog,
        getAvailability,
        getZoneAvailability,
        getActiveSessionByLookup,
        getSessionMeta,
        getExitValidation,
        paySession,
        completeExit,
        createParkingSession,
        buildLedLines,
        getDemoUserSession,
        normalizePlate
    };
})();
