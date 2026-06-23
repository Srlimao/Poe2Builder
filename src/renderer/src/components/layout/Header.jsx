import React, { useState, useEffect } from 'react';
import { useBuildStore, showAlert, showConfirm, showPrompt, showPob2ImportOptions, showPob2ImportPrompt } from '../../store/useBuildStore';
import { loadBuildJson, exportBuildJson } from '../../utils/buildSerializer';
import { parsePob2 } from '../../utils/pob2Parser';
import { executePob2Import } from '../../store/useBuildStore';

export default function Header({ activeTab, setActiveTab, onOpenSettings }) {
  const buildState = useBuildStore((state) => state.buildState);
  const currentFilePath = useBuildStore((state) => state.currentFilePath);
  const isDirty = useBuildStore((state) => state.isDirty);
  const resetToNewBuild = useBuildStore((state) => state.resetToNewBuild);
  const setBuildState = useBuildStore((state) => state.setBuildState);
  const setCurrentFilePath = useBuildStore((state) => state.setCurrentFilePath);
  const setIsDirty = useBuildStore((state) => state.setIsDirty);
  const setSelectedElement = useBuildStore((state) => state.setSelectedElement);
  const setCurrentTreeIndex = useBuildStore((state) => state.setCurrentTreeIndex);

  const poeUser = useBuildStore((state) => state.poeUser);
  const uploadBuildToPoE = useBuildStore((state) => state.uploadBuildToPoE);
  const checkPoEAuthStatus = useBuildStore((state) => state.checkPoEAuthStatus);

  useEffect(() => {
    if (checkPoEAuthStatus) {
      checkPoEAuthStatus();
    }
  }, [checkPoEAuthStatus]);

  const handleUploadBuild = async () => {
    if (!poeUser) {
      await showAlert("Not Connected", "Please link your Path of Exile account in settings first.");
      return;
    }
    const confirm = await showConfirm("Upload Build", `Are you sure you want to upload this build to your PoE account (${poeUser.name})?`);
    if (!confirm) return;

    try {
      await uploadBuildToPoE();
      await showAlert("Success", "Build successfully uploaded to your Path of Exile account!");
    } catch (err) {
      await showAlert("Upload Failed", err.message);
    }
  };

  const [menuOpen, setMenuOpen] = useState(false);

  // Close menu when clicking outside
  useEffect(() => {
    const handleOutsideClick = () => setMenuOpen(false);
    window.addEventListener('click', handleOutsideClick);
    return () => window.removeEventListener('click', handleOutsideClick);
  }, []);

  const getFileName = (filePath) => {
    if (!filePath) return "Untitled.build";
    return filePath.split(/[/\\]/).pop();
  };

  // --- File Handlers ---
  const handleNewBuild = async () => {
    if (isDirty) {
      const confirm = await showConfirm("Unsaved Changes", "You have unsaved changes. Create a new build anyway?");
      if (!confirm) return;
    }
    resetToNewBuild();
  };

  const handleOpenFile = async () => {
    if (isDirty) {
      const confirm = await showConfirm("Unsaved Changes", "You have unsaved changes. Open another build anyway?");
      if (!confirm) return;
    }

    if (window.showOpenFilePicker) {
      try {
        const [handle] = await window.showOpenFilePicker({
          id: 'poe2-builds',
          startIn: 'documents',
          types: [{
            description: 'PoE2 Build File',
            accept: {'application/json': ['.build', '.json']},
          }],
        });
        const file = await handle.getFile();
        const text = await file.text();
        const parsed = JSON.parse(text);
        setCurrentFilePath(file.name);
        const loaded = loadBuildJson(parsed);
        if (loaded) {
          setBuildState(loaded);
          setSelectedElement(null);
          setCurrentTreeIndex(0);
        }
      } catch (err) {
        if (err.name !== 'AbortError') {
          await showAlert("Invalid File", "Invalid JSON file selected or read failed.");
        }
      }
    } else {
      // Browser file upload fallback
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.build, .json';
      input.onchange = (e) => {
        const file = e.target.files[0];
        const reader = new FileReader();
        reader.onload = async (event) => {
          try {
            const parsed = JSON.parse(event.target.result);
            setCurrentFilePath(file.name);
            const loaded = loadBuildJson(parsed);
            if (loaded) {
              setBuildState(loaded);
              setSelectedElement(null);
              setCurrentTreeIndex(0);
            }
          } catch (err) {
            await showAlert("Invalid File", "Invalid JSON file selected.");
          }
        };
        reader.readAsText(file);
      };
      input.click();
    }
  };

  const triggerJsonDownload = (content, filename) => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(content, null, 4));
    const a = document.createElement('a');
    a.setAttribute("href", dataStr);
    a.setAttribute("download", filename);
    document.body.appendChild(a);
    a.click();
    a.remove();
    setIsDirty(false);
  };

  const handleSaveFile = async () => {
    const content = exportBuildJson(buildState);
    const filename = currentFilePath || (buildState.name ? `${buildState.name.toLowerCase().replace(/[^a-z0-9_]/g, '')}.build` : "new_build.build");
    if (window.showSaveFilePicker) {
      try {
        const dataStr = JSON.stringify(content, null, 4);
        const handle = await window.showSaveFilePicker({
          suggestedName: filename,
          id: 'poe2-builds',
          startIn: 'documents',
          types: [{
            description: 'PoE2 Build File',
            accept: {'application/json': ['.build']},
          }],
        });
        const writable = await handle.createWritable();
        await writable.write(dataStr);
        await writable.close();
        setCurrentFilePath(handle.name);
        setIsDirty(false);
      } catch (err) {
        // User aborted
      }
    } else {
      triggerJsonDownload(content, filename);
    }
  };

  const handleSaveFileAs = async () => {
    const content = exportBuildJson(buildState);
    const filename = buildState.name ? `${buildState.name.toLowerCase().replace(/[^a-z0-9_]/g, '')}.build` : "new_build.build";
    if (window.showSaveFilePicker) {
      try {
        const dataStr = JSON.stringify(content, null, 4);
        const handle = await window.showSaveFilePicker({
          suggestedName: filename,
          id: 'poe2-builds',
          startIn: 'documents',
          types: [{
            description: 'PoE2 Build File',
            accept: {'application/json': ['.build']},
          }],
        });
        const writable = await handle.createWritable();
        await writable.write(dataStr);
        await writable.close();
        setCurrentFilePath(handle.name);
        setIsDirty(false);
      } catch (err) {
        // User aborted
      }
    } else {
      triggerJsonDownload(content, filename);
    }
  };


  const handleImportPob2 = async () => {
    const inputs = await showPob2ImportPrompt();
    if (!inputs) return;
    
    let { code, url } = inputs;

    code = (code || "").trim();
    url = (url || "").trim();
    
    if (!code && !url) return;

    if (url) {
      try {
        let fetchUrl = url;
        try {
          const urlObj = new URL(url);
          if ((urlObj.hostname === 'pobb.in' || urlObj.hostname === 'poe2db.tw') && !fetchUrl.endsWith('/raw')) {
            fetchUrl = fetchUrl.replace(/\/$/, '') + '/raw';
          } else if (urlObj.hostname === 'pastebin.com' && !fetchUrl.includes('/raw/')) {
            fetchUrl = fetchUrl.replace('pastebin.com/', 'pastebin.com/raw/');
          } else if (urlObj.hostname === 'poe.ninja' && !fetchUrl.includes('/raw/')) {
            fetchUrl = fetchUrl.replace('/poe2/pob/', '/pob/raw/').replace('/pob/', '/pob/raw/');
          }
        } catch (e) {
          // Ignore
        }

        const response = await fetch(`/api/pob2/fetch?url=${encodeURIComponent(fetchUrl)}`);
        if (!response.ok) throw new Error(`HTTP error ${response.status}`);
        code = await response.text();
      } catch (e) {
        await showAlert("Error", "Could not fetch build from URL: " + e.message);
        return;
      }
    }

    try {
      let result = await parsePob2(code);
      await executePob2Import(result);
    } catch (err) {
      await showAlert("Error", "Failed to parse or import: " + err.message);
    }
  };

  return (
    <header className="app-header">
      <div className="header-left" style={{ display: 'flex', alignItems: 'center' }}>
        <div>
          <h1 className="app-title">PATH OF EXILE II</h1>
          <span className="app-subtitle">BUILD PLANNER EDITOR</span>
        </div>
        <div className="file-info" style={{ marginLeft: '20px' }}>
          <span className="filename">{getFileName(currentFilePath)}</span>
          {isDirty && <span className="dirty-dot"></span>}
        </div>
      </div>

      <div className="header-center">
        <div className="main-tabs">
          <button 
            className={`tab-btn ${activeTab === 'build' ? 'active' : ''}`} 
            onClick={() => setActiveTab('build')}
          >
            Build Info
          </button>
          <button 
            className={`tab-btn ${activeTab === 'equipment' ? 'active' : ''}`} 
            onClick={() => setActiveTab('equipment')}
          >
            Equipment & Skills
          </button>
          <button 
            className={`tab-btn ${activeTab === 'tree' ? 'active' : ''}`}
            onClick={() => setActiveTab('tree')}
          >
            Passive Tree
          </button>
        </div>
      </div>

      <div className="header-right">
        {poeUser ? (
          <button 
            className="btn btn-gold" 
            title={`Upload build to PoE account: ${poeUser.name}`}
            onClick={handleUploadBuild}
            style={{ marginRight: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
              <path d="M4 19h16v2H4zm8-17L6.5 7.5l1.42 1.42L11 5.83V16h2V5.83l3.08 3.09 1.42-1.42z" />
            </svg>
            Upload Build
          </button>
        ) : (
          <button 
            className="btn btn-secondary" 
            title="Connect PoE account in settings to upload"
            onClick={() => showAlert("PoE Account Required", "Please open settings (⚙) and link your Path of Exile account first.")}
            style={{ marginRight: '8px', opacity: 0.6, display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
              <path d="M4 19h16v2H4zm8-17L6.5 7.5l1.42 1.42L11 5.83V16h2V5.83l3.08 3.09 1.42-1.42z" />
            </svg>
            Upload Build
          </button>
        )}

        <div className="dropdown" onClick={(e) => e.stopPropagation()}>
          <button 
            className="btn btn-secondary dropdown-toggle"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            File ▼
          </button>
          {menuOpen && (
            <div className="dropdown-menu">
              <button className="dropdown-item" onClick={() => { setMenuOpen(false); handleNewBuild(); }}>New Build</button>
              <button className="dropdown-item" onClick={() => { setMenuOpen(false); handleOpenFile(); }}>Open Build</button>
              <button className="dropdown-item" onClick={() => { setMenuOpen(false); handleImportPob2(); }}>Import PoB2</button>
              <div className="dropdown-divider"></div>
              <button className="dropdown-item" onClick={() => { setMenuOpen(false); handleSaveFile(); }}>Save</button>
              <button className="dropdown-item" onClick={() => { setMenuOpen(false); handleSaveFileAs(); }}>Save As...</button>
            </div>
          )}
        </div>

        <button className="btn btn-secondary btn-icon" title="Settings" onClick={onOpenSettings} style={{ marginLeft: '8px' }}>
          <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
            <path d="M19.14,12.94c0.04-0.3,0.06-0.61,0.06-0.94c0-0.32-0.02-0.64-0.06-0.94l2.03-1.58c0.18-0.14,0.23-0.41,0.12-0.61 l-1.92-3.32c-0.12-0.22-0.37-0.29-0.59-0.22l-2.39,0.96c-0.5-0.38-1.03-0.7-1.62-0.94L14.4,2.81c-0.04-0.24-0.24-0.41-0.48-0.41 h-3.84c-0.24,0-0.43,0.17-0.47,0.41L9.25,5.35C8.66,5.59,8.12,5.92,7.63,6.29L5.24,5.33c-0.22-0.08-0.47,0-0.59,0.22L2.73,8.87 C2.62,9.08,2.66,9.34,2.86,9.48l2.03,1.58C4.84,11.36,4.8,11.69,4.8,12s0.02,0.64,0.06,0.94l-2.03,1.58 c-0.18,0.14-0.23,0.41-0.12,0.61l1.92,3.32c0.12,0.22,0.37,0.29,0.59,0.22l2.39-0.96c0.5,0.38,1.03,0.7,1.62,0.94l0.36,2.54 c0.05,0.24,0.24,0.41,0.48,0.41h3.84c0.24,0,0.43-0.17,0.47-0.41l0.36-2.54c0.59-0.24,1.13-0.56,1.62-0.94l2.39,0.96 c0.22,0.08,0.47,0,0.59-0.22l1.92-3.32c0.12-0.22,0.07-0.49-0.12-0.61L19.14,12.94z M12,15.6c-1.98,0-3.6-1.62-3.6-3.6 s1.62-3.6,3.6-3.6s3.6,1.62,3.6,3.6S13.98,15.6,12,15.6z" />
          </svg>
        </button>
      </div>
    </header>
  );
}
