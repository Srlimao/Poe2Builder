// ============================================================
// buildSerializer.js — Build state load, reset, and export
// Depends on: state.js, database.js (getGemDisplayName via ui.js)
// ============================================================

// 2. BUILD STATE HELPERS

function resetToNewBuild() {
    window.buildState = {
        name: "New Titan Build",
        author: "",
        description: "",
        ascendancy: "",
        skills: [],
        inventory_slots: [],
        passives: []
    };
    window.currentFilePath = null;
    window.isDirty = false;
    window.selectedElement = null;

    // Populate standard inventory slots
    window.standardSlots.forEach(s => {
        window.buildState.inventory_slots.push({
            inventory_id: s.id,
            additional_text: ""
        });
    });

    updateUI();
}

function loadBuildJson(json) {
    if (!json || typeof json !== 'object') return;

    window.buildState = {
        name: json.name || "Untitled Build",
        author: json.author || "",
        description: json.description || "",
        ascendancy: json.ascendancy || "",
        skills: [],
        inventory_slots: [],
        passives: []
    };

    // Passives parsing (normalize to objects)
    if (Array.isArray(json.passives)) {
        json.passives.forEach(p => {
            if (typeof p === 'string') {
                window.buildState.passives.push({ id: p });
            } else if (typeof p === 'object' && p.id) {
                window.buildState.passives.push({
                    id: p.id,
                    additional_text: p.additional_text || ""
                });
            }
        });
    }

    // Skills parsing (normalize from string or object to internal editor format)
    if (Array.isArray(json.skills)) {
        json.skills.forEach(s => {
            let skillObj = {
                id: "",
                level_interval: null,
                additional_text: "",
                support_skills: []
            };

            if (typeof s === 'string') {
                skillObj.id = s;
            } else if (typeof s === 'object') {
                skillObj.id = s.id || "";
                skillObj.level_interval = s.level_interval || null;
                skillObj.additional_text = s.additional_text || "";

                if (Array.isArray(s.support_skills)) {
                    s.support_skills.forEach(sup => {
                        let supportObj = {
                            id: "",
                            level_interval: null,
                            additional_text: ""
                        };
                        if (typeof sup === 'string') {
                            supportObj.id = sup;
                        } else if (typeof sup === 'object') {
                            supportObj.id = sup.id || "";
                            supportObj.level_interval = sup.level_interval || null;
                            supportObj.additional_text = sup.additional_text || "";
                        }
                        skillObj.support_skills.push(supportObj);
                    });
                }
            }
            window.buildState.skills.push(skillObj);
        });
    }

    // Inventory Slots parsing (ensure all standard slots exist)
    const loadedSlots = Array.isArray(json.inventory_slots) ? json.inventory_slots : [];

    window.standardSlots.forEach(s => {
        const matchingSlots = loadedSlots.filter(x => x.inventory_id === s.id);
        if (matchingSlots.length > 0) {
            matchingSlots.forEach(found => {
                window.buildState.inventory_slots.push({
                    inventory_id: s.id,
                    level_interval: found.level_interval || null,
                    unique_name: found.unique_name || "",
                    additional_text: found.additional_text || ""
                });
            });
        } else {
            window.buildState.inventory_slots.push({
                inventory_id: s.id,
                additional_text: ""
            });
        }
    });

    // Support any custom slots loaded from the file
    loadedSlots.forEach(s => {
        if (!window.standardSlots.some(x => x.id === s.inventory_id)) {
            window.buildState.inventory_slots.push({
                inventory_id: s.inventory_id,
                level_interval: s.level_interval || null,
                unique_name: s.unique_name || "",
                additional_text: s.additional_text || ""
            });
        }
    });

    window.isDirty = false;
    window.selectedElement = null;
    updateUI();
}

function exportBuildJson() {
    const json = {
        name: window.buildState.name,
        author: window.buildState.author || undefined,
        description: window.buildState.description || undefined,
        ascendancy: window.buildState.ascendancy || undefined
    };

    // Only output passives if they exist
    if (window.buildState.passives && window.buildState.passives.length > 0) {
        json.passives = window.buildState.passives.map(p => {
            if (!p.additional_text) return p.id;
            return { id: p.id, additional_text: p.additional_text };
        });
    }

    // Serialize skills
    json.skills = window.buildState.skills.map(s => {
        const out = { id: s.id };
        if (s.level_interval) out.level_interval = s.level_interval;
        if (s.additional_text) out.additional_text = s.additional_text;

        if (s.support_skills && s.support_skills.length > 0) {
            out.support_skills = s.support_skills.map(sup => {
                if (!sup.additional_text && !sup.level_interval) return sup.id;
                const supOut = { id: sup.id };
                if (sup.level_interval) supOut.level_interval = sup.level_interval;
                if (sup.additional_text) supOut.additional_text = sup.additional_text;
                return supOut;
            });
        }
        return out;
    });

    // Serialize inventory slots (only save slots that have content)
    const activeSlots = window.buildState.inventory_slots.filter(s => {
        return s.additional_text || s.unique_name || s.level_interval;
    });

    if (activeSlots.length > 0) {
        json.inventory_slots = activeSlots.map(s => {
            const out = { inventory_id: s.inventory_id };
            if (s.level_interval) out.level_interval = s.level_interval;
            if (s.unique_name) out.unique_name = s.unique_name;
            if (s.additional_text) out.additional_text = s.additional_text;
            return out;
        });
    }

    return json;
}
