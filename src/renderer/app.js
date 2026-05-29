// ============================================================
// app.js — Entry point
// Calls initApp on DOMContentLoaded. All logic lives in the
// component files loaded before this one in index.html.
// ============================================================

document.addEventListener("DOMContentLoaded", () => {
    initApp();
});

async function initApp() {
    setupEventListeners();
    await loadGemsDatabases();
    await loadAscendancies();
    resetToNewBuild();
    checkPoePathStatus();
    updateUI();

    // Hide download button in Desktop app
    const isElectron = typeof window.electronAPI !== 'undefined';
    if (isElectron) {
        const downloadBtn = document.getElementById("btn-desktop-version");
        if (downloadBtn) downloadBtn.classList.add("hidden");
    }
}
