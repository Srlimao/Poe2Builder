// ============================================================
// fileHandlers.js — File open / save / export / download
// Depends on: state.js, buildSerializer.js, modals.js, ui.js
// ============================================================

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
                window.currentFilePath = result.filePath;
                loadBuildJson(result.content);
                console.log(`Loaded file: ${window.currentFilePath}`);
            }
        } catch (err) {
            await showAlert("Error", "Error loading build file: " + err.message);
        }
    } else {
        // Browser file upload dialog fallback
        const input = document.createElement('input');
        input.type   = 'file';
        input.accept = '.build, .json';
        input.onchange = e => {
            const file   = e.target.files[0];
            const reader = new FileReader();
            reader.onload = async event => {
                try {
                    const parsed = JSON.parse(event.target.result);
                    window.currentFilePath = file.name;
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
    const content    = exportBuildJson();

    if (isElectron) {
        if (window.currentFilePath) {
            try {
                await window.electronAPI.saveBuildFile({
                    filePath: window.currentFilePath,
                    content:  content
                });
                window.isDirty = false;
                updateUI();
                console.log("File saved successfully.");
            } catch (err) {
                await showAlert("Error", "Error saving build file: " + err.message);
            }
        } else {
            await handleSaveFileAs();
        }
    } else {
        triggerJsonDownload(content, window.currentFilePath || "new_build.build");
    }
}

async function handleSaveFileAs() {
    const isElectron = typeof window.electronAPI !== 'undefined';
    const content    = exportBuildJson();

    if (isElectron) {
        try {
            const defaultName = window.buildState.name
                ? `${window.buildState.name.toLowerCase().replace(/\s+/g, '_')}.build`
                : 'new_build.build';
            const result = await window.electronAPI.saveBuildFileAs({
                content:         content,
                defaultFilename: defaultName
            });
            if (result) {
                window.currentFilePath = result.filePath;
                window.isDirty = false;
                updateUI();
                console.log(`File saved as: ${window.currentFilePath}`);
            }
        } catch (err) {
            await showAlert("Error", "Error saving build file as: " + err.message);
        }
    } else {
        triggerJsonDownload(content, "new_build.build");
    }
}

async function handleQuickSavePoE() {
    const isElectron = typeof window.electronAPI !== 'undefined';
    const content    = exportBuildJson();

    const filename = window.buildState.name
        ? `${window.buildState.name.toLowerCase().replace(/[^a-z0-9_]/g, '')}.build`
        : 'my_build.build';

    if (isElectron) {
        try {
            const result = await window.electronAPI.saveToDefaultPath({ content, filename });
            if (result) {
                await showAlert("Success", `Successfully saved build to PoE2 path:\n${result.filePath}`);
                if (!window.currentFilePath) window.currentFilePath = result.filePath;
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

// Trigger a browser-side JSON file download
function triggerJsonDownload(content, filename) {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(content, null, 4));
    const a = document.createElement('a');
    a.setAttribute("href", dataStr);
    a.setAttribute("download", filename);
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.isDirty = false;
    updateUI();
}
