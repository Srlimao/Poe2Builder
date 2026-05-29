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
