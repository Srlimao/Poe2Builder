// ============================================================
// autocomplete.js — Gem ID autocomplete engine
// Depends on: state.js, database.js, gemTooltip.js
// ============================================================

// 9. AUTOCOMPLETE ENGINE

function showAutocompleteSuggestions(query) {
    const sugContainer = document.getElementById("id-autocomplete-suggestions");
    if (!sugContainer || !window.selectedElement) return;

    if (!query || query.length < 1) {
        sugContainer.classList.add("hidden");
        return;
    }

    // Determine database based on current selection type
    let db = [];
    const disableMeta = localStorage.getItem("disableMetaGems") !== "false";

    if (window.selectedElement.type === 'skill') {
        db = disableMeta ? window.activeGemsDb.filter(g => g.type !== 'spirit') : window.activeGemsDb;
    } else if (window.selectedElement.type === 'support') {
        db = window.supportGemsDb;

        // Spirit gems can also accept active skill links
        if (window.selectedElement.skillIndex !== undefined && window.buildState && window.buildState.skills) {
            const parentSkill = window.buildState.skills[window.selectedElement.skillIndex];
            if (parentSkill && parentSkill.id) {
                const parentGemData = window.activeGemsDb.find(g => g.id === parentSkill.id);
                if (parentGemData && parentGemData.type === 'spirit') {
                    const activeSkills = window.activeGemsDb.filter(g => g.type === 'skill');
                    db = window.supportGemsDb.concat(activeSkills);
                }
            }
        }
        
        // Filter out spirit gems if they accidentally ended up here and the setting is on
        if (disableMeta) {
            db = db.filter(g => g.type !== 'spirit');
        }
    } else {
        sugContainer.classList.add("hidden");
        return; // No autocomplete for slot IDs or passives
    }

    const qLower = query.toLowerCase();
    const filtered = db.filter(item => {
        return item.name.toLowerCase().includes(qLower) || item.id.toLowerCase().includes(qLower);
    }).slice(0, 8);

    if (filtered.length === 0) {
        sugContainer.classList.add("hidden");
        return;
    }

    sugContainer.innerHTML = "";
    filtered.forEach(item => {
        const itemEl = document.createElement("div");
        itemEl.className = "suggestion-item";

        const nameSpan = document.createElement("span");
        nameSpan.className = "sug-name";
        nameSpan.textContent = item.name;

        const detailsSpan = document.createElement("span");
        detailsSpan.className = "sug-details";
        detailsSpan.textContent = item.type === 'spirit' ? 'Spirit Gem' : 'Tier ' + item.tier;

        itemEl.appendChild(nameSpan);
        itemEl.appendChild(detailsSpan);

        itemEl.addEventListener("click", () => {
            const input = document.getElementById("edit-id");
            input.value = item.id;

            if (window.selectedElement.type === 'skill') {
                window.buildState.skills[window.selectedElement.skillIndex].id = item.id;
            } else if (window.selectedElement.type === 'support') {
                const skill = window.buildState.skills[window.selectedElement.skillIndex];
                skill.support_skills[window.selectedElement.supportIndex].id = item.id;
            }

            document.getElementById("editor-item-title").textContent = item.name;
            markAsDirty();
            renderLivePreview();
            renderSkillsGrid();
            sugContainer.classList.add("hidden");
            hideGemTooltip();
        });

        itemEl.addEventListener("mouseenter", () => showGemTooltip(item.id, itemEl));
        itemEl.addEventListener("mouseleave", () => hideGemTooltip());

        sugContainer.appendChild(itemEl);
    });

    sugContainer.classList.remove("hidden");
}

function hideAutocomplete() {
    const sug = document.getElementById("id-autocomplete-suggestions");
    if (sug) sug.classList.add("hidden");
    const uniqueSug = document.getElementById("unique-autocomplete-suggestions");
    if (uniqueSug) uniqueSug.classList.add("hidden");
    hideGemTooltip();
}

function showUniqueAutocompleteSuggestions(query) {
    const sugContainer = document.getElementById("unique-autocomplete-suggestions");
    if (!sugContainer || !window.selectedElement || window.selectedElement.type !== 'slot') return;

    if (!query || query.length < 1) {
        sugContainer.classList.add("hidden");
        return;
    }

    if (!window.uniquesDb || window.uniquesDb.length === 0) {
        return;
    }

    const qLower = query.toLowerCase();
    
    // Map slots to allowed item classes
    const slotClassMap = {
        'Helm1': ['Helmet'],
        'BodyArmour1': ['Body Armour'],
        'Gloves1': ['Gloves'],
        'Boots1': ['Boots'],
        'Amulet1': ['Amulet', 'Talisman'],
        'Ring1': ['Ring'],
        'Ring2': ['Ring'],
        'Belt1': ['Belt'],
        'Weapon1': ['Wand', 'Shield', 'Focii', 'Spear', 'Staff', 'Mace', 'Warstaff', 'Bow', 'Crossbow', 'Sceptre', 'Quiver', 'Axe', 'Sword', 'Claw', 'Dagger', 'Flail', 'Two Hand Mace', 'One Hand Mace'],
        'Weapon2': ['Wand', 'Shield', 'Focii', 'Spear', 'Staff', 'Mace', 'Warstaff', 'Bow', 'Crossbow', 'Sceptre', 'Quiver', 'Axe', 'Sword', 'Claw', 'Dagger', 'Flail', 'Two Hand Mace', 'One Hand Mace']
    };

    const allowedClasses = slotClassMap[window.selectedElement.id];

    const filtered = window.uniquesDb.filter(item => {
        // First filter by item class if applicable
        if (allowedClasses && !allowedClasses.includes(item.ItemClass)) {
            // For weapons, since PoE2 has many weapon types, we can also do a fallback check:
            // If the slot is a Weapon slot and the item class isn't in one of the strict non-weapon categories, allow it.
            if (window.selectedElement.id === 'Weapon1' || window.selectedElement.id === 'Weapon2') {
                const nonWeapons = ['Helmet', 'Body Armour', 'Gloves', 'Boots', 'Amulet', 'Talisman', 'Ring', 'Belt', 'Flask', 'Jewel', 'Charm'];
                if (nonWeapons.includes(item.ItemClass)) return false;
            } else {
                return false;
            }
        }
        return item.Name.toLowerCase().includes(qLower);
    }).slice(0, 8);

    if (filtered.length === 0) {
        sugContainer.classList.add("hidden");
        return;
    }

    sugContainer.innerHTML = "";
    filtered.forEach(item => {
        const itemEl = document.createElement("div");
        itemEl.className = "suggestion-item";

        const nameSpan = document.createElement("span");
        nameSpan.className = "sug-name";
        nameSpan.textContent = item.Name;

        const detailsSpan = document.createElement("span");
        detailsSpan.className = "sug-details";
        detailsSpan.textContent = item.ItemClass;

        itemEl.appendChild(nameSpan);
        itemEl.appendChild(detailsSpan);

        itemEl.addEventListener("click", () => {
            const input = document.getElementById("edit-unique-name");
            input.value = item.Name;

            // Trigger the actual update logic
            const variants = window.buildState.inventory_slots.filter(x => x.inventory_id === window.selectedElement.id);
            if (variants.length > 0) {
                const slot = variants[window.selectedElement.variantIndex || 0];
                slot.unique_name = item.Name;
                markAsDirty();
                if (window.renderLivePreview) window.renderLivePreview();
                const slotEl = document.getElementById(`slot-${window.selectedElement.id}`);
                if (slotEl) {
                    slotEl.querySelector(".eq-value").textContent = item.Name;
                }
            }

            sugContainer.classList.add("hidden");
        });

        sugContainer.appendChild(itemEl);
    });

    sugContainer.classList.remove("hidden");
}
