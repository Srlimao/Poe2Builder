// ============================================================
// editorPanel.js — Properties editor panel & live preview
// Depends on: state.js, database.js, autocomplete.js
// ============================================================

// 5. SELECTION & ELEMENT EDITING

window.selectElement = function selectElement(selection) {
    window.selectedElement = selection;
    hideAutocomplete();
    updateUI();
};

function syncEditorForm() {
    const placeholder     = document.getElementById("editor-placeholder");
    const formContainer   = document.getElementById("editor-form-container");
    const deleteBtn       = document.getElementById("btn-delete-element");

    if (!window.selectedElement) {
        placeholder.classList.remove("hidden");
        formContainer.classList.add("hidden");
        return;
    }

    placeholder.classList.add("hidden");
    formContainer.classList.remove("hidden");

    const idInput     = document.getElementById("edit-id");
    const uniqueInput = document.getElementById("edit-unique-name");
    const lvlMinInput = document.getElementById("edit-level-min");
    const lvlMaxInput = document.getElementById("edit-level-max");
    const textInput   = document.getElementById("edit-text");

    if (window.selectedElement.type === 'slot') {
        if (window.selectedElement.variantIndex === undefined) window.selectedElement.variantIndex = 0;

        const variants = window.buildState.inventory_slots.filter(x => x.inventory_id === window.selectedElement.id);
        if (window.selectedElement.variantIndex >= variants.length) {
            window.selectedElement.variantIndex = Math.max(0, variants.length - 1);
        }

        const slot = variants[window.selectedElement.variantIndex];

        document.getElementById("editor-item-type").textContent  = "SLOT";
        document.getElementById("editor-item-title").textContent = getSlotLabel(window.selectedElement.id);
        document.getElementById("edit-id-label").textContent     = "Slot ID";

        if (variants.length > 1) {
            deleteBtn.classList.remove("hidden");
            deleteBtn.textContent = "Delete Variant";
        } else {
            deleteBtn.classList.add("hidden");
        }

        const variantSelector = document.getElementById("editor-variant-selector");
        if (variantSelector) {
            variantSelector.classList.remove("hidden");
            const dropdown = document.getElementById("variant-dropdown");
            dropdown.innerHTML = "";
            variants.forEach((v, idx) => {
                const opt = document.createElement("option");
                opt.value = idx;
                let label = `Variant ${idx + 1}`;
                if (v.level_interval) {
                    const min = Array.isArray(v.level_interval) ? v.level_interval[0] : v.level_interval;
                    const max = Array.isArray(v.level_interval) ? v.level_interval[1] : "";
                    label += max !== "" ? ` (Lvl ${min}-${max})` : ` (Lvl ${min}+)`;
                } else {
                    label += ` (All Levels)`;
                }
                opt.textContent = label;
                if (idx === window.selectedElement.variantIndex) opt.selected = true;
                dropdown.appendChild(opt);
            });
        }

        idInput.value    = slot.inventory_id;
        idInput.disabled = true;

        document.getElementById("editor-group-unique").classList.remove("hidden");
        uniqueInput.value = slot.unique_name || "";

        lvlMinInput.value = slot.level_interval ? (Array.isArray(slot.level_interval) ? slot.level_interval[0] : slot.level_interval) : "";
        lvlMaxInput.value = slot.level_interval && Array.isArray(slot.level_interval) ? slot.level_interval[1] : "";

        textInput.value = slot.additional_text || "";

    } else if (window.selectedElement.type === 'skill') {
        const variantSelector = document.getElementById("editor-variant-selector");
        if (variantSelector) variantSelector.classList.add("hidden");

        const skill = window.buildState.skills[window.selectedElement.skillIndex];

        document.getElementById("editor-item-type").textContent  = "SKILL GEM";
        document.getElementById("editor-item-title").textContent = getGemDisplayName(skill.id) || "New Active Gem";
        document.getElementById("edit-id-label").textContent     = "Skill Gem ID";
        deleteBtn.classList.remove("hidden");
        deleteBtn.textContent = "Delete Active Gem";

        idInput.value    = skill.id;
        idInput.disabled = false;

        document.getElementById("editor-group-unique").classList.add("hidden");

        lvlMinInput.value = skill.level_interval ? (Array.isArray(skill.level_interval) ? skill.level_interval[0] : skill.level_interval) : "";
        lvlMaxInput.value = skill.level_interval && Array.isArray(skill.level_interval) ? skill.level_interval[1] : "";

        textInput.value = skill.additional_text || "";

    } else if (window.selectedElement.type === 'support') {
        const variantSelector = document.getElementById("editor-variant-selector");
        if (variantSelector) variantSelector.classList.add("hidden");

        const skill   = window.buildState.skills[window.selectedElement.skillIndex];
        const support = skill.support_skills[window.selectedElement.supportIndex];

        document.getElementById("editor-item-type").textContent  = "SUPPORT GEM";
        document.getElementById("editor-item-title").textContent = getGemDisplayName(support.id) || "New Support Gem";
        document.getElementById("edit-id-label").textContent     = "Support Gem ID";
        deleteBtn.classList.remove("hidden");
        deleteBtn.textContent = "Delete Support Gem";

        idInput.value    = support.id;
        idInput.disabled = false;

        document.getElementById("editor-group-unique").classList.add("hidden");

        lvlMinInput.value = support.level_interval ? (Array.isArray(support.level_interval) ? support.level_interval[0] : support.level_interval) : "";
        lvlMaxInput.value = support.level_interval && Array.isArray(support.level_interval) ? support.level_interval[1] : "";

        textInput.value = support.additional_text || "";

    } else if (window.selectedElement.type === 'passive') {
        const variantSelector = document.getElementById("editor-variant-selector");
        if (variantSelector) variantSelector.classList.add("hidden");

        const passive = window.buildState.passives.find(p => p.id === window.selectedElement.id);

        document.getElementById("editor-item-type").textContent  = "PASSIVE SKILL";
        document.getElementById("editor-item-title").textContent = (window.getPassiveNodeName && window.getPassiveNodeName(passive.id)) || "Passive Node";
        document.getElementById("edit-id-label").textContent     = "Passive Node ID";
        deleteBtn.classList.remove("hidden");
        deleteBtn.textContent = "Unallocate Passive";

        idInput.value    = passive.id;
        idInput.disabled = false;

        document.getElementById("editor-group-unique").classList.add("hidden");

        lvlMinInput.value = "";
        lvlMaxInput.value = "";

        textInput.value = passive.additional_text || "";
    }

    renderLivePreview();
}

// 6. POPUP PREVIEW RENDERER

function renderLivePreview() {
    const titleEl   = document.getElementById("tooltip-title");
    const lvlEl     = document.getElementById("tooltip-level");
    const contentEl = document.getElementById("tooltip-content");

    if (!window.selectedElement) {
        titleEl.textContent   = "Build Planner Instructions";
        lvlEl.textContent     = "";
        contentEl.innerHTML   = "Select an item to view live tooltips as they appear in the Path of Exile 2 game planner.";
        return;
    }

    let titleText      = "";
    let lvlText        = "";
    let additionalText = "";

    if (window.selectedElement.type === 'slot') {
        const variants = window.buildState.inventory_slots.filter(x => x.inventory_id === window.selectedElement.id);
        const slot     = variants[window.selectedElement.variantIndex || 0] || variants[0];
        titleText      = slot.unique_name ? `${getSlotLabel(slot.inventory_id)}: ${slot.unique_name}` : `${getSlotLabel(slot.inventory_id)} recommendation`;
        lvlText        = getLevelIntervalString(slot.level_interval);
        additionalText = slot.additional_text || "";

    } else if (window.selectedElement.type === 'skill') {
        const skill    = window.buildState.skills[window.selectedElement.skillIndex];
        titleText      = getGemDisplayName(skill.id) || "Active Gem Socket";
        lvlText        = getLevelIntervalString(skill.level_interval);
        additionalText = skill.additional_text || "";

    } else if (window.selectedElement.type === 'support') {
        const skill    = window.buildState.skills[window.selectedElement.skillIndex];
        const support  = skill.support_skills[window.selectedElement.supportIndex];
        titleText      = `${getGemDisplayName(support.id) || "Support Gem"} (Socketed)`;
        lvlText        = getLevelIntervalString(support.level_interval);
        additionalText = support.additional_text || "";

    } else if (window.selectedElement.type === 'passive') {
        const passive  = window.buildState.passives.find(p => p.id === window.selectedElement.id);
        titleText      = (window.getPassiveNodeName && window.getPassiveNodeName(passive.id)) || "Passive Node";
        lvlText        = "";
        additionalText = passive.additional_text || "";
    }

    titleEl.textContent = titleText;
    lvlEl.textContent   = lvlText;

    if (additionalText) {
        contentEl.innerHTML = compilePoEMarkup(additionalText);
    } else {
        contentEl.innerHTML = `<span style="color: #7a7262; font-style: italic;">No specific instructions provided for this item yet. Use text box above.</span>`;
    }
}

function getLevelIntervalString(lvlInterval) {
    if (!lvlInterval) return "";
    if (Array.isArray(lvlInterval)) {
        if (lvlInterval[0] === 0 && lvlInterval[1] === 100) return "Level: 1 - 100";
        if (lvlInterval[0] > 0 && lvlInterval[1] === 100) return `Level Required: ${lvlInterval[0]}+`;
        return `Level Required: ${lvlInterval[0]} - ${lvlInterval[1]}`;
    }
    return `Level Required: ${lvlInterval}`;
}

// Convert PoE color/formatting tags recursively into HTML spans
function compilePoEMarkup(text) {
    if (!text) return "";

    let output = text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");

    const regex = /&lt;([\w\s,()]+)&gt;\{([^{}]+)\}/g;

    const replaceTag = (tag, content) => {
        tag = tag.trim().toLowerCase();

        if (tag === 'red')    return `<span style="color: #ff5555;">${content}</span>`;
        if (tag === 'orange') return `<span style="color: #ffaa00;">${content}</span>`;
        if (tag === 'yellow') return `<span style="color: #ffff55;">${content}</span>`;
        if (tag === 'green')  return `<span style="color: #3bfa3b;">${content}</span>`;
        if (tag === 'blue')   return `<span style="color: #55aaff;">${content}</span>`;
        if (tag === 'indigo') return `<span style="color: #4b0082;">${content}</span>`;
        if (tag === 'violet') return `<span style="color: #ee82ee;">${content}</span>`;
        if (tag === 'black')  return `<span style="color: #000000;">${content}</span>`;
        if (tag === 'white')  return `<span style="color: #ffffff;">${content}</span>`;
        if (tag === 'grey')   return `<span style="color: #8c8270;">${content}</span>`;
        if (tag === 'bronze') return `<span style="color: #cd7f32;">${content}</span>`;
        if (tag === 'silver') return `<span style="color: #b3c2d4;">${content}</span>`;
        if (tag === 'gold')   return `<span style="color: #dfc190;">${content}</span>`;

        if (tag.startsWith('rgb(')) return `<span style="color: ${tag};">${content}</span>`;

        if (tag === 'r') return `<span style="font-weight: normal; font-style: normal; text-decoration: none;">${content}</span>`;
        if (tag === 'b') return `<span style="font-weight: bold; color: #fff;">${content}</span>`;
        if (tag === 'i') return `<span style="font-style: italic;">${content}</span>`;
        if (tag === 'u') return `<span style="text-decoration: underline;">${content}</span>`;
        if (tag === 's') return `<span style="font-size: 0.85em; opacity: 0.8;">${content}</span>`;
        if (tag === 'm') return `<span style="font-size: 1.0em;">${content}</span>`;
        if (tag === 'l') return `<span style="font-size: 1.25em; font-family: var(--font-header);">${content}</span>`;

        return `&lt;${tag}&gt;{${content}}`;
    };

    // Run replacement multiple times to support nested tags
    let lastOutput;
    let iterations = 0;
    do {
        lastOutput = output;
        output = output.replace(regex, (match, tag, content) => replaceTag(tag, content));
        iterations++;
    } while (output !== lastOutput && iterations < 10);

    return output.replace(/\n/g, "<br>");
}

// Helper to insert a formatting tag around selected text in the text editor
function insertMarkupTag(tag) {
    const textInput = document.getElementById("edit-text");
    const start = textInput.selectionStart;
    const end   = textInput.selectionEnd;
    const text  = textInput.value;

    const selectedText  = text.substring(start, end);
    const replacement   = `<${tag}>{${selectedText}}`;

    textInput.value = text.substring(0, start) + replacement + text.substring(end);

    textInput.focus();
    const newCursorPos = start + tag.length + 2 + selectedText.length;
    textInput.setSelectionRange(newCursorPos, newCursorPos);

    // Trigger input event to update preview
    const event = new Event('input', { bubbles: true });
    textInput.dispatchEvent(event);
}
