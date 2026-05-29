// ============================================================
// modals.js — Custom async modal dialog helpers
// Avoids native window.confirm/alert which lock Electron input.
// ============================================================

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

        const onConfirm = () => { cleanup(); resolve(true); };
        const onCancel  = () => { cleanup(); resolve(false); };

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

        const onConfirm = () => { cleanup(); resolve(true); };

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

        const onConfirm = () => { const val = inputEl.value; cleanup(); resolve(val); };
        const onCancel  = () => { cleanup(); resolve(null); };

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

function showPob2ImportOptions(result) {
    return new Promise((resolve) => {
        const modal = document.getElementById("pob2-import-modal");
        const confirmBtn = document.getElementById("pob2-import-btn-confirm");
        const cancelBtn = document.getElementById("pob2-import-btn-cancel");
        
        const chkPassives = document.getElementById("chk-import-passives");
        const chkAppend = document.getElementById("chk-import-append-tree");
        const chkGems = document.getElementById("chk-import-gems");
        const chkGear = document.getElementById("chk-import-gear");
        
        const lblPassives = document.getElementById("label-import-passives");
        const lblGems = document.getElementById("label-import-gems");
        
        const selTree = document.getElementById("sel-import-tree");
        const selTreeContainer = document.getElementById("pob2-tree-select-container");
        
        const selSkillSet = document.getElementById("sel-import-skillset");
        const selSkillSetContainer = document.getElementById("pob2-skillset-select-container");

        const selGearSet = document.getElementById("sel-import-gearset");
        const selGearSetContainer = document.getElementById("pob2-gearset-select-container");
        const chkGearAppend = document.getElementById("chk-import-gear-append");
        
        // Populate Tree Dropdown
        selTree.innerHTML = "";
        let trees = result.trees || [{ title: "Default Tree", passives: result.passives }];
        trees.forEach((t, i) => {
            const opt = document.createElement("option");
            opt.value = i;
            opt.textContent = `${t.title} (${t.passives ? t.passives.length : 0} nodes)`;
            selTree.appendChild(opt);
        });
        if (trees.length > 1) {
            selTreeContainer.classList.remove("hidden");
        } else {
            selTreeContainer.classList.add("hidden");
        }
        
        // Populate Skill Set Dropdown
        selSkillSet.innerHTML = "";
        let skillSets = result.skillSets || [{ title: "Default Skill Set", skills: result.skills }];
        skillSets.forEach((s, i) => {
            const opt = document.createElement("option");
            opt.value = i;
            opt.textContent = `${s.title} (${s.skills ? s.skills.length : 0} skills)`;
            selSkillSet.appendChild(opt);
        });
        if (skillSets.length > 1) {
            selSkillSetContainer.classList.remove("hidden");
        } else {
            selSkillSetContainer.classList.add("hidden");
        }
        
        // Populate Gear Set Dropdown
        selGearSet.innerHTML = "";
        let itemSets = result.itemSets || [{ title: "Default Item Set", inventory_slots: result.inventory_slots }];
        itemSets.forEach((s, i) => {
            const opt = document.createElement("option");
            opt.value = i;
            opt.textContent = `${s.title} (${s.inventory_slots ? s.inventory_slots.length : 0} items)`;
            selGearSet.appendChild(opt);
        });
        if (itemSets.length > 1) {
            selGearSetContainer.classList.remove("hidden");
        } else {
            selGearSetContainer.classList.add("hidden");
        }
        
        const updateLabels = () => {
            const selectedTreeIdx = parseInt(selTree.value) || 0;
            const passivesCount = trees[selectedTreeIdx].passives ? trees[selectedTreeIdx].passives.length : 0;
            lblPassives.textContent = `Import Passives (${passivesCount} nodes)`;
            
            const selectedSkillSetIdx = parseInt(selSkillSet.value) || 0;
            const skillsCount = skillSets[selectedSkillSetIdx].skills ? skillSets[selectedSkillSetIdx].skills.length : 0;
            lblGems.textContent = `Import Gems (${skillsCount} skills) (Replaces current skills)`;
            
            const selectedGearSetIdx = parseInt(selGearSet.value) || 0;
            const gearCount = itemSets[selectedGearSetIdx].inventory_slots ? itemSets[selectedGearSetIdx].inventory_slots.length : 0;
            const lblGear = document.getElementById("label-import-gear");
            if (lblGear) {
                lblGear.textContent = `Import Gear (${gearCount} items)`;
            }
        };
        
        selTree.addEventListener("change", updateLabels);
        selSkillSet.addEventListener("change", updateLabels);
        selGearSet.addEventListener("change", updateLabels);
        
        chkPassives.checked = true;
        chkAppend.checked = false;
        chkGems.checked = true;
        
        const updateAppendState = () => {
            chkAppend.disabled = !chkPassives.checked;
            if (!chkPassives.checked) chkAppend.checked = false;
            
            selTree.disabled = !chkPassives.checked;
            selSkillSet.disabled = !chkGems.checked;
            
            if (chkGearAppend) chkGearAppend.disabled = !(chkGear && chkGear.checked);
            if (!(chkGear && chkGear.checked) && chkGearAppend) chkGearAppend.checked = false;
            selGearSet.disabled = !(chkGear && chkGear.checked);
        };
        
        chkPassives.addEventListener("change", updateAppendState);
        chkGems.addEventListener("change", updateAppendState);
        if (chkGear) chkGear.addEventListener("change", updateAppendState);
        
        updateLabels();
        updateAppendState();

        const onConfirm = () => { 
            const options = {
                importPassives: chkPassives.checked,
                appendTree: chkAppend.checked,
                importGems: chkGems.checked,
                importGear: chkGear ? chkGear.checked : false,
                appendGear: chkGearAppend ? chkGearAppend.checked : false,
                selectedTreeIndex: parseInt(selTree.value) || 0,
                selectedSkillSetIndex: parseInt(selSkillSet.value) || 0,
                selectedGearSetIndex: parseInt(selGearSet.value) || 0
            };
            cleanup(); 
            resolve(options); 
        };
        const onCancel  = () => { cleanup(); resolve(null); };

        const cleanup = () => {
            confirmBtn.removeEventListener("click", onConfirm);
            cancelBtn.removeEventListener("click", onCancel);
            chkPassives.removeEventListener("change", updateAppendState);
            chkGems.removeEventListener("change", updateAppendState);
            selTree.removeEventListener("change", updateLabels);
            selSkillSet.removeEventListener("change", updateLabels);
            if (chkGear) chkGear.removeEventListener("change", updateAppendState);
            selGearSet.removeEventListener("change", updateLabels);
            modal.classList.add("hidden");
        };

        confirmBtn.addEventListener("click", onConfirm);
        cancelBtn.addEventListener("click", onCancel);
        modal.classList.remove("hidden");
        confirmBtn.focus();
    });
}
