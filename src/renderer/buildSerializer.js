// ============================================================
// buildSerializer.js — Build state load, reset, and export
// Depends on: state.js, ui.js (updateUI)
// ============================================================

// Keep window.buildState.passives in sync with the active tree variant's nodes.
// All other modules read/write window.buildState.passives; this alias makes it
// point at the correct passive_trees[currentTreeIndex].nodes array.
function syncPassivesAlias() {
    if (!window.buildState.passive_trees || window.buildState.passive_trees.length === 0) {
        window.buildState.passive_trees = [{ level_interval: null, nodes: [] }];
    }
    window.currentTreeIndex = Math.max(
        0,
        Math.min(window.currentTreeIndex, window.buildState.passive_trees.length - 1)
    );
    window.buildState.passives = window.buildState.passive_trees[window.currentTreeIndex].nodes;
}

// 2. BUILD STATE HELPERS

function resetToNewBuild() {
    window.buildState = {
        name: "New Titan Build",
        author: "",
        description: "",
        ascendancy: "",
        skills: [],
        inventory_slots: [],
        passive_trees: [{ level_interval: null, nodes: [] }]
    };
    window.currentTreeIndex = 0;
    window.currentFilePath = null;
    window.isDirty = false;
    window.selectedElement = null;
    syncPassivesAlias();

    window.standardSlots.forEach(s => {
        window.buildState.inventory_slots.push({ inventory_id: s.id, additional_text: "" });
    });

    updateUI();
    if (window.renderTreeVariantBar) window.renderTreeVariantBar();
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
        passive_trees: []
    };

    // ── Passive trees (from flat passives array) ────────────────────────
    if (Array.isArray(json.passives) && json.passives.length > 0) {
        const groups = [];
        const findGroup = (interval) => {
            return groups.find(g => {
                if (!g.level_interval && !interval) return true;
                if (!g.level_interval || !interval) return false;
                if (Array.isArray(g.level_interval) && Array.isArray(interval)) {
                    return g.level_interval[0] === interval[0] && g.level_interval[1] === interval[1];
                }
                return g.level_interval === interval;
            });
        };

        json.passives.forEach(p => {
            let id = "";
            let text = "";
            let interval = null;
            if (typeof p === 'string') {
                id = p;
            } else if (typeof p === 'object' && p.id) {
                id = p.id;
                text = p.additional_text || "";
                interval = p.level_interval || null;
            }
            if (id) {
                let group = findGroup(interval);
                if (!group) {
                    group = { level_interval: interval, nodes: [] };
                    groups.push(group);
                }
                group.nodes.push({ id: id, additional_text: text });
            }
        });

        groups.forEach(g => window.buildState.passive_trees.push(g));
    } else if (Array.isArray(json.passive_trees) && json.passive_trees.length > 0) {
        // Fallback for the temporary format we briefly created
        json.passive_trees.forEach(tree => {
            const nodes = parsePassiveNodes(tree.nodes || []);
            window.buildState.passive_trees.push({
                level_interval: tree.level_interval || null,
                nodes
            });
        });
    }

    if (window.buildState.passive_trees.length === 0) {
        window.buildState.passive_trees.push({ level_interval: null, nodes: [] });
    }

    // ── Skills ──────────────────────────────────────────────────
    if (Array.isArray(json.skills)) {
        json.skills.forEach(s => {
            let skillObj = { id: "", level_interval: null, additional_text: "", support_skills: [] };
            if (typeof s === 'string') {
                skillObj.id = s;
            } else if (typeof s === 'object') {
                skillObj.id = s.id || "";
                skillObj.level_interval = s.level_interval || null;
                skillObj.additional_text = s.additional_text || "";
                if (Array.isArray(s.support_skills)) {
                    s.support_skills.forEach(sup => {
                        let supportObj = { id: "", level_interval: null, additional_text: "" };
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

    // ── Inventory Slots ─────────────────────────────────────────
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
            window.buildState.inventory_slots.push({ inventory_id: s.id, additional_text: "" });
        }
    });
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

    window.currentTreeIndex = 0;
    window.isDirty = false;
    window.selectedElement = null;
    syncPassivesAlias();
    updateUI();
    if (window.renderTreeVariantBar) window.renderTreeVariantBar();
}

// Parse a raw passives array (string or object) into node objects
function parsePassiveNodes(arr) {
    const nodes = [];
    arr.forEach(p => {
        if (typeof p === 'string') {
            nodes.push({ id: p });
        } else if (typeof p === 'object' && p.id) {
            nodes.push({ id: p.id, additional_text: p.additional_text || "" });
        }
    });
    return nodes;
}

function exportBuildJson() {
    const json = {
        name: window.buildState.name,
        author: window.buildState.author || undefined,
        description: window.buildState.description || undefined,
        ascendancy: window.buildState.ascendancy || undefined
    };

    // Passives (flattened from passive_trees to comply with spec)
    if (window.buildState.passive_trees && window.buildState.passive_trees.length > 0) {
        const passivesOut = [];
        window.buildState.passive_trees.forEach(tree => {
            if (tree.nodes && tree.nodes.length > 0) {
                tree.nodes.forEach(p => {
                    if (!tree.level_interval && !p.additional_text) {
                        passivesOut.push(p.id);
                    } else {
                        const outNode = { id: p.id };
                        if (tree.level_interval) outNode.level_interval = tree.level_interval;
                        if (p.additional_text) outNode.additional_text = p.additional_text;
                        passivesOut.push(outNode);
                    }
                });
            }
        });
        if (passivesOut.length > 0) {
            json.passives = passivesOut;
        }
    }

    // Skills
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

    // Inventory slots (only populated ones)
    const activeSlots = window.buildState.inventory_slots.filter(s => s.additional_text || s.unique_name || s.level_interval);
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
