// ============================================================
// eventListeners.js — All DOM event bindings
// Depends on: state.js, modals.js, buildSerializer.js, editorPanel.js,
//             skillsRenderer.js, autocomplete.js, fileHandlers.js, ui.js
// ============================================================

// 7. EVENT LISTENERS

function setupEventListeners() {

    // --- Tab Navigation ---
    const tabEquipment = document.getElementById("tab-equipment");
    const tabTree      = document.getElementById("tab-tree");
    const leftPanel    = document.querySelector(".left-panel");
    const centerPanel  = document.querySelector(".center-panel");
    const treeOverlay  = document.getElementById("tree-visualizer-overlay");

    if (tabEquipment && tabTree && leftPanel && centerPanel && treeOverlay) {
        tabEquipment.addEventListener("click", () => {
            tabEquipment.classList.add("active");
            tabTree.classList.remove("active");
            leftPanel.classList.remove("hidden");
            centerPanel.classList.remove("hidden");
            treeOverlay.classList.add("hidden");
        });

        tabTree.addEventListener("click", () => {
            tabTree.classList.add("active");
            tabEquipment.classList.remove("active");
            leftPanel.classList.add("hidden");
            centerPanel.classList.add("hidden");
            treeOverlay.classList.remove("hidden");
            if (window.selectElement) window.selectElement(null);
            if (window.renderTreeVariantBar) window.renderTreeVariantBar();
            if (window.renderTree) window.renderTree();
        });
    }

    // --- File Menu Dropdown ---
    const fileMenuContainer = document.getElementById("file-menu-container");
    const fileDropdown      = document.getElementById("file-dropdown");
    const btnFileMenu       = document.getElementById("btn-file-menu");

    if (btnFileMenu && fileDropdown && fileMenuContainer) {
        btnFileMenu.addEventListener("click", (e) => {
            e.stopPropagation();
            fileDropdown.classList.toggle("hidden");
        });

        document.addEventListener("click", (e) => {
            if (!fileMenuContainer.contains(e.target)) {
                fileDropdown.classList.add("hidden");
            }
        });

        fileDropdown.querySelectorAll(".dropdown-item").forEach(item => {
            item.addEventListener("click", () => fileDropdown.classList.add("hidden"));
        });
    }

    // --- File Controls ---
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

    // --- PoB2 Import ---
    document.getElementById("btn-import-pob2").addEventListener("click", async () => {
        let code = await showPrompt(
            "Import PoB2 Build", 
            "Paste your PoB2 base64 build code or a link to it here:<br><span style='font-size: 0.85em; color: var(--text-muted); display: block; margin-top: 8px;'>Supported auto-links: pobb.in, poe.ninja, poe2db.tw, pastebin</span>"
        );
        if (!code) return;

        code = code.trim();
        if (code.match(/^https?:\/\//)) {
            try {
                let url = code;
                try {
                    const urlObj = new URL(code);
                    if ((urlObj.hostname === 'pobb.in' || urlObj.hostname === 'poe2db.tw') && !url.endsWith('/raw')) {
                        url = url.replace(/\/$/, '') + '/raw';
                    } else if (urlObj.hostname === 'pastebin.com' && !url.includes('/raw/')) {
                        url = url.replace('pastebin.com/', 'pastebin.com/raw/');
                    } else if (urlObj.hostname === 'poe.ninja' && !url.includes('/raw/')) {
                        url = url.replace('/poe2/pob/', '/pob/raw/').replace('/pob/', '/pob/raw/');
                    }
                } catch (e) {
                    // Ignore URL parsing errors, just try fetching the raw string
                }

                const response = await fetch(url);
                if (!response.ok) throw new Error(`HTTP error ${response.status}`);
                code = await response.text();
            } catch (e) {
                await showAlert("Error", "Could not fetch build from URL: " + e.message);
                return;
            }
        }

        try {
            let result;
            if (typeof window.electronAPI !== 'undefined') {
                result = await window.electronAPI.importPob2(code);
            } else if (typeof window.parsePob2Browser === 'function') {
                result = await window.parsePob2Browser(code);
            } else {
                throw new Error("PoB2 parser not available.");
            }

            const options = await showPob2ImportOptions(result);
            if (!options) return;

            if (options.selectedTrees && options.selectedTrees.length > 0) {
                if (options.resetAll) {
                    window.buildState.passive_trees = [];
                }
                options.selectedTrees.forEach(idx => {
                    const chosenPassives = result.trees[idx].passives;
                    const mappedPassives = chosenPassives.map(p => typeof p === 'string' ? { id: p, additional_text: "" } : p);
                    window.buildState.passive_trees.push({ level_interval: null, nodes: mappedPassives });
                });
                window.currentTreeIndex = window.buildState.passive_trees.length - 1;
                syncPassivesAlias();

                if (result.className) {
                    let targetText = result.className + " (General)";
                    if (result.ascendancyName && result.ascendancyName !== "None") {
                        targetText = result.className + " (" + result.ascendancyName + ")";
                    }
                    const ascSelect   = document.getElementById("meta-ascendancy");
                    const matchedOpt  = Array.from(ascSelect.options).find(opt => opt.textContent === targetText);

                    if (matchedOpt) {
                        window.buildState.ascendancy = matchedOpt.value;
                    } else {
                        window.buildState.ascendancy = result.ascendancyName && result.ascendancyName !== "None"
                            ? result.ascendancyName
                            : result.className;
                    }
                } else {
                    window.buildState.ascendancy = "";
                }
            }

            if (options.selectedSkillSets && options.selectedSkillSets.length > 0) {
                if (options.resetAll) {
                    window.buildState.skills = [];
                }
                options.selectedSkillSets.forEach(idx => {
                    const chosenSkills = result.skillSets[idx].skills;
                    if (chosenSkills && chosenSkills.length > 0) {
                        window.buildState.skills.push(...chosenSkills);
                    }
                });
                if (window.selectedElement && (window.selectedElement.type === 'skill' || window.selectedElement.type === 'support')) {
                    window.selectedElement = null;
                }
            }

            if (options.selectedGearSets && options.selectedGearSets.length > 0) {
                if (options.resetAll) {
                    window.buildState.inventory_slots = [];
                }
                options.selectedGearSets.forEach(idx => {
                    const chosenGearset = result.itemSets[idx].inventory_slots;
                    if (chosenGearset && chosenGearset.length > 0) {
                        chosenGearset.forEach(newSlot => window.buildState.inventory_slots.push(newSlot));
                    }
                });
                if (window.selectedElement && window.selectedElement.type === 'slot') {
                    window.selectedElement = null;
                }
            }

            markAsDirty();
            updateUI();
            renderSkillsGrid();
            if (window.renderTreeVariantBar) window.renderTreeVariantBar();
            if (window.renderTree) window.renderTree();

            let msgs = [];
            if (options.selectedTrees && options.selectedTrees.length > 0) msgs.push(`${options.selectedTrees.length} passive trees`);
            if (options.selectedSkillSets && options.selectedSkillSets.length > 0) msgs.push(`${options.selectedSkillSets.length} skill sets`);
            if (options.selectedGearSets && options.selectedGearSets.length > 0) msgs.push(`${options.selectedGearSets.length} gear sets`);

            await showAlert("Success", `Successfully imported: ${msgs.join(', ')}.`);
        } catch (err) {
            await showAlert("Error", "Failed to import: " + err.message);
        }
    });

    // --- Settings Modal ---
    const settingsModal = document.getElementById("settings-modal");
    document.getElementById("btn-settings").addEventListener("click", () => {
        settingsModal.classList.remove("hidden");
    });
    document.getElementById("btn-close-settings").addEventListener("click", () => {
        settingsModal.classList.add("hidden");
    });

    const chkDisableMeta = document.getElementById("setting-disable-meta-gems");
    const warningBanner  = document.getElementById("meta-gems-warning");
    
    const updateMetaWarning = (disabled) => {
        if (warningBanner) {
            if (disabled) warningBanner.classList.remove("hidden");
            else warningBanner.classList.add("hidden");
        }
    };

    if (chkDisableMeta) {
        // Default to true if not set
        if (localStorage.getItem("disableMetaGems") === null) {
            localStorage.setItem("disableMetaGems", "true");
        }
        const isMetaDisabled = localStorage.getItem("disableMetaGems") === "true";
        chkDisableMeta.checked = isMetaDisabled;
        updateMetaWarning(isMetaDisabled);

        chkDisableMeta.addEventListener("change", (e) => {
            localStorage.setItem("disableMetaGems", e.target.checked);
            updateMetaWarning(e.target.checked);
        });
    }

    document.getElementById("btn-run-update-tree").addEventListener("click", async () => {
        const isElectron = typeof window.electronAPI !== 'undefined';
        if (!isElectron) {
            await showAlert("Unavailable", "Scripts can only be run in the Desktop app.");
            return;
        }
        const btn          = document.getElementById("btn-run-update-tree");
        const originalText = btn.textContent;
        btn.textContent    = "Updating... Please wait.";
        btn.disabled       = true;
        try {
            const output = await window.electronAPI.updateSkilltree();
            await showAlert("Success", "Skill tree data successfully updated!\n\n" + output);
        } catch (err) {
            await showAlert("Error", "Failed to update skill tree data:\n" + err.message);
        } finally {
            btn.textContent = originalText;
            btn.disabled    = false;
        }
    });

    document.getElementById("btn-run-update-gems").addEventListener("click", async () => {
        const isElectron = typeof window.electronAPI !== 'undefined';
        if (!isElectron) {
            await showAlert("Unavailable", "Scripts can only be run in the Desktop app.");
            return;
        }
        const btn          = document.getElementById("btn-run-update-gems");
        const originalText = btn.textContent;
        btn.textContent    = "Updating... Please wait.";
        btn.disabled       = true;
        try {
            const output = await window.electronAPI.updateGems();
            await showAlert("Success", "Gem data successfully updated! Please restart the app or reload the UI.\n\n" + output);
        } catch (err) {
            await showAlert("Error", "Failed to update gem data:\n" + err.message);
        } finally {
            btn.textContent = originalText;
            btn.disabled    = false;
        }
    });

    document.getElementById("btn-run-update-uniques").addEventListener("click", async () => {
        const isElectron = typeof window.electronAPI !== 'undefined';
        if (!isElectron) {
            await showAlert("Unavailable", "Scripts can only be run in the Desktop app.");
            return;
        }
        const btn          = document.getElementById("btn-run-update-uniques");
        const originalText = btn.textContent;
        btn.textContent    = "Updating... Please wait.";
        btn.disabled       = true;
        try {
            const output = await window.electronAPI.updateUniques();
            await showAlert("Success", "Unique items data successfully updated!\n\n" + output);
        } catch (err) {
            await showAlert("Error", "Failed to update unique items data:\n" + err.message);
        } finally {
            btn.textContent = originalText;
            btn.disabled    = false;
        }
    });

    // --- Build Metadata Changes ---
    document.getElementById("meta-name").addEventListener("input", (e) => {
        window.buildState.name = e.target.value;
        markAsDirty();
    });

    document.getElementById("meta-author").addEventListener("input", (e) => {
        window.buildState.author = e.target.value;
        markAsDirty();
    });

    document.getElementById("meta-ascendancy").addEventListener("change", (e) => {
        const select      = e.target;
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

    // --- Editor: ID Input & Autocomplete ---
    document.getElementById("edit-id").addEventListener("input", (e) => {
        if (!window.selectedElement) return;
        const val = e.target.value;

        if (window.selectedElement.type === 'skill') {
            window.buildState.skills[window.selectedElement.skillIndex].id = val;
            document.getElementById("editor-item-title").textContent = getGemDisplayName(val) || "Skill Socket";
        } else if (window.selectedElement.type === 'support') {
            const skill = window.buildState.skills[window.selectedElement.skillIndex];
            skill.support_skills[window.selectedElement.supportIndex].id = val;
            document.getElementById("editor-item-title").textContent = getGemDisplayName(val) || "Support Socket";
        } else if (window.selectedElement.type === 'passive') {
            const passive = window.buildState.passives.find(p => p.id === window.selectedElement.id);
            if (passive) passive.id = val;
            window.selectedElement.id = val;
            document.getElementById("editor-item-title").textContent = (window.getPassiveNodeName && window.getPassiveNodeName(val)) || "Passive Node";
            if (window.renderTree) window.renderTree();
        }

        markAsDirty();
        renderLivePreview();
        renderSkillsGrid();
        showAutocompleteSuggestions(val);
    });

    // --- Editor: Variant Selector ---
    document.getElementById("variant-dropdown").addEventListener("change", (e) => {
        if (!window.selectedElement || window.selectedElement.type !== 'slot') return;
        window.selectedElement.variantIndex = parseInt(e.target.value);
        updateUI();
    });

    document.getElementById("btn-add-variant").addEventListener("click", () => {
        if (!window.selectedElement || window.selectedElement.type !== 'slot') return;
        window.buildState.inventory_slots.push({
            inventory_id: window.selectedElement.id,
            additional_text: ""
        });
        const variants = window.buildState.inventory_slots.filter(x => x.inventory_id === window.selectedElement.id);
        window.selectedElement.variantIndex = variants.length - 1;
        markAsDirty();
        updateUI();
    });

    // --- Editor: Unique Name ---
    document.getElementById("edit-unique-name").addEventListener("input", (e) => {
        if (!window.selectedElement || window.selectedElement.type !== 'slot') return;
        const variants = window.buildState.inventory_slots.filter(x => x.inventory_id === window.selectedElement.id);
        if (variants.length === 0) return;
        const slot = variants[window.selectedElement.variantIndex || 0];
        slot.unique_name = e.target.value;
        markAsDirty();
        renderLivePreview();
        const slotEl = document.getElementById(`slot-${window.selectedElement.id}`);
        if (slotEl) {
            slotEl.querySelector(".eq-value").textContent = e.target.value || "Configured";
        }
        showUniqueAutocompleteSuggestions(e.target.value);
    });

    // --- Editor: Level Interval ---
    const updateLevelInterval = () => {
        if (!window.selectedElement) return;
        const minVal = parseInt(document.getElementById("edit-level-min").value);
        const maxVal = parseInt(document.getElementById("edit-level-max").value);

        let interval = null;
        if (!isNaN(minVal) || !isNaN(maxVal)) {
            interval = [isNaN(minVal) ? 0 : minVal, isNaN(maxVal) ? 100 : maxVal];
        }

        if (window.selectedElement.type === 'slot') {
            const variants = window.buildState.inventory_slots.filter(x => x.inventory_id === window.selectedElement.id);
            if (variants.length > 0) {
                variants[window.selectedElement.variantIndex || 0].level_interval = interval;
                syncEditorForm();
            }
        } else if (window.selectedElement.type === 'skill') {
            window.buildState.skills[window.selectedElement.skillIndex].level_interval = interval;
        } else if (window.selectedElement.type === 'support') {
            const skill = window.buildState.skills[window.selectedElement.skillIndex];
            skill.support_skills[window.selectedElement.supportIndex].level_interval = interval;
        }

        markAsDirty();
        renderLivePreview();
    };

    document.getElementById("edit-level-min").addEventListener("change", updateLevelInterval);
    document.getElementById("edit-level-max").addEventListener("change", updateLevelInterval);

    // --- Editor: Additional Text ---
    document.getElementById("edit-text").addEventListener("input", (e) => {
        if (!window.selectedElement) return;
        const val = e.target.value;

        if (window.selectedElement.type === 'slot') {
            const variants = window.buildState.inventory_slots.filter(x => x.inventory_id === window.selectedElement.id);
            if (variants.length > 0) {
                variants[window.selectedElement.variantIndex || 0].additional_text = val;
            }
        } else if (window.selectedElement.type === 'skill') {
            window.buildState.skills[window.selectedElement.skillIndex].additional_text = val;
        } else if (window.selectedElement.type === 'support') {
            const skill = window.buildState.skills[window.selectedElement.skillIndex];
            skill.support_skills[window.selectedElement.supportIndex].additional_text = val;
        } else if (window.selectedElement.type === 'passive') {
            const passive = window.buildState.passives.find(p => p.id === window.selectedElement.id);
            if (passive) passive.additional_text = val;
        }

        document.getElementById("text-char-count").textContent = `${val.length}/1000`;
        markAsDirty();
        renderLivePreview();
    });

    // --- Editor: Delete Element ---
    document.getElementById("btn-delete-element").addEventListener("click", async () => {
        if (!window.selectedElement) return;

        if (window.selectedElement.type === 'slot') {
            if (await showConfirm("Delete Variant", "Delete this level variant configuration?")) {
                const allSlots = window.buildState.inventory_slots;
                let matchingIndices = [];
                allSlots.forEach((s, idx) => {
                    if (s.inventory_id === window.selectedElement.id) matchingIndices.push(idx);
                });
                const globalIdx = matchingIndices[window.selectedElement.variantIndex || 0];
                if (globalIdx !== undefined) {
                    allSlots.splice(globalIdx, 1);
                    window.selectedElement.variantIndex = Math.max(0, (window.selectedElement.variantIndex || 0) - 1);
                    markAsDirty();
                    updateUI();
                }
            }
        } else if (window.selectedElement.type === 'skill') {
            if (await showConfirm("Delete Skill Gem", "Delete this entire skill slot and all its support links?")) {
                window.buildState.skills.splice(window.selectedElement.skillIndex, 1);
                window.selectedElement = null;
                markAsDirty();
                updateUI();
            }
        } else if (window.selectedElement.type === 'support') {
            if (await showConfirm("Delete Support Gem", "Delete this support gem link?")) {
                const skill = window.buildState.skills[window.selectedElement.skillIndex];
                skill.support_skills.splice(window.selectedElement.supportIndex, 1);
                window.selectedElement = null;
                markAsDirty();
                updateUI();
            }
        } else if (window.selectedElement.type === 'passive') {
            if (await showConfirm("Unallocate Passive", "Unallocate this passive node?")) {
                const idx = window.buildState.passives.findIndex(p => p.id === window.selectedElement.id);
                if (idx > -1) window.buildState.passives.splice(idx, 1);
                window.selectedElement = null;
                markAsDirty();
                updateUI();
                if (window.renderTree) window.renderTree();
            }
        }
    });

    // --- Markup Helper Buttons ---
    document.querySelectorAll(".markup-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            if (!window.selectedElement) return;
            insertMarkupTag(btn.getAttribute("data-tag"));
        });
    });

    // --- Autocomplete dismiss ---
    document.addEventListener("click", (e) => {
        if (!e.target.closest(".autocomplete-wrapper")) {
            hideAutocomplete();
        }
    });

    // --- Add Skill Button ---
    document.getElementById("btn-add-skill").addEventListener("click", () => {
        const newSkill = {
            id: "Metadata/Items/Gems/SkillGemNewSkill",
            level_interval: null,
            additional_text: "",
            support_skills: []
        };
        window.buildState.skills.push(newSkill);
        markAsDirty();
        selectElement({
            type: 'skill',
            skillIndex: window.buildState.skills.length - 1,
            id: newSkill.id
        });
    });

    // --- Equipment Slot Click Handlers ---
    document.querySelectorAll(".eq-slot").forEach(slot => {
        slot.addEventListener("click", () => {
            const slotId = slot.getAttribute("data-slot");
            selectElement({ type: 'slot', id: slotId });
        });
    });

    // --- Skills Level Filter ---
    const skillsSlider = document.getElementById("skills-level-slider");
    const chkShowAll = document.getElementById("chk-skills-show-all");
    
    if (skillsSlider) {
        skillsSlider.addEventListener("input", () => {
            if (typeof window.filterSkillsGrid === 'function') {
                window.filterSkillsGrid();
            }
        });
    }
    
    if (chkShowAll) {
        chkShowAll.addEventListener("change", () => {
            if (typeof window.filterSkillsGrid === 'function') {
                window.filterSkillsGrid();
            }
        });
    }
}

