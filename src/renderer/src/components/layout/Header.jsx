import React, { useState, useEffect } from 'react';
import { useBuildStore, showAlert, showConfirm, showPrompt, showPob2ImportOptions, showPob2ImportPrompt } from '../../store/useBuildStore';
import { loadBuildJson, exportBuildJson } from '../../utils/buildSerializer';
import { parsePob2Browser } from '../../utils/pob2Parser';

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

  const [menuOpen, setMenuOpen] = useState(false);
  const isElectron = typeof window.electronAPI !== 'undefined';

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

    if (isElectron) {
      try {
        const result = await window.electronAPI.openBuildFile();
        if (result) {
          setCurrentFilePath(result.filePath);
          const loaded = loadBuildJson(result.content);
          if (loaded) {
            setBuildState(loaded);
            setSelectedElement(null);
            setCurrentTreeIndex(0);
          }
        }
      } catch (err) {
        await showAlert("Error", "Error loading build file: " + err.message);
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
    if (isElectron) {
      if (currentFilePath) {
        try {
          await window.electronAPI.saveBuildFile({
            filePath: currentFilePath,
            content
          });
          setIsDirty(false);
        } catch (err) {
          await showAlert("Error", "Error saving build file: " + err.message);
        }
      } else {
        await handleSaveFileAs();
      }
    } else {
      triggerJsonDownload(content, currentFilePath || "new_build.build");
    }
  };

  const handleSaveFileAs = async () => {
    const content = exportBuildJson(buildState);
    if (isElectron) {
      try {
        const defaultName = buildState.name
          ? `${buildState.name.toLowerCase().replace(/\s+/g, '_')}.build`
          : 'new_build.build';
        const result = await window.electronAPI.saveBuildFileAs({
          content,
          defaultFilename: defaultName
        });
        if (result) {
          setCurrentFilePath(result.filePath);
          setIsDirty(false);
        }
      } catch (err) {
        await showAlert("Error", "Error saving build file as: " + err.message);
      }
    } else {
      triggerJsonDownload(content, "new_build.build");
    }
  };

  const handleQuickSavePoE = async () => {
    const content = exportBuildJson(buildState);
    const filename = buildState.name
      ? `${buildState.name.toLowerCase().replace(/[^a-z0-9_]/g, '')}.build`
      : 'my_build.build';

    if (isElectron) {
      try {
        const result = await window.electronAPI.saveToDefaultPath({ content, filename });
        if (result) {
          await showAlert("Success", `Successfully saved build to PoE2 path:\n${result.filePath}`);
          if (!currentFilePath) setCurrentFilePath(result.filePath);
          setIsDirty(false);
        }
      } catch (err) {
        await showAlert("Error", "Error saving to PoE2 Default path: " + err.message);
      }
    } else {
      await showAlert("Unavailable", "Quick Save (PoE2 Path) is only available when running as an Electron Desktop app.\n\nDownloading file instead.");
      triggerJsonDownload(content, filename);
    }
  };

  const handleImportPob2 = async () => {
    const inputs = await showPob2ImportPrompt(isElectron);
    if (!inputs) return;
    
    let { code, url } = inputs;

    code = (code || "").trim();
    url = (url || "").trim();
    
    if (!code && !url) return;

    if (url) {
      if (!isElectron) {
        await showAlert("Desktop Only", "Fetching builds directly from URLs is restricted by browser security (CORS). Please paste the raw base64 build code instead, or use the Desktop version of the app.");
        return;
      }

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

        const response = await fetch(fetchUrl);
        if (!response.ok) throw new Error(`HTTP error ${response.status}`);
        code = await response.text();
      } catch (e) {
        await showAlert("Error", "Could not fetch build from URL: " + e.message);
        return;
      }
    }

    try {
      let result;
      if (isElectron) {
        result = await window.electronAPI.importPob2(code);
      } else {
        result = await parsePob2Browser(code);
      }

      const options = await showPob2ImportOptions(result);
      if (!options) return;

      const activeGemsDb = useBuildStore.getState().activeGemsDb;
      const selectMatchedAscendancy = (className, ascendancyName) => {
        let targetText = className + " (General)";
        if (ascendancyName && ascendancyName !== "None") {
          targetText = className + " (" + ascendancyName + ")";
        }
        
        // Find standard options
        const ascendancies = useBuildStore.getState().ascendancies;
        const matched = ascendancies.find(asc => asc.name === targetText);
        if (matched) return matched.id;
        
        return ascendancyName && ascendancyName !== "None" ? ascendancyName : className;
      };

      // Apply options to state
      useBuildStore.setState((state) => {
        const nextState = { ...state.buildState };
        let nextTreeIndex = state.currentTreeIndex;
        let nextSelectedElement = state.selectedElement;

        if (options.selectedTrees && options.selectedTrees.length > 0) {
          if (options.resetAll) {
            nextState.passive_trees = [];
          }
          options.selectedTrees.forEach(idx => {
            const chosenPassives = result.trees[idx].passives;
            const mappedPassives = chosenPassives.map(p => typeof p === 'string' ? { id: p, additional_text: "" } : p);
            nextState.passive_trees.push({ level_interval: null, nodes: mappedPassives });
          });
          nextTreeIndex = nextState.passive_trees.length - 1;

          if (result.className) {
            nextState.ascendancy = selectMatchedAscendancy(result.className, result.ascendancyName);
          } else {
            nextState.ascendancy = "";
          }
        }

        if (options.selectedSkillSets && options.selectedSkillSets.length > 0) {
          if (options.resetAll) {
            nextState.skills = [];
          }
          options.selectedSkillSets.forEach(idx => {
            const chosenSkills = result.skillSets[idx].skills;
            if (chosenSkills && chosenSkills.length > 0) {
              nextState.skills.push(...chosenSkills);
            }
          });
          if (nextSelectedElement && (nextSelectedElement.type === 'skill' || nextSelectedElement.type === 'support')) {
            nextSelectedElement = null;
          }
        }

        if (options.selectedGearSets && options.selectedGearSets.length > 0) {
          if (options.resetAll) {
            nextState.inventory_slots = [];
          }
          options.selectedGearSets.forEach(idx => {
            const chosenGearset = result.itemSets[idx].inventory_slots;
            if (chosenGearset && chosenGearset.length > 0) {
              chosenGearset.forEach(newSlot => nextState.inventory_slots.push(newSlot));
            }
          });
          if (nextSelectedElement && nextSelectedElement.type === 'slot') {
            nextSelectedElement = null;
          }
        }

        return {
          buildState: nextState,
          currentTreeIndex: nextTreeIndex,
          selectedElement: nextSelectedElement,
          isDirty: true
        };
      });

      let msgs = [];
      if (options.selectedTrees && options.selectedTrees.length > 0) msgs.push(`${options.selectedTrees.length} passive trees`);
      if (options.selectedSkillSets && options.selectedSkillSets.length > 0) msgs.push(`${options.selectedSkillSets.length} skill sets`);
      if (options.selectedGearSets && options.selectedGearSets.length > 0) msgs.push(`${options.selectedGearSets.length} gear sets`);

      await showAlert("Success", `Successfully imported: ${msgs.join(', ')}.`);
    } catch (err) {
      await showAlert("Error", "Failed to import: " + err.message);
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
              <button 
                className="dropdown-item text-gold" 
                title="Quick save to PoE2 default path"
                onClick={() => { setMenuOpen(false); handleQuickSavePoE(); }}
              >
                Quick Save (PoE2)
              </button>
            </div>
          )}
        </div>

        <button className="btn btn-secondary btn-icon" title="Settings" onClick={onOpenSettings}>
          <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
            <path d="M19.14,12.94c0.04-0.3,0.06-0.61,0.06-0.94c0-0.32-0.02-0.64-0.06-0.94l2.03-1.58c0.18-0.14,0.23-0.41,0.12-0.61 l-1.92-3.32c-0.12-0.22-0.37-0.29-0.59-0.22l-2.39,0.96c-0.5-0.38-1.03-0.7-1.62-0.94L14.4,2.81c-0.04-0.24-0.24-0.41-0.48-0.41 h-3.84c-0.24,0-0.43,0.17-0.47,0.41L9.25,5.35C8.66,5.59,8.12,5.92,7.63,6.29L5.24,5.33c-0.22-0.08-0.47,0-0.59,0.22L2.73,8.87 C2.62,9.08,2.66,9.34,2.86,9.48l2.03,1.58C4.84,11.36,4.8,11.69,4.8,12s0.02,0.64,0.06,0.94l-2.03,1.58 c-0.18,0.14-0.23,0.41-0.12,0.61l1.92,3.32c0.12,0.22,0.37,0.29,0.59,0.22l2.39-0.96c0.5,0.38,1.03,0.7,1.62,0.94l0.36,2.54 c0.05,0.24,0.24,0.41,0.48,0.41h3.84c0.24,0,0.43-0.17,0.47-0.41l0.36-2.54c0.59-0.24,1.13-0.56,1.62-0.94l2.39,0.96 c0.22,0.08,0.47,0,0.59-0.22l1.92-3.32c0.12-0.22,0.07-0.49-0.12-0.61L19.14,12.94z M12,15.6c-1.98,0-3.6-1.62-3.6-3.6 s1.62-3.6,3.6-3.6s3.6,1.62,3.6,3.6S13.98,15.6,12,15.6z" />
          </svg>
        </button>

        {!isElectron && (
          <a 
            href="https://github.com/Srlimao/Poe2Builder/releases" 
            target="_blank" 
            rel="noopener noreferrer"
            className="btn btn-gold highlight-pulse" 
            id="btn-desktop-version"
            style={{ textDecoration: 'none' }}
          >
            Download Desktop App
          </a>
        )}
      </div>
    </header>
  );
}
