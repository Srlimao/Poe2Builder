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
        msgEl.innerHTML = message;

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
        msgEl.innerHTML = message;

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
        msgEl.innerHTML = message;
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
        const closeBtn = document.getElementById("pob2-import-btn-close");
        
        const subtitle = document.getElementById("pob2-import-subtitle");
        let buildNameStr = "Unknown Build";
        if (result.className) {
            buildNameStr = result.className;
            if (result.ascendancyName && result.ascendancyName !== "None") {
                buildNameStr += ` / ${result.ascendancyName}`;
            }
        }
        subtitle.textContent = buildNameStr;
        
        const chkResetAll = document.getElementById("chk-import-reset-all");
        chkResetAll.checked = false;
        
        const tabBtns = document.querySelectorAll(".pob2-tab-btn");
        const tabPanes = document.querySelectorAll(".pob2-tab-pane");
        
        const switchTab = (tabId) => {
            tabBtns.forEach(btn => btn.classList.toggle("active", btn.dataset.tab === tabId));
            tabPanes.forEach(pane => pane.classList.toggle("hidden", pane.id !== `pob2-tab-${tabId}`));
        };
        
        tabBtns.forEach(btn => {
            btn.onclick = () => switchTab(btn.dataset.tab);
        });
        
        const createCard = (title, desc, isSelected = true) => {
            const card = document.createElement("div");
            card.className = `pob2-card ${isSelected ? 'selected' : ''}`;
            
            const checkboxLabel = document.createElement("label");
            checkboxLabel.className = "pob2-checkbox-label";
            checkboxLabel.style.pointerEvents = "none";
            
            const checkbox = document.createElement("input");
            checkbox.type = "checkbox";
            checkbox.className = "pob2-checkbox-input";
            checkbox.checked = isSelected;
            
            const customBox = document.createElement("div");
            customBox.className = "pob2-checkbox-custom";
            
            const textContainer = document.createElement("div");
            textContainer.className = "pob2-checkbox-text";
            
            const titleEl = document.createElement("div");
            titleEl.className = "pob2-card-title";
            titleEl.textContent = title;
            
            const descEl = document.createElement("div");
            descEl.className = "pob2-card-desc";
            descEl.textContent = desc;
            
            textContainer.appendChild(titleEl);
            textContainer.appendChild(descEl);
            
            checkboxLabel.appendChild(checkbox);
            checkboxLabel.appendChild(customBox);
            
            card.appendChild(checkboxLabel);
            card.appendChild(textContainer);
            
            card.onclick = () => {
                checkbox.checked = !checkbox.checked;
                card.classList.toggle("selected", checkbox.checked);
            };
            
            return { card, checkbox };
        };
        
        const passivesList = document.getElementById("pob2-passives-list");
        passivesList.innerHTML = "";
        let trees = result.trees || [{ title: "Default Tree", passives: result.passives }];
        const treeCheckboxes = [];
        trees.forEach((t, i) => {
            const { card, checkbox } = createCard(t.title, `Allocates ${t.passives ? t.passives.length : 0} nodes`, true);
            passivesList.appendChild(card);
            treeCheckboxes.push(checkbox);
        });
        
        const gemsList = document.getElementById("pob2-gems-list");
        gemsList.innerHTML = "";
        let skillSets = result.skillSets || [{ title: "Default Skill Set", skills: result.skills }];
        const gemCheckboxes = [];
        skillSets.forEach((s, i) => {
            const { card, checkbox } = createCard(s.title, `Contains ${s.skills ? s.skills.length : 0} skills`, true);
            gemsList.appendChild(card);
            gemCheckboxes.push(checkbox);
        });
        
        const gearList = document.getElementById("pob2-gear-list");
        gearList.innerHTML = "";
        let itemSets = result.itemSets || [{ title: "Default Item Set", inventory_slots: result.inventory_slots }];
        const gearCheckboxes = [];
        itemSets.forEach((s, i) => {
            const { card, checkbox } = createCard(s.title, `Contains ${s.inventory_slots ? s.inventory_slots.length : 0} items`, true);
            gearList.appendChild(card);
            gearCheckboxes.push(checkbox);
        });

        switchTab("passives");
        
        const cleanup = () => {
            confirmBtn.removeEventListener("click", onConfirm);
            cancelBtn.removeEventListener("click", onCancel);
            if (closeBtn) closeBtn.removeEventListener("click", onCancel);
            tabBtns.forEach(btn => btn.onclick = null);
            modal.classList.add("hidden");
        };

        const onConfirm = () => { 
            const selectedTrees = [];
            treeCheckboxes.forEach((cb, i) => { if (cb.checked) selectedTrees.push(i); });
            
            const selectedSkillSets = [];
            gemCheckboxes.forEach((cb, i) => { if (cb.checked) selectedSkillSets.push(i); });
            
            const selectedGearSets = [];
            gearCheckboxes.forEach((cb, i) => { if (cb.checked) selectedGearSets.push(i); });

            const options = {
                resetAll: chkResetAll.checked,
                selectedTrees,
                selectedSkillSets,
                selectedGearSets
            };
            cleanup(); 
            resolve(options); 
        };
        const onCancel  = () => { cleanup(); resolve(null); };

        confirmBtn.addEventListener("click", onConfirm);
        cancelBtn.addEventListener("click", onCancel);
        if (closeBtn) closeBtn.addEventListener("click", onCancel);
        
        modal.classList.remove("hidden");
        confirmBtn.focus();
    });
}
