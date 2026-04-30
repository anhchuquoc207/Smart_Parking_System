// shared/spms-ui.js
// UI helpers shared by all modules.
(function () {
    function goBack() {
        // Go to the real previous page. If the module was opened directly,
        // fall back to the launcher so the button is still usable.
        if (window.history.length > 1) {
            window.history.back();
        } else {
            const path = window.location.pathname;
            const fallback = path.includes('/Module_') ? '../index.html' : './index.html';
            window.location.href = fallback;
        }
    }
    window.SPMS_UI = { goBack };
})();
