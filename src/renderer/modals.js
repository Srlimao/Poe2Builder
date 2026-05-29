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
        
        const lblPassives = document.getElementById("label-import-passives");
        const lblGems = document.getElementById("label-import-gems");
        
        const selTree = document.getElementById("sel-import-tree");
        const selTreeContainer = document.getElementById("pob2-tree-select-container");
        
        const selSkillSet = document.getElementById("sel-import-skillset");
        const selSkillSetContainer = document.getElementById("pob2-skillset-select-container");
        
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
        
        const updateLabels = () => {
            const selectedTreeIdx = parseInt(selTree.value) || 0;
            const passivesCount = trees[selectedTreeIdx].passives ? trees[selectedTreeIdx].passives.length : 0;
            lblPassives.textContent = `Import Passives (${passivesCount} nodes)`;
            
            const selectedSkillSetIdx = parseInt(selSkillSet.value) || 0;
            const skillsCount = skillSets[selectedSkillSetIdx].skills ? skillSets[selectedSkillSetIdx].skills.length : 0;
            lblGems.textContent = `Import Gems (${skillsCount} skills) (Replaces current skills)`;
        };
        
        selTree.addEventListener("change", updateLabels);
        selSkillSet.addEventListener("change", updateLabels);
        
        chkPassives.checked = true;
        chkAppend.checked = false;
        chkGems.checked = true;
        
        const updateAppendState = () => {
            chkAppend.disabled = !chkPassives.checked;
            if (!chkPassives.checked) chkAppend.checked = false;
            
            selTree.disabled = !chkPassives.checked;
            selSkillSet.disabled = !chkGems.checked;
        };
        
        chkPassives.addEventListener("change", updateAppendState);
        chkGems.addEventListener("change", updateAppendState);
        
        updateLabels();
        updateAppendState();

        const onConfirm = () => { 
            const options = {
                importPassives: chkPassives.checked,
                appendTree: chkAppend.checked,
                importGems: chkGems.checked,
                selectedTreeIndex: parseInt(selTree.value) || 0,
                selectedSkillSetIndex: parseInt(selSkillSet.value) || 0
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
            modal.classList.add("hidden");
        };

        confirmBtn.addEventListener("click", onConfirm);
        cancelBtn.addEventListener("click", onCancel);
        modal.classList.remove("hidden");
        confirmBtn.focus();
    });
}
