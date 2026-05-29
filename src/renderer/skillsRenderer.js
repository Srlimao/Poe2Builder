// ============================================================
// skillsRenderer.js — Skills socket grid rendering & CRUD
// Depends on: state.js, database.js, gemTooltip.js, ui.js (markAsDirty, selectElement)
// ============================================================

// 4. RENDERING SKILLS LIST

function renderSkillsGrid() {
    const listContainer = document.getElementById("skills-list");
    if (!listContainer) return;

    if (window.buildState.skills.length === 0) {
        listContainer.innerHTML = `
            <div class="no-skills-message">
                No skills added yet. Click "+ Add Skill" to add your first skill gem socket!
            </div>
        `;
        return;
    }

    listContainer.innerHTML = "";

    window.buildState.skills.forEach((skill, sIdx) => {
        const skillGroup = document.createElement("div");
        skillGroup.className = "skill-socket-group";
        if (window.selectedElement && window.selectedElement.skillIndex === sIdx) {
            skillGroup.classList.add("active-group");
        }

        // Active Gem Socket
        const activeSocket = document.createElement("div");
        activeSocket.className = "socket-active";

        const gemColor = getGemColor(skill.id);
        if (gemColor) activeSocket.classList.add(`gem-${gemColor}`);

        if (window.selectedElement && window.selectedElement.type === 'skill' && window.selectedElement.skillIndex === sIdx) {
            activeSocket.classList.add("selected");
        }

        activeSocket.addEventListener("click", (e) => {
            e.stopPropagation();
            selectElement({ type: 'skill', skillIndex: sIdx, id: skill.id });
        });

        activeSocket.addEventListener("mouseenter", () => showGemTooltip(skill.id, activeSocket));
        activeSocket.addEventListener("mouseleave", () => hideGemTooltip());

        const activeLabelSymbol = document.createElement("span");
        activeLabelSymbol.className = "gem-label-symbol";
        activeLabelSymbol.textContent = getGemDisplayName(skill.id).charAt(0) || "+";
        activeSocket.appendChild(activeLabelSymbol);

        // Linkage Row (background line + active socket + supports)
        const linkageRow = document.createElement("div");
        linkageRow.className = "sockets-linkage-row";
        linkageRow.appendChild(activeSocket);

        // Support sockets wrapper
        const supportsWrapper = document.createElement("div");
        supportsWrapper.className = "support-sockets-wrapper";

        const supports = skill.support_skills || [];
        supports.forEach((support, supIdx) => {
            const supportSocket = document.createElement("div");
            supportSocket.className = "socket-support";

            const color = getGemColor(support.id);
            if (color) supportSocket.classList.add(`gem-${color}`);

            if (window.selectedElement &&
                window.selectedElement.type === 'support' &&
                window.selectedElement.skillIndex === sIdx &&
                window.selectedElement.supportIndex === supIdx) {
                supportSocket.classList.add("selected");
            }

            supportSocket.addEventListener("click", (e) => {
                e.stopPropagation();
                selectElement({ type: 'support', skillIndex: sIdx, supportIndex: supIdx, id: support.id });
            });

            supportSocket.addEventListener("mouseenter", () => showGemTooltip(support.id, supportSocket));
            supportSocket.addEventListener("mouseleave", () => hideGemTooltip());

            const supportLabel = document.createElement("span");
            supportLabel.className = "support-label-symbol";
            supportLabel.textContent = getGemDisplayName(support.id).charAt(0) || "?";
            supportSocket.appendChild(supportLabel);

            supportsWrapper.appendChild(supportSocket);
        });

        // Empty slot for adding a new support gem (limit 5)
        if (supports.length < 5) {
            const addSupportSocket = document.createElement("div");
            addSupportSocket.className = "socket-support empty-support";

            const plus = document.createElement("span");
            plus.className = "support-label-symbol";
            plus.textContent = "+";
            addSupportSocket.appendChild(plus);

            addSupportSocket.addEventListener("click", (e) => {
                e.stopPropagation();
                addSupportGem(sIdx);
            });
            supportsWrapper.appendChild(addSupportSocket);
        }

        linkageRow.appendChild(supportsWrapper);
        skillGroup.appendChild(linkageRow);

        // Gem name & type overlay
        const skillInfo = document.createElement("div");
        skillInfo.className = "skill-info-overlay";

        const skillTitle = document.createElement("div");
        skillTitle.className = "skill-row-title";
        skillTitle.textContent = getGemDisplayName(skill.id) || "Unnamed Gem";

        const skillDetails = document.createElement("div");
        skillDetails.className = "skill-row-details";
        const tierStr = getGemTierString(skill.id);
        skillDetails.textContent = tierStr ? `Tier ${tierStr}` : "Active Skill";

        skillInfo.appendChild(skillTitle);
        skillInfo.appendChild(skillDetails);
        skillGroup.appendChild(skillInfo);

        // Level Interval Inline Editor
        const lvlBadge = document.createElement("div");
        lvlBadge.className = "skill-level-badge";
        
        const lvlLabel = document.createElement("span");
        lvlLabel.textContent = "Lvl:";
        
        const minInput = document.createElement("input");
        minInput.type = "number";
        minInput.className = "skill-level-inline-input";
        minInput.min = 0;
        minInput.max = 100;
        minInput.placeholder = "0";
        
        const maxInput = document.createElement("input");
        maxInput.type = "number";
        maxInput.className = "skill-level-inline-input";
        maxInput.min = 0;
        maxInput.max = 100;
        maxInput.placeholder = "100";
        
        if (skill.level_interval) {
            if (Array.isArray(skill.level_interval)) {
                minInput.value = skill.level_interval[0];
                maxInput.value = skill.level_interval[1];
            } else {
                minInput.value = skill.level_interval;
                maxInput.value = 100;
            }
        }
        
        const separator = document.createElement("span");
        separator.textContent = "-";

        lvlBadge.appendChild(lvlLabel);
        lvlBadge.appendChild(minInput);
        lvlBadge.appendChild(separator);
        lvlBadge.appendChild(maxInput);
        
        const onLvlChange = () => {
            const min = parseInt(minInput.value);
            const max = parseInt(maxInput.value);
            
            let interval = null;
            if (!isNaN(min) || !isNaN(max)) {
                interval = [isNaN(min) ? 0 : min, isNaN(max) ? 100 : max];
            }
            
            skill.level_interval = interval;
            
            if (skill.support_skills) {
                skill.support_skills.forEach(sup => {
                    sup.level_interval = interval;
                });
            }
            
            if (window.markAsDirty) window.markAsDirty();
            if (window.syncEditorForm) window.syncEditorForm();
            if (window.renderLivePreview) window.renderLivePreview();
        };
        
        minInput.addEventListener("change", onLvlChange);
        maxInput.addEventListener("change", onLvlChange);

        skillGroup.appendChild(lvlBadge);

        // Delete button for the whole skill line
        const btnDeleteRow = document.createElement("button");
        btnDeleteRow.className = "btn-remove-skill-row";
        btnDeleteRow.innerHTML = "&times;";
        btnDeleteRow.title = "Delete Skill";
        btnDeleteRow.addEventListener("click", (e) => {
            e.stopPropagation();
            deleteSkillLine(sIdx);
        });
        skillGroup.appendChild(btnDeleteRow);

        listContainer.appendChild(skillGroup);
    });

    if (typeof filterSkillsGrid === 'function') {
        filterSkillsGrid();
    }
}

// 8. GEM CRUD OPERATIONS

function addSupportGem(skillIndex) {
    const skill = window.buildState.skills[skillIndex];
    if (!skill.support_skills) skill.support_skills = [];
    if (skill.support_skills.length >= 5) return;

    const newSupport = {
        id: "Metadata/Items/Gems/SupportGemNewSupport",
        level_interval: null,
        additional_text: ""
    };
    skill.support_skills.push(newSupport);
    markAsDirty();

    selectElement({
        type: 'support',
        skillIndex: skillIndex,
        supportIndex: skill.support_skills.length - 1,
        id: newSupport.id
    });
}

async function deleteSkillLine(skillIndex) {
    if (await showConfirm("Delete Skill Line", "Delete this active skill line?")) {
        window.buildState.skills.splice(skillIndex, 1);
        if (window.selectedElement && window.selectedElement.skillIndex === skillIndex) {
            window.selectedElement = null;
        } else if (window.selectedElement && window.selectedElement.skillIndex > skillIndex) {
            window.selectedElement.skillIndex--;
        }
        markAsDirty();
        updateUI();
    }
}

function filterSkillsGrid() {
    const slider = document.getElementById("skills-level-slider");
    if (!slider) return;
    const filterLevel = parseInt(slider.value);
    
    document.getElementById("skills-level-display").textContent = filterLevel;
    
    const groups = document.querySelectorAll("#skills-list .skill-socket-group");
    window.buildState.skills.forEach((skill, idx) => {
        const groupEl = groups[idx];
        if (!groupEl) return;
        
        let isVisible = true;
        if (skill.level_interval && Array.isArray(skill.level_interval)) {
            const min = skill.level_interval[0];
            const max = skill.level_interval[1];
            if (filterLevel < min || filterLevel > max) {
                isVisible = false;
            }
        }
        
        if (isVisible) {
            groupEl.style.display = "";
        } else {
            groupEl.style.display = "none";
        }
    });
}

