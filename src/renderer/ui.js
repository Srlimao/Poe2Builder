// ============================================================
// ui.js — Top-level UI sync, footer stats, and shared helpers
// Depends on: state.js, database.js, skillsRenderer.js, editorPanel.js
// ============================================================

// 3. UI SYNCING & UPDATES

window.updateUI = function updateUI() {
    // Header file info
    const filenameEl = document.getElementById("current-filename");
    if (filenameEl) {
        filenameEl.textContent = window.currentFilePath
            ? getFilenameFromPath(window.currentFilePath)
            : "Untitled.build";
    }

    const dirtyEl = document.getElementById("dirty-indicator");
    if (dirtyEl) {
        if (window.isDirty) dirtyEl.classList.remove("hidden");
        else dirtyEl.classList.add("hidden");
    }

    // Metadata form syncing
    document.getElementById("meta-name").value   = window.buildState.name;
    document.getElementById("meta-author").value = window.buildState.author || "";

    const ascSelect = document.getElementById("meta-ascendancy");
    const ascCustom = document.getElementById("meta-ascendancy-custom");

    const hasAsc = Array.from(ascSelect.options).some(opt => opt.value === window.buildState.ascendancy);
    if (hasAsc || !window.buildState.ascendancy) {
        ascSelect.value = window.buildState.ascendancy;
        ascCustom.classList.add("hidden");
    } else {
        ascSelect.value  = "Custom";
        ascCustom.value  = window.buildState.ascendancy;
        ascCustom.classList.remove("hidden");
    }

    document.getElementById("meta-desc").value = window.buildState.description || "";

    // Sync Equipment Grid Cards
    window.standardSlots.forEach(s => {
        const variants = window.buildState.inventory_slots.filter(x => x.inventory_id === s.id);
        const slotEl   = document.getElementById(`slot-${s.id}`);
        if (!slotEl) return;

        slotEl.className = "eq-slot";
        if (window.selectedElement && window.selectedElement.type === 'slot' && window.selectedElement.id === s.id) {
            slotEl.classList.add("active");
        }

        const valueEl   = slotEl.querySelector(".eq-value");
        const hasConfig = variants.some(v => v.additional_text || v.unique_name || v.level_interval);

        if (hasConfig) {
            slotEl.classList.add("configured");
            if (variants.length > 1) {
                valueEl.textContent = `Configured (${variants.length} Variants)`;
            } else {
                const slotState = variants[0];
                let displayText = slotState.unique_name || getFirstLineOfText(slotState.additional_text) || "Configured";
                displayText = displayText.replace(/&lt;[^&]*&gt;|<[^>]*>/g, "");
                valueEl.textContent = displayText;
            }
        } else {
            valueEl.textContent = "Empty";
        }
    });

    renderSkillsGrid();
    syncEditorForm();
    updateFooterStats();
};

function updateFooterStats() {
    let skillCount   = window.buildState.skills.length;
    let supportCount = 0;
    window.buildState.skills.forEach(s => {
        supportCount += s.support_skills ? s.support_skills.length : 0;
    });

    const activeSlotsCount = window.standardSlots.filter(s => {
        return window.buildState.inventory_slots.some(v =>
            v.inventory_id === s.id && (v.additional_text || v.unique_name || v.level_interval)
        );
    }).length;

    document.getElementById("stat-skills-count").textContent  = skillCount;
    document.getElementById("stat-supports-count").textContent = supportCount;
    document.getElementById("stat-slots-count").textContent   = `${activeSlotsCount}/${window.standardSlots.length}`;
}

// Mark current state as dirty
function markAsDirty() {
    if (!window.isDirty) {
        window.isDirty = true;
        const dirtyEl = document.getElementById("dirty-indicator");
        if (dirtyEl) dirtyEl.classList.remove("hidden");
    }
}

// Check PoE2 local folder connection status
async function checkPoePathStatus() {
    const isElectron = typeof window.electronAPI !== 'undefined';
    const statusEl   = document.getElementById("poe-path-status");
    if (!statusEl) return;

    if (isElectron) {
        try {
            const pathInfo = await window.electronAPI.getDefaultBuildPath();
            if (pathInfo.exists) {
                statusEl.innerHTML = `PoE2 BuildPlanner directory: <span class="path-val text-green">Connected (${pathInfo.path})</span>`;
            } else {
                statusEl.innerHTML = `PoE2 BuildPlanner directory: <span class="path-val text-muted">Ready (${pathInfo.path} - will create on save)</span>`;
            }
        } catch (e) {
            statusEl.innerHTML = `PoE2 BuildPlanner directory: <span class="path-val text-red">Not available</span>`;
        }
    } else {
        statusEl.innerHTML = `PoE2 BuildPlanner directory: <span class="path-val text-muted">Browser Mode (Local Download Fallback)</span>`;
    }
}

// --- Utility helpers ---

function getFilenameFromPath(filePath) {
    if (!filePath) return "";
    return filePath.split(/[/\\]/).pop();
}

function getFirstLineOfText(text) {
    if (!text) return "";
    return text.trim().split('\n')[0];
}

function getSlotLabel(id) {
    const found = window.standardSlots.find(x => x.id === id);
    return found ? found.label : id;
}
