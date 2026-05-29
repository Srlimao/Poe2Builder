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
    if (window.selectedElement.type === 'skill') {
        db = window.activeGemsDb;
    } else if (window.selectedElement.type === 'support') {
        db = window.supportGemsDb;

        // Spirit gems can also accept active skill links
        if (window.selectedElement.skillIndex !== undefined && window.buildState && window.buildState.skills) {
            const parentSkill = window.buildState.skills[window.selectedElement.skillIndex];
            if (parentSkill && parentSkill.id) {
                const parentGemData = window.activeGemsDb.find(g => g.id === parentSkill.id);
                if (parentGemData && parentGemData.GemType === 'spirit') {
                    const activeSkills = window.activeGemsDb.filter(g => g.GemType === 'active');
                    db = window.supportGemsDb.concat(activeSkills);
                }
            }
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
    hideGemTooltip();
}
