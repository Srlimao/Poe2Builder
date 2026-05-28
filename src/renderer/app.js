// State Management
window.buildState = {
    name: "New Build",
    author: "",
    description: "",
    ascendancy: "",
    skills: [],
    inventory_slots: [],
    passives: [] // Preserve passives from loaded files
};

let currentFilePath = null;
window.isDirty = false;

// Databases loaded from user JSON files
let activeGemsDb = [];  // Combining active skills and spirit gems
let supportGemsDb = []; // Support gems

// Equipment Slots metadata
const standardSlots = [
    { id: "Helm1", label: "Helmet" },
    { id: "Amulet1", label: "Amulet" },
    { id: "Weapon1", label: "Weapon 1" },
    { id: "BodyArmour1", label: "Body Armour" },
    { id: "Weapon2", label: "Weapon 2 / Shield" },
    { id: "Gloves1", label: "Gloves" },
    { id: "Ring1", label: "Left Ring" },
    { id: "Ring2", label: "Right Ring" },
    { id: "Belt1", label: "Belt" },
    { id: "Boots1", label: "Boots" }
];

// Selection State
// Holds: { type: 'slot'|'skill'|'support', id: string, skillIndex: number, supportIndex: number }
let selectedElement = null;

// Initialize app when DOM is fully loaded
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

// 1. DATABASE LOADING
async function loadGemsDatabases() {
    try {
        let skillGems = [];
        let supportGems = [];
        let spiritGems = [];

        // Check if we are running in Electron and can read local files directly
        const isElectron = typeof window.electronAPI !== 'undefined';

        if (isElectron) {
            console.log("Loading databases via Electron IPC...");
            skillGems = await window.electronAPI.readLocalJson('skill_gems.json') || [];
            supportGems = await window.electronAPI.readLocalJson('support_gems.json') || [];
            spiritGems = await window.electronAPI.readLocalJson('spirit_gems.json') || [];
        } else {
            // Web fallback (development and browser testing)
            console.log("Loading databases via HTTP fetch...");
            const fetchJson = async (url) => {
                const res = await fetch(url);
                if (!res.ok) throw new Error(`HTTP error ${res.status}`);
                return await res.json();
            };
            skillGems = await fetchJson('../../data/skill_gems.json').catch(() => []);
            supportGems = await fetchJson('../../data/support_gems.json').catch(() => []);
            spiritGems = await fetchJson('../../data/spirit_gems.json').catch(() => []);
        }

        // Parse and combine database formats
        // Active gems include skills and spirit gems
        activeGemsDb = [];
        
        skillGems.forEach(g => {
            activeGemsDb.push({
                name: g.Gem,
                type: 'skill',
                tier: g.Tier,
                id: generateGemId(g.Gem, 'skill')
            });
        });

        spiritGems.forEach(g => {
            activeGemsDb.push({
                name: g.Gem,
                type: 'spirit',
                tier: g.Tier,
                id: generateGemId(g.Gem, 'spirit')
            });
        });

        supportGemsDb = [];
        supportGems.forEach(g => {
            // Filter duplicate names if any
            if (!supportGemsDb.some(x => x.name === g.Gem)) {
                supportGemsDb.push({
                    name: g.Gem,
                    type: 'support',
                    tier: g.Tier,
                    id: generateGemId(g.Gem, 'support')
                });
            }
        });

        console.log(`Loaded databases: Active Gems: ${activeGemsDb.length}, Support Gems: ${supportGemsDb.length}`);
    } catch (error) {
        console.error("Error loading gem databases:", error);
    }
}

async function loadAscendancies() {
    try {
        let ascendancies = [];
        const isElectron = typeof window.electronAPI !== 'undefined';
        if (isElectron) {
            ascendancies = await window.electronAPI.readLocalJson('ascendancies.json') || [];
        } else {
            const res = await fetch('../../data/ascendancies.json').catch(() => null);
            if (res && res.ok) ascendancies = await res.json();
        }

        const select = document.getElementById('meta-ascendancy');
        
        // Preserve the Custom option to append later
        const customOpt = select.querySelector('option[value="Custom"]');
        
        // Clear all options except the first one (None)
        while (select.options.length > 1) {
            select.remove(1);
        }

        // Add dynamically loaded ascendancies
        if (ascendancies && ascendancies.length > 0) {
            ascendancies.forEach(asc => {
                const opt = document.createElement('option');
                opt.value = asc.id;
                opt.textContent = asc.name;
                select.appendChild(opt);
            });
        }

        // Add Custom option back at the end
        if (customOpt) {
            select.appendChild(customOpt);
        }
    } catch (e) {
        console.error("Error loading ascendancies:", e);
    }
}

// Generate default game ID based on name and type
function generateGemId(name, type) {
    if (!name) return "";
    
    // Clean name (camelcase, removing non-alphanumeric characters)
    const camel = name
        .replace(/[^a-zA-Z0-9\s]/g, '')
        .split(/\s+/)
        .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join('');

    if (type === 'support') {
        return `Metadata/Items/Gems/SupportGem${camel}`;
    } else if (type === 'spirit') {
        // Many spirit gems in actual build planner files might be SkillGems or SpiritGems.
        // Let's use metadata/items/gems/support or skill gem format, or spirit gem format.
        return `Metadata/Items/Gems/SpiritGem${camel}`;
    }
    return `Metadata/Items/Gems/SkillGem${camel}`;
}

// Check Path of Exile 2 local folder status
async function checkPoePathStatus() {
    const isElectron = typeof window.electronAPI !== 'undefined';
    const statusEl = document.getElementById("poe-path-status");
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

// 2. BUILD STATE HELPERS
function resetToNewBuild() {
    buildState = {
        name: "New Titan Build",
        author: "",
        description: "",
        ascendancy: "",
        skills: [],
        inventory_slots: [],
        passives: []
    };
    currentFilePath = null;
    window.isDirty = false;
    selectedElement = null;
    
    // Populate standard inventory slots
    standardSlots.forEach(s => {
        buildState.inventory_slots.push({
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
        passives: json.passives || [] // Preserve existing passives
    };

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
            buildState.skills.push(skillObj);
        });
    }

    // Inventory Slots parsing (ensure all standard slots exist)
    const loadedSlots = Array.isArray(json.inventory_slots) ? json.inventory_slots : [];
    
    standardSlots.forEach(s => {
        const found = loadedSlots.find(x => x.inventory_id === s.id);
        if (found) {
            buildState.inventory_slots.push({
                inventory_id: s.id,
                level_interval: found.level_interval || null,
                unique_name: found.unique_name || "",
                additional_text: found.additional_text || ""
            });
        } else {
            buildState.inventory_slots.push({
                inventory_id: s.id,
                additional_text: ""
            });
        }
    });

    // Also support any custom slots loaded from the file
    loadedSlots.forEach(s => {
        if (!standardSlots.some(x => x.id === s.inventory_id)) {
            buildState.inventory_slots.push({
                inventory_id: s.inventory_id,
                level_interval: s.level_interval || null,
                unique_name: s.unique_name || "",
                additional_text: s.additional_text || ""
            });
        }
    });

    window.isDirty = false;
    selectedElement = null;
    updateUI();
}

function exportBuildJson() {
    const json = {
        name: window.buildState.name,
        author: window.buildState.author || undefined,
        description: window.buildState.description || undefined,
        ascendancy: window.buildState.ascendancy || undefined
    };

    // Only output passives if they were loaded or exist
    if (window.buildState.passives && window.buildState.passives.length > 0) {
        json.passives = window.buildState.passives;
    }

    // Serialize skills
    json.skills = window.buildState.skills.map(s => {
        const out = { id: s.id };
        if (s.level_interval) out.level_interval = s.level_interval;
        if (s.additional_text) out.additional_text = s.additional_text;
        
        if (s.support_skills && s.support_skills.length > 0) {
            out.support_skills = s.support_skills.map(sup => {
                // If it only has an ID, serialize as a string
                if (!sup.additional_text && !sup.level_interval) {
                    return sup.id;
                }
                const supOut = { id: sup.id };
                if (sup.level_interval) supOut.level_interval = sup.level_interval;
                if (sup.additional_text) supOut.additional_text = sup.additional_text;
                return supOut;
            });
        }
        return out;
    });

    // Serialize inventory slots (only save slots that have content)
    const activeSlots = buildState.inventory_slots.filter(s => {
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

// 3. UI SYNCING & UPDATES
window.updateUI = function updateUI() {
    // Header File info
    const filenameEl = document.getElementById("current-filename");
    if (filenameEl) {
        filenameEl.textContent = currentFilePath ? getFilenameFromPath(currentFilePath) : "Untitled.build";
    }

    const dirtyEl = document.getElementById("dirty-indicator");
    if (dirtyEl) {
        if (isDirty) dirtyEl.classList.remove("hidden");
        else dirtyEl.classList.add("hidden");
    }

    // Metadata form syncing
    document.getElementById("meta-name").value = buildState.name;
    document.getElementById("meta-author").value = buildState.author || "";
    
    const ascSelect = document.getElementById("meta-ascendancy");
    const ascCustom = document.getElementById("meta-ascendancy-custom");
    
    // Set Ascendancy values
    const hasAsc = Array.from(ascSelect.options).some(opt => opt.value === buildState.ascendancy);
    if (hasAsc || !buildState.ascendancy) {
        ascSelect.value = buildState.ascendancy;
        ascCustom.classList.add("hidden");
    } else {
        ascSelect.value = "Custom";
        ascCustom.value = buildState.ascendancy;
        ascCustom.classList.remove("hidden");
    }
    
    document.getElementById("meta-desc").value = buildState.description || "";

    // Sync Equipment Grid Cards
    standardSlots.forEach(s => {
        const slotState = buildState.inventory_slots.find(x => x.inventory_id === s.id);
        const slotEl = document.getElementById(`slot-${s.id}`);
        if (!slotEl) return;

        // Reset classes
        slotEl.className = "eq-slot";
        if (selectedElement && selectedElement.type === 'slot' && selectedElement.id === s.id) {
            slotEl.classList.add("active");
        }

        const valueEl = slotEl.querySelector(".eq-value");
        if (slotState && (slotState.additional_text || slotState.unique_name)) {
            slotEl.classList.add("configured");
            let displayText = slotState.unique_name || getFirstLineOfText(slotState.additional_text) || "Configured";
            displayText = displayText.replace(/&lt;[^&]*&gt;|\<[^>]*\>/g, ""); // strip tags for grid view
            valueEl.textContent = displayText;
        } else {
            valueEl.textContent = "Empty";
        }
    });

    // Render Skill Socket Grid
    renderSkillsGrid();

    // Render Editor Panel
    syncEditorForm();

    // Update Footer stats
    updateFooterStats();
}

function getFilenameFromPath(filePath) {
    if (!filePath) return "";
    return filePath.split(/[\\/]/).pop();
}

function getFirstLineOfText(text) {
    if (!text) return "";
    // Clean and split lines
    const line = text.trim().split('\n')[0];
    return line;
}

function updateFooterStats() {
    let skillCount = buildState.skills.length;
    let supportCount = 0;
    buildState.skills.forEach(s => {
        supportCount += s.support_skills ? s.support_skills.length : 0;
    });

    let activeSlotsCount = buildState.inventory_slots.filter(s => {
        return s.additional_text || s.unique_name || s.level_interval;
    }).length;

    document.getElementById("stat-skills-count").textContent = skillCount;
    document.getElementById("stat-supports-count").textContent = supportCount;
    document.getElementById("stat-slots-count").textContent = `${activeSlotsCount}/${standardSlots.length}`;
}

// 4. RENDERING SKILLS LIST
function renderSkillsGrid() {
    const listContainer = document.getElementById("skills-list");
    if (!listContainer) return;

    if (buildState.skills.length === 0) {
        listContainer.innerHTML = `
            <div class="no-skills-message">
                No skills added yet. Click "+ Add Skill" to add your first skill gem socket!
            </div>
        `;
        return;
    }

    listContainer.innerHTML = "";

    buildState.skills.forEach((skill, sIdx) => {
        const skillGroup = document.createElement("div");
        skillGroup.className = "skill-socket-group";
        if (selectedElement && selectedElement.skillIndex === sIdx) {
            skillGroup.classList.add("active-group");
        }

        // Active Gem Socket element
        const activeSocket = document.createElement("div");
        activeSocket.className = "socket-active";
        
        // Find gem color theme for styling
        const gemColor = getGemColor(skill.id);
        if (gemColor) activeSocket.classList.add(`gem-${gemColor}`);
        
        if (selectedElement && selectedElement.type === 'skill' && selectedElement.skillIndex === sIdx) {
            activeSocket.classList.add("selected");
        }
        
        activeSocket.addEventListener("click", (e) => {
            e.stopPropagation();
            selectElement({
                type: 'skill',
                skillIndex: sIdx,
                id: skill.id
            });
        });

        // Icon / Initial inside socket
        const activeLabelSymbol = document.createElement("span");
        activeLabelSymbol.className = "gem-label-symbol";
        activeLabelSymbol.textContent = getGemDisplayName(skill.id).charAt(0) || "+";
        activeSocket.appendChild(activeLabelSymbol);

        // Linkage Row wrapper (holds line background, active socket, and supports)
        const linkageRow = document.createElement("div");
        linkageRow.className = "sockets-linkage-row";
        linkageRow.appendChild(activeSocket);

        // Support sockets wrapper
        const supportsWrapper = document.createElement("div");
        supportsWrapper.className = "support-sockets-wrapper";

        // Render existing supports
        const supports = skill.support_skills || [];
        supports.forEach((support, supIdx) => {
            const supportSocket = document.createElement("div");
            supportSocket.className = "socket-support";
            
            const color = getGemColor(support.id);
            if (color) supportSocket.classList.add(`gem-${color}`);

            if (selectedElement && selectedElement.type === 'support' && selectedElement.skillIndex === sIdx && selectedElement.supportIndex === supIdx) {
                supportSocket.classList.add("selected");
            }

            supportSocket.addEventListener("click", (e) => {
                e.stopPropagation();
                selectElement({
                    type: 'support',
                    skillIndex: sIdx,
                    supportIndex: supIdx,
                    id: support.id
                });
            });

            const supportLabel = document.createElement("span");
            supportLabel.className = "support-label-symbol";
            supportLabel.textContent = getGemDisplayName(support.id).charAt(0) || "?";
            supportSocket.appendChild(supportLabel);

            supportsWrapper.appendChild(supportSocket);
        });

        // Empty slot for adding new support gem (limit to 5 supports)
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

        // Gem name tag overlay
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

        // Delete button for this entire skill line
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
}

function getGemDisplayName(id) {
    if (!id) return "";
    
    // Check if ID is in autocomplete database to get nice display name
    const found = activeGemsDb.concat(supportGemsDb).find(x => x.id === id);
    if (found) return found.name;

    // Parse name from standard metadata paths
    // e.g. "Metadata/Items/Gems/SkillGemEarthquake" -> "Earthquake"
    // e.g. "Metadata/Items/Gem/SupportGemTireless" -> "Tireless"
    const match = id.match(/SupportGem(\w+)|SkillGem(\w+)|SpiritGem(\w+)/);
    if (match) {
        const rawName = match[1] || match[2] || match[3];
        // Add spaces between camelcase words
        return rawName.replace(/([A-Z])/g, ' $1').trim();
    }
    return id;
}

function getGemColor(id) {
    if (!id) return null;
    
    // First, find in databases
    const found = activeGemsDb.concat(supportGemsDb).find(x => x.id === id);
    if (found) {
        if (found.type === 'spirit') return 'spirit';
        
        // Find tier details or default colors based on loaded files
        // (Witch/intelligence is Blue, Ranger/dexterity is Green, Warrior/strength is Red)
        // Let's deduce colors by matching suffixes/names
        const name = found.name.toLowerCase();
        // Just some simple heuristical matching of colors
        if (['fire', 'ignite', 'earth', 'slam', 'strike', 'boneshatter', 'shield', 'fortify', 'seismic', 'rage', 'warcry', 'cry', 'bleed', 'brutality'].some(x => name.includes(x))) return 'red';
        if (['arrow', 'bow', 'shot', 'poison', 'venom', 'lightning', 'chain', 'speed', 'projectile', 'rapid', 'pierce', 'ricochet'].some(x => name.includes(x))) return 'green';
        if (['cold', 'ice', 'frost', 'snow', 'blizzard', 'magic', 'spell', 'intel', 'arc', 'shock', 'spark', 'chaos', 'minion', 'zombie', 'curse', 'essence'].some(x => name.includes(x))) return 'blue';
        
        // Standard fallbacks by class type
        if (found.type === 'support') return 'green'; // support default
        return 'red'; // active default
    }

    // Direct string heuristic matching of ID paths
    const idLower = id.toLowerCase();
    if (idLower.includes('spirit')) return 'spirit';
    if (['earth', 'bone', 'slam', 'shield', 'rage', 'fire', 'cry', 'brutality', 'bleed', 'melee'].some(x => idLower.includes(x))) return 'red';
    if (['arrow', 'pierce', 'speed', 'projectile', 'poison', 'lightning', 'chain'].some(x => idLower.includes(x))) return 'green';
    if (['cold', 'ice', 'frost', 'spell', 'curse', 'spark', 'minion', 'zombie', 'echo', 'mana'].some(x => idLower.includes(x))) return 'blue';

    return 'red';
}

function getGemTierString(id) {
    const found = activeGemsDb.concat(supportGemsDb).find(x => x.id === id);
    return found ? found.tier : "";
}

// 5. SELECTION & ELEMENT EDITING
function selectElement(selection) {
    selectedElement = selection;
    
    // Clear autocomplete suggestions whenever selection changes
    hideAutocomplete();

    // Re-sync UI (handles active classes on equipment cards and sockets)
    updateUI();
}

function syncEditorForm() {
    const placeholder = document.getElementById("editor-placeholder");
    const formContainer = document.getElementById("editor-form-container");
    const deleteBtn = document.getElementById("btn-delete-element");
    
    if (!selectedElement) {
        placeholder.classList.remove("hidden");
        formContainer.classList.add("hidden");
        return;
    }

    placeholder.classList.add("hidden");
    formContainer.classList.remove("hidden");

    // Clear form events to avoid double bindings
    const idInput = document.getElementById("edit-id");
    const uniqueInput = document.getElementById("edit-unique-name");
    const lvlMinInput = document.getElementById("edit-level-min");
    const lvlMaxInput = document.getElementById("edit-level-max");
    const textInput = document.getElementById("edit-text");

    // Populate data based on selection type
    if (selectedElement.type === 'slot') {
        const slot = buildState.inventory_slots.find(x => x.inventory_id === selectedElement.id);
        
        document.getElementById("editor-item-type").textContent = "SLOT";
        document.getElementById("editor-item-title").textContent = getSlotLabel(selectedElement.id);
        document.getElementById("edit-id-label").textContent = "Slot ID";
        deleteBtn.classList.add("hidden");
        
        idInput.value = slot.inventory_id;
        idInput.disabled = true; // Inventory slot ID is fixed
        
        // Show Unique Name field
        document.getElementById("editor-group-unique").classList.remove("hidden");
        uniqueInput.value = slot.unique_name || "";
        
        // Level interval
        lvlMinInput.value = slot.level_interval ? (Array.isArray(slot.level_interval) ? slot.level_interval[0] : slot.level_interval) : "";
        lvlMaxInput.value = slot.level_interval && Array.isArray(slot.level_interval) ? slot.level_interval[1] : "";
        
        // Text
        textInput.value = slot.additional_text || "";

    } else if (selectedElement.type === 'skill') {
        const skill = buildState.skills[selectedElement.skillIndex];
        
        document.getElementById("editor-item-type").textContent = "SKILL GEM";
        document.getElementById("editor-item-title").textContent = getGemDisplayName(skill.id) || "New Active Gem";
        document.getElementById("edit-id-label").textContent = "Skill Gem ID";
        deleteBtn.classList.remove("hidden");
        deleteBtn.textContent = "Delete Active Gem";
        
        idInput.value = skill.id;
        idInput.disabled = false;
        
        // Hide Unique Name field
        document.getElementById("editor-group-unique").classList.add("hidden");
        
        // Level interval
        lvlMinInput.value = skill.level_interval ? (Array.isArray(skill.level_interval) ? skill.level_interval[0] : skill.level_interval) : "";
        lvlMaxInput.value = skill.level_interval && Array.isArray(skill.level_interval) ? skill.level_interval[1] : "";
        
        // Text
        textInput.value = skill.additional_text || "";

    } else if (selectedElement.type === 'support') {
        const skill = buildState.skills[selectedElement.skillIndex];
        const support = skill.support_skills[selectedElement.supportIndex];
        
        document.getElementById("editor-item-type").textContent = "SUPPORT GEM";
        document.getElementById("editor-item-title").textContent = getGemDisplayName(support.id) || "New Support Gem";
        document.getElementById("edit-id-label").textContent = "Support Gem ID";
        deleteBtn.classList.remove("hidden");
        deleteBtn.textContent = "Delete Support Gem";
        
        idInput.value = support.id;
        idInput.disabled = false;
        
        // Hide Unique Name field
        document.getElementById("editor-group-unique").classList.add("hidden");
        
        // Level interval
        lvlMinInput.value = support.level_interval ? (Array.isArray(support.level_interval) ? support.level_interval[0] : support.level_interval) : "";
        lvlMaxInput.value = support.level_interval && Array.isArray(support.level_interval) ? support.level_interval[1] : "";
        
        // Text
        textInput.value = support.additional_text || "";
    }

    // Update Live Preview Window
    renderLivePreview();
}

function getSlotLabel(id) {
    const found = standardSlots.find(x => x.id === id);
    return found ? found.label : id;
}

// 6. POPUP PREVIEW RENDERER
function renderLivePreview() {
    const titleEl = document.getElementById("tooltip-title");
    const lvlEl = document.getElementById("tooltip-level");
    const contentEl = document.getElementById("tooltip-content");

    if (!selectedElement) {
        titleEl.textContent = "Build Planner Instructions";
        lvlEl.textContent = "";
        contentEl.innerHTML = "Select an item to view live tooltips as they appear in the Path of Exile 2 game planner.";
        return;
    }

    let titleText = "";
    let lvlText = "";
    let additionalText = "";

    if (selectedElement.type === 'slot') {
        const slot = buildState.inventory_slots.find(x => x.inventory_id === selectedElement.id);
        titleText = slot.unique_name ? `${getSlotLabel(slot.inventory_id)}: ${slot.unique_name}` : `${getSlotLabel(slot.inventory_id)} recommendation`;
        lvlText = getLevelIntervalString(slot.level_interval);
        additionalText = slot.additional_text || "";
    } else if (selectedElement.type === 'skill') {
        const skill = buildState.skills[selectedElement.skillIndex];
        titleText = getGemDisplayName(skill.id) || "Active Gem Socket";
        lvlText = getLevelIntervalString(skill.level_interval);
        additionalText = skill.additional_text || "";
    } else if (selectedElement.type === 'support') {
        const skill = window.buildState.skills[selectedElement.skillIndex];
        const support = skill.support_skills[selectedElement.supportIndex];
        titleText = `${getGemDisplayName(support.id) || "Support Gem"} (Socketed)`;
        lvlText = getLevelIntervalString(support.level_interval);
        additionalText = support.additional_text || "";
    }

    titleEl.textContent = titleText;
    lvlEl.textContent = lvlText;
    
    // Parse Markup formatting tags into HTML
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

// Convert PoE color/formatting tags recursively
function compilePoEMarkup(text) {
    if (!text) return "";

    // Escape basic HTML entities to avoid XSS and syntax issues
    let output = text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");

    // Matches tags like &lt;red&gt;{content}
    // We match characters inside the tag name, including brackets/commas for rgb()
    const regex = /&lt;([\w\s,()]+)&gt;\{([^{}]+)\}/g;

    const replaceTag = (tag, content) => {
        tag = tag.trim().toLowerCase();

        // 1. Color tags
        if (tag === 'red') return `<span style="color: #ff5555;">${content}</span>`;
        if (tag === 'orange') return `<span style="color: #ffaa00;">${content}</span>`;
        if (tag === 'yellow') return `<span style="color: #ffff55;">${content}</span>`;
        if (tag === 'green') return `<span style="color: #3bfa3b;">${content}</span>`;
        if (tag === 'blue') return `<span style="color: #55aaff;">${content}</span>`;
        if (tag === 'indigo') return `<span style="color: #4b0082;">${content}</span>`;
        if (tag === 'violet') return `<span style="color: #ee82ee;">${content}</span>`;
        if (tag === 'black') return `<span style="color: #000000;">${content}</span>`;
        if (tag === 'white') return `<span style="color: #ffffff;">${content}</span>`;
        if (tag === 'grey') return `<span style="color: #8c8270;">${content}</span>`;
        if (tag === 'bronze') return `<span style="color: #cd7f32;">${content}</span>`;
        if (tag === 'silver') return `<span style="color: #b3c2d4;">${content}</span>`;
        if (tag === 'gold') return `<span style="color: #dfc190;">${content}</span>`;
        
        // Custom RGB: rgb(r, g, b)
        if (tag.startsWith('rgb(')) {
            // Restore rgb format
            return `<span style="color: ${tag};">${content}</span>`;
        }

        // 2. Font modification tags
        if (tag === 'r') return `<span style="font-weight: normal; font-style: normal; text-decoration: none;">${content}</span>`;
        if (tag === 'b') return `<span style="font-weight: bold; color: #fff;">${content}</span>`;
        if (tag === 'i') return `<span style="font-style: italic;">${content}</span>`;
        if (tag === 'u') return `<span style="text-decoration: underline;">${content}</span>`;
        if (tag === 's') return `<span style="font-size: 0.85em; opacity: 0.8;">${content}</span>`;
        if (tag === 'm') return `<span style="font-size: 1.0em;">${content}</span>`;
        if (tag === 'l') return `<span style="font-size: 1.25em; font-family: var(--font-header);">${content}</span>`;

        // If tag is unrecognized, keep as is
        return `&lt;${tag}&gt;{${content}}`;
    };

    // Run regex replacement multiple times to support nested tags (e.g. <m>{<red>{Text}} )
    let lastOutput;
    let iterations = 0;
    do {
        lastOutput = output;
        output = output.replace(regex, (match, tag, content) => replaceTag(tag, content));
        iterations++;
    } while (output !== lastOutput && iterations < 10);

    // Convert newlines to br tags
    return output.replace(/\n/g, "<br>");
}

// 7. EVENT LISTENERS
function setupEventListeners() {
    // --- Tabs Logic ---
    const tabEquipment = document.getElementById("tab-equipment");
    const tabTree = document.getElementById("tab-tree");
    const mainLayout = document.querySelector(".main-layout");
    const treeOverlay = document.getElementById("tree-visualizer-overlay");

    if (tabEquipment && tabTree && mainLayout && treeOverlay) {
        tabEquipment.addEventListener("click", () => {
            tabEquipment.classList.add("active");
            tabTree.classList.remove("active");
            mainLayout.classList.remove("hidden");
            treeOverlay.classList.add("hidden");
        });

        tabTree.addEventListener("click", () => {
            tabTree.classList.add("active");
            tabEquipment.classList.remove("active");
            mainLayout.classList.add("hidden");
            treeOverlay.classList.remove("hidden");
            
            // Re-render tree on tab switch
            if (window.renderTree) window.renderTree();
        });
    }

    // --- Dropdown Logic ---
    const fileMenuContainer = document.getElementById("file-menu-container");
    const fileDropdown = document.getElementById("file-dropdown");
    const btnFileMenu = document.getElementById("btn-file-menu");

    if (btnFileMenu && fileDropdown && fileMenuContainer) {
        btnFileMenu.addEventListener("click", (e) => {
            e.stopPropagation();
            fileDropdown.classList.toggle("hidden");
        });

        // Hide dropdown when clicking outside
        document.addEventListener("click", (e) => {
            if (!fileMenuContainer.contains(e.target)) {
                fileDropdown.classList.add("hidden");
            }
        });

        // Hide dropdown when an item is clicked
        fileDropdown.querySelectorAll(".dropdown-item").forEach(item => {
            item.addEventListener("click", () => {
                fileDropdown.classList.add("hidden");
            });
        });
    }

    // File Controls
    document.getElementById("btn-new").addEventListener("click", async () => {
        if (window.isDirty) {
            if (!(await showConfirm("Unsaved Changes", "You have unsaved changes. Create a new build anyway?"))) return;
        }
        resetToNewBuild();
    });

    document.getElementById("btn-open").addEventListener("click", handleOpenFile);
    document.getElementById("btn-save").addEventListener("click", handleSaveFile);
    document.getElementById("btn-save-as").addEventListener("click", handleSaveFileAs);
    document.getElementById("btn-export-poe").addEventListener("click", handleQuickSavePoE);

    document.getElementById("btn-import-pob2").addEventListener("click", async () => {
        const isElectron = typeof window.electronAPI !== 'undefined';
        if (!isElectron) {
            await showAlert("Unavailable", "PoB2 Import is only available in the Desktop app.");
            return;
        }

        const code = await showPrompt("Import PoB2 Build", "Paste your PoB2 base64 build code here:");
        if (!code) return; // cancelled or empty

        try {
            const result = await window.electronAPI.importPob2(code);
            const passives = result.passives || result; // Backwards compatibility if needed
            window.buildState.passives = passives;
            
            if (result.className) {
                let targetText = result.className + " (General)";
                if (result.ascendancyName && result.ascendancyName !== "None") {
                    targetText = result.className + " (" + result.ascendancyName + ")";
                }
                
                const ascSelect = document.getElementById("meta-ascendancy");
                const matchedOpt = Array.from(ascSelect.options).find(opt => opt.textContent === targetText);
                
                if (matchedOpt) {
                    window.buildState.ascendancy = matchedOpt.value;
                } else {
                    window.buildState.ascendancy = result.ascendancyName && result.ascendancyName !== "None" ? result.ascendancyName : result.className;
                }
            } else {
                window.buildState.ascendancy = "";
            }
            
            if (result.skills && result.skills.length > 0) {
                window.buildState.skills = result.skills;
                // Clear selected element if it was a skill that no longer exists
                if (selectedElement && (selectedElement.type === 'skill' || selectedElement.type === 'support')) {
                    selectedElement = null;
                }
            }
            
            markAsDirty();
            updateUI(); // Important to update dropdowns and active class state
            renderSkillsGrid(); // Force re-render of skills grid
            
            if (window.renderTree) window.renderTree(); // If tree visualizer is active
            
            await showAlert("Success", `Successfully imported ${passives.length} passive nodes${result.className ? ' for ' + result.className : ''} from PoB2.`);
        } catch (err) {
            await showAlert("Error", "Failed to import: " + err.message);
        }
    });

    // Settings Modal
    const settingsModal = document.getElementById("settings-modal");
    document.getElementById("btn-settings").addEventListener("click", () => {
        settingsModal.classList.remove("hidden");
    });
    
    document.getElementById("btn-close-settings").addEventListener("click", () => {
        settingsModal.classList.add("hidden");
    });

    document.getElementById("btn-run-update-tree").addEventListener("click", async () => {
        const isElectron = typeof window.electronAPI !== 'undefined';
        if (!isElectron) {
            await showAlert("Unavailable", "Scripts can only be run in the Desktop app.");
            return;
        }
        
        const btn = document.getElementById("btn-run-update-tree");
        const originalText = btn.textContent;
        btn.textContent = "Updating... Please wait.";
        btn.disabled = true;

        try {
            const output = await window.electronAPI.updateSkilltree();
            await showAlert("Success", "Skill tree data successfully updated!\n\n" + output);
        } catch (err) {
            await showAlert("Error", "Failed to update skill tree data:\n" + err.message);
        } finally {
            btn.textContent = originalText;
            btn.disabled = false;
        }
    });

    document.getElementById("btn-run-update-gems").addEventListener("click", async () => {
        const isElectron = typeof window.electronAPI !== 'undefined';
        if (!isElectron) {
            await showAlert("Unavailable", "Scripts can only be run in the Desktop app.");
            return;
        }
        
        const btn = document.getElementById("btn-run-update-gems");
        const originalText = btn.textContent;
        btn.textContent = "Updating... Please wait.";
        btn.disabled = true;

        try {
            const output = await window.electronAPI.updateGems();
            await showAlert("Success", "Gem data successfully updated! Please restart the app or reload the UI.\n\n" + output);
        } catch (err) {
            await showAlert("Error", "Failed to update gem data:\n" + err.message);
        } finally {
            btn.textContent = originalText;
            btn.disabled = false;
        }
    });

    // Metadata changes
    document.getElementById("meta-name").addEventListener("input", (e) => {
        window.buildState.name = e.target.value;
        markAsDirty();
    });
    document.getElementById("meta-author").addEventListener("input", (e) => {
        window.buildState.author = e.target.value;
        markAsDirty();
    });
    
    document.getElementById("meta-ascendancy").addEventListener("change", (e) => {
        const select = e.target;
        const customInput = document.getElementById("meta-ascendancy-custom");
        
        if (select.value === "Custom") {
            customInput.classList.remove("hidden");
            window.buildState.ascendancy = customInput.value;
        } else {
            customInput.classList.add("hidden");
            window.buildState.ascendancy = select.value;
        }
        markAsDirty();
    });

    document.getElementById("meta-ascendancy-custom").addEventListener("input", (e) => {
        window.buildState.ascendancy = e.target.value;
        markAsDirty();
    });

    document.getElementById("meta-desc").addEventListener("input", (e) => {
        window.buildState.description = e.target.value;
        markAsDirty();
    });

    // Form inputs change syncing
    document.getElementById("edit-id").addEventListener("input", (e) => {
        if (!selectedElement) return;
        
        const val = e.target.value;
        if (selectedElement.type === 'skill') {
            window.buildState.skills[selectedElement.skillIndex].id = val;
            document.getElementById("editor-item-title").textContent = getGemDisplayName(val) || "Skill Socket";
        } else if (selectedElement.type === 'support') {
            const skill = window.buildState.skills[selectedElement.skillIndex];
            skill.support_skills[selectedElement.supportIndex].id = val;
            document.getElementById("editor-item-title").textContent = getGemDisplayName(val) || "Support Socket";
        }
        
        markAsDirty();
        renderLivePreview();
        renderSkillsGrid(); // refresh socket color
        showAutocompleteSuggestions(val);
    });

    document.getElementById("edit-unique-name").addEventListener("input", (e) => {
        if (!selectedElement || selectedElement.type !== 'slot') return;
        
        const slot = window.buildState.inventory_slots.find(x => x.inventory_id === selectedElement.id);
        slot.unique_name = e.target.value;
        
        markAsDirty();
        renderLivePreview();
        // Update grid name display
        const slotEl = document.getElementById(`slot-${selectedElement.id}`);
        if (slotEl) {
            const valEl = slotEl.querySelector(".eq-value");
            valEl.textContent = e.target.value || "Configured";
        }
    });

    // Level Inputs
    const updateLevelInterval = () => {
        if (!selectedElement) return;
        
        const minVal = parseInt(document.getElementById("edit-level-min").value);
        const maxVal = parseInt(document.getElementById("edit-level-max").value);
        
        let interval = null;
        if (!isNaN(minVal) || !isNaN(maxVal)) {
            const min = isNaN(minVal) ? 0 : minVal;
            const max = isNaN(maxVal) ? 100 : maxVal;
            interval = [min, max];
        }

        if (selectedElement.type === 'slot') {
            const slot = window.buildState.inventory_slots.find(x => x.inventory_id === selectedElement.id);
            slot.level_interval = interval;
        } else if (selectedElement.type === 'skill') {
            window.buildState.skills[selectedElement.skillIndex].level_interval = interval;
        } else if (selectedElement.type === 'support') {
            const skill = window.buildState.skills[selectedElement.skillIndex];
            skill.support_skills[selectedElement.supportIndex].level_interval = interval;
        }

        markAsDirty();
        renderLivePreview();
    };

    document.getElementById("edit-level-min").addEventListener("change", updateLevelInterval);
    document.getElementById("edit-level-max").addEventListener("change", updateLevelInterval);

    // Text editor change
    const textInput = document.getElementById("edit-text");
    textInput.addEventListener("input", (e) => {
        if (!selectedElement) return;
        
        const val = e.target.value;
        
        if (selectedElement.type === 'slot') {
            const slot = window.buildState.inventory_slots.find(x => x.inventory_id === selectedElement.id);
            slot.additional_text = val;
        } else if (selectedElement.type === 'skill') {
            window.buildState.skills[selectedElement.skillIndex].additional_text = val;
        } else if (selectedElement.type === 'support') {
            const skill = window.buildState.skills[selectedElement.skillIndex];
            skill.support_skills[selectedElement.supportIndex].additional_text = val;
        }

        document.getElementById("text-char-count").textContent = `${val.length}/1000`;
        markAsDirty();
        renderLivePreview();
    });

    // Delete gem elements (Skill / Support)
    document.getElementById("btn-delete-element").addEventListener("click", async () => {
        if (!selectedElement) return;
        
        if (selectedElement.type === 'skill') {
            if (await showConfirm("Delete Skill Gem", "Delete this entire skill slot and all its support links?")) {
                window.buildState.skills.splice(selectedElement.skillIndex, 1);
                selectedElement = null;
                markAsDirty();
                updateUI();
            }
        } else if (selectedElement.type === 'support') {
            if (await showConfirm("Delete Support Gem", "Delete this support gem link?")) {
                const skill = window.buildState.skills[selectedElement.skillIndex];
                skill.support_skills.splice(selectedElement.supportIndex, 1);
                selectedElement = null;
                markAsDirty();
                updateUI();
            }
        }
    });

    // Markup buttons wrappers
    document.querySelectorAll(".markup-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            if (!selectedElement) return;
            const tag = btn.getAttribute("data-tag");
            insertMarkupTag(tag);
        });
    });

    // Click outside autocomplete to hide it
    document.addEventListener("click", (e) => {
        if (!e.target.closest(".autocomplete-wrapper")) {
            hideAutocomplete();
        }
    });

    // Add Skill Button
    document.getElementById("btn-add-skill").addEventListener("click", () => {
        const newSkill = {
            id: "Metadata/Items/Gems/SkillGemNewSkill",
            level_interval: null,
            additional_text: "",
            support_skills: []
        };
        window.buildState.skills.push(newSkill);
        
        markAsDirty();
        
        // Select the newly added skill
        selectElement({
            type: 'skill',
            skillIndex: window.buildState.skills.length - 1,
            id: newSkill.id
        });
    });

    // Equipment Slots click handler
    document.querySelectorAll(".eq-slot").forEach(slot => {
        slot.addEventListener("click", () => {
            const slotId = slot.getAttribute("data-slot");
            selectElement({
                type: 'slot',
                id: slotId
            });
        });
    });
}

// 8. GEM CRUD OPERATIONS
function addSupportGem(skillIndex) {
    const skill = window.buildState.skills[skillIndex];
    if (!skill.support_skills) skill.support_skills = [];
    
    if (skill.support_skills.length >= 5) return; // Cap at 5 links

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
        if (selectedElement && selectedElement.skillIndex === skillIndex) {
            selectedElement = null;
        } else if (selectedElement && selectedElement.skillIndex > skillIndex) {
            // Shift index
            selectedElement.skillIndex--;
        }
        markAsDirty();
        updateUI();
    }
}

// Helper to insert formatting tags in text area
function insertMarkupTag(tag) {
    const textInput = document.getElementById("edit-text");
    const start = textInput.selectionStart;
    const end = textInput.selectionEnd;
    const text = textInput.value;

    const selectedText = text.substring(start, end);
    const replacement = `<${tag}>{${selectedText}}`;

    textInput.value = text.substring(0, start) + replacement + text.substring(end);
    
    // Put cursor inside the braces if no text was selected, or after tag
    textInput.focus();
    const newCursorPos = start + tag.length + 2 + selectedText.length;
    textInput.setSelectionRange(newCursorPos, newCursorPos);

    // Trigger input event to update preview
    const event = new Event('input', { bubbles: true });
    textInput.dispatchEvent(event);
}

// Mark current state as dirty
function markAsDirty() {
    if (!window.isDirty) {
        window.isDirty = true;
        const dirtyEl = document.getElementById("dirty-indicator");
        if (dirtyEl) dirtyEl.classList.remove("hidden");
    }
}

// 9. AUTOCOMPLETE ENGINE
function showAutocompleteSuggestions(query) {
    const sugContainer = document.getElementById("id-autocomplete-suggestions");
    if (!sugContainer || !selectedElement) return;

    if (!query || query.length < 1) {
        sugContainer.classList.add("hidden");
        return;
    }

    // Determine database depending on current selection type
    let db = [];
    if (selectedElement.type === 'skill') {
        db = activeGemsDb;
    } else if (selectedElement.type === 'support') {
        db = supportGemsDb;
    } else {
        sugContainer.classList.add("hidden");
        return; // No autocomplete for Slot ID
    }

    // Search query matching
    const qLower = query.toLowerCase();
    
    // Match by name or ID path
    const filtered = db.filter(item => {
        return item.name.toLowerCase().includes(qLower) || item.id.toLowerCase().includes(qLower);
    }).slice(0, 8); // Limit suggestions

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
            
            // Trigger selection update
            if (selectedElement.type === 'skill') {
                window.buildState.skills[selectedElement.skillIndex].id = item.id;
            } else if (selectedElement.type === 'support') {
                const skill = window.buildState.skills[selectedElement.skillIndex];
                skill.support_skills[selectedElement.supportIndex].id = item.id;
            }
            
            document.getElementById("editor-item-title").textContent = item.name;
            markAsDirty();
            renderLivePreview();
            renderSkillsGrid();
            sugContainer.classList.add("hidden");
        });

        sugContainer.appendChild(itemEl);
    });

    sugContainer.classList.remove("hidden");
}

function hideAutocomplete() {
    const sug = document.getElementById("id-autocomplete-suggestions");
    if (sug) sug.classList.add("hidden");
}

// 10. FILE OPERATION HANDLERS
async function handleOpenFile() {
    if (window.isDirty) {
        if (!(await showConfirm("Unsaved Changes", "You have unsaved changes. Open another build anyway?"))) return;
    }

    const isElectron = typeof window.electronAPI !== 'undefined';

    if (isElectron) {
        try {
            const result = await window.electronAPI.openBuildFile();
            if (result) {
                currentFilePath = result.filePath;
                loadBuildJson(result.content);
                console.log(`Loaded file: ${currentFilePath}`);
            }
        } catch (err) {
            await showAlert("Error", "Error loading build file: " + err.message);
        }
    } else {
        // Browser file upload dialog fallback
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.build, .json';
        input.onchange = e => {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onload = async event => {
                try {
                    const parsed = JSON.parse(event.target.result);
                    currentFilePath = file.name;
                    loadBuildJson(parsed);
                } catch (err) {
                    await showAlert("Invalid File", "Invalid JSON file selected.");
                }
            };
            reader.readAsText(file);
        };
        input.click();
    }
}

async function handleSaveFile() {
    const isElectron = typeof window.electronAPI !== 'undefined';
    const content = exportBuildJson();

    if (isElectron) {
        if (currentFilePath) {
            try {
                await window.electronAPI.saveBuildFile({
                    filePath: currentFilePath,
                    content: content
                });
                window.isDirty = false;
                updateUI();
                console.log("File saved successfully.");
            } catch (err) {
                await showAlert("Error", "Error saving build file: " + err.message);
            }
        } else {
            // Save as if first time saving
            await handleSaveFileAs();
        }
    } else {
        // Browser download fallback
        triggerJsonDownload(content, currentFilePath || "new_build.build");
    }
}

async function handleSaveFileAs() {
    const isElectron = typeof window.electronAPI !== 'undefined';
    const content = exportBuildJson();

    if (isElectron) {
        try {
            const defaultName = window.buildState.name ? `${window.buildState.name.toLowerCase().replace(/\s+/g, '_')}.build` : 'new_build.build';
            const result = await window.electronAPI.saveBuildFileAs({
                content: content,
                defaultFilename: defaultName
            });
            if (result) {
                currentFilePath = result.filePath;
                window.isDirty = false;
                updateUI();
                console.log(`File saved as: ${currentFilePath}`);
            }
        } catch (err) {
            await showAlert("Error", "Error saving build file as: " + err.message);
        }
    } else {
        // Browser download fallback
        triggerJsonDownload(content, "new_build.build");
    }
}

async function handleQuickSavePoE() {
    const isElectron = typeof window.electronAPI !== 'undefined';
    const content = exportBuildJson();
    
    // Clean filename
    const filename = window.buildState.name ? `${window.buildState.name.toLowerCase().replace(/[^a-z0-9_]/g, '')}.build` : 'my_build.build';

    if (isElectron) {
        try {
            const result = await window.electronAPI.saveToDefaultPath({
                content: content,
                filename: filename
            });
            if (result) {
                await showAlert("Success", `Successfully saved build to PoE2 path:\n${result.filePath}`);
                // If it wasn't saved elsewhere, set this as current file
                if (!currentFilePath) {
                    currentFilePath = result.filePath;
                }
                window.isDirty = false;
                checkPoePathStatus();
                updateUI();
            }
        } catch (err) {
            await showAlert("Error", "Error saving to PoE2 Default path: " + err.message);
        }
    } else {
        await showAlert("Unavailable", "Quick Save (PoE2 Path) is only available when running as an Electron Desktop app.\n\nDownloading file instead.");
        triggerJsonDownload(content, filename);
    }
}

// Helper to trigger browser JSON file download
function triggerJsonDownload(content, filename) {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(content, null, 4));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", filename);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    window.isDirty = false;
    updateUI();
}

// Custom async modal helper functions to prevent Electron input lockups
function showConfirm(title, message) {
    return new Promise((resolve) => {
        const modal = document.getElementById("custom-modal");
        const titleEl = document.getElementById("modal-title");
        const msgEl = document.getElementById("modal-message");
        const confirmBtn = document.getElementById("modal-btn-confirm");
        const cancelBtn = document.getElementById("modal-btn-cancel");

        titleEl.textContent = title;
        msgEl.textContent = message;
        
        cancelBtn.classList.remove("hidden");
        confirmBtn.textContent = "Confirm";

        const onConfirm = () => {
            cleanup();
            resolve(true);
        };

        const onCancel = () => {
            cleanup();
            resolve(false);
        };

        const cleanup = () => {
            confirmBtn.removeEventListener("click", onConfirm);
            cancelBtn.removeEventListener("click", onCancel);
            modal.classList.add("hidden");
        };

        confirmBtn.addEventListener("click", onConfirm);
        cancelBtn.addEventListener("click", onCancel);
        modal.classList.remove("hidden");
        confirmBtn.focus();
    });
}

function showAlert(title, message) {
    return new Promise((resolve) => {
        const modal = document.getElementById("custom-modal");
        const titleEl = document.getElementById("modal-title");
        const msgEl = document.getElementById("modal-message");
        const confirmBtn = document.getElementById("modal-btn-confirm");
        const cancelBtn = document.getElementById("modal-btn-cancel");

        titleEl.textContent = title;
        msgEl.textContent = message;
        
        cancelBtn.classList.add("hidden");
        confirmBtn.textContent = "OK";

        const onConfirm = () => {
            cleanup();
            resolve(true);
        };

        const cleanup = () => {
            confirmBtn.removeEventListener("click", onConfirm);
            modal.classList.add("hidden");
        };

        confirmBtn.addEventListener("click", onConfirm);
        modal.classList.remove("hidden");
        confirmBtn.focus();
    });
}

function showPrompt(title, message) {
    return new Promise((resolve) => {
        const modal = document.getElementById("custom-modal");
        const titleEl = document.getElementById("modal-title");
        const msgEl = document.getElementById("modal-message");
        const inputEl = document.getElementById("modal-input");
        const confirmBtn = document.getElementById("modal-btn-confirm");
        const cancelBtn = document.getElementById("modal-btn-cancel");

        titleEl.textContent = title;
        msgEl.textContent = message;
        inputEl.value = "";
        
        cancelBtn.classList.remove("hidden");
        inputEl.classList.remove("hidden");
        confirmBtn.textContent = "Import";

        const onConfirm = () => {
            const val = inputEl.value;
            cleanup();
            resolve(val);
        };

        const onCancel = () => {
            cleanup();
            resolve(null);
        };

        const cleanup = () => {
            confirmBtn.removeEventListener("click", onConfirm);
            cancelBtn.removeEventListener("click", onCancel);
            inputEl.classList.add("hidden");
            modal.classList.add("hidden");
        };

        confirmBtn.addEventListener("click", onConfirm);
        cancelBtn.addEventListener("click", onCancel);
        modal.classList.remove("hidden");
        inputEl.focus();
    });
}
