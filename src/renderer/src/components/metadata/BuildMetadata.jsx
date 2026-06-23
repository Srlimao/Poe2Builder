import React, { useMemo } from 'react';
import { useBuildStore, showAlert, showConfirm, showPob2ImportPrompt, executePob2Import } from '../../store/useBuildStore';
import { loadBuildJson } from '../../utils/buildSerializer';
import { parsePob2 } from '../../utils/pob2Parser';

export default function BuildMetadata() {
  const buildState = useBuildStore((state) => state.buildState);
  const ascendancies = useBuildStore((state) => state.ascendancies);
  const updateMeta = useBuildStore((state) => state.updateMeta);

  // Store actions/states for file operations
  const isDirty = useBuildStore((state) => state.isDirty);
  const resetToNewBuild = useBuildStore((state) => state.resetToNewBuild);
  const setBuildState = useBuildStore((state) => state.setBuildState);
  const setCurrentFilePath = useBuildStore((state) => state.setCurrentFilePath);
  const setIsDirty = useBuildStore((state) => state.setIsDirty);
  const setSelectedElement = useBuildStore((state) => state.setSelectedElement);
  const setCurrentTreeIndex = useBuildStore((state) => state.setCurrentTreeIndex);

  const handleFieldChange = (field, val) => {
    updateMeta(field, val);
  };

  // Unique class list — uses pre-cleaned baseClass field from fetchAscendancies
  const classes = useMemo(() => {
    const seen = new Set();
    const result = [];
    for (const asc of ascendancies) {
      if (!seen.has(asc.baseClass)) {
        seen.add(asc.baseClass);
        result.push(asc.baseClass);
      }
    }
    return result;
  }, [ascendancies]);

  // Selected class comes from the stored ascendancy's baseClass field
  const selectedClass = buildState.ascendancy
    ? (ascendancies.find(a => a.id === buildState.ascendancy)?.baseClass
        ?? buildState.ascendancy.replace(/\d+[a-zA-Z]?$/, ''))
    : '';

  // Ascendancies filtered to the selected class
  const filteredAscendancies = useMemo(() => {
    if (!selectedClass) return [];
    return ascendancies.filter(asc => asc.baseClass === selectedClass);
  }, [ascendancies, selectedClass]);

  const handleClassChange = (e) => {
    const cls = e.target.value;
    // Default to first ascendancy of new class, or clear if no class
    const first = cls ? (ascendancies.find(a => a.baseClass === cls)?.id ?? '') : '';
    handleFieldChange('ascendancy', first);
  };

  const handleAscendancyChange = (e) => {
    handleFieldChange('ascendancy', e.target.value);
  };

  // --- File Handler Functions ---
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div className="metadata-card">
        <div className="metadata-form" style={{ padding: 0 }}>
          {/* Row 1: Build Name + Author side by side */}
          <div className="form-row">
            <div className="form-group" style={{ flex: 2 }}>
              <label htmlFor="meta-name">Build Name</label>
              <input
                type="text"
                id="meta-name"
                placeholder="e.g. Titan Warrior"
                className="form-control"
                value={buildState.name || ''}
                onChange={(e) => handleFieldChange('name', e.target.value)}
              />
            </div>

            <div className="form-group" style={{ flex: 1 }}>
              <label htmlFor="meta-author">Author</label>
              <input
                type="text"
                id="meta-author"
                placeholder="e.g. PlayerName"
                className="form-control"
                value={buildState.author || ''}
                onChange={(e) => handleFieldChange('author', e.target.value)}
              />
            </div>
          </div>

          {/* Row 2: Class + Ascendancy linked dropdowns */}
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="meta-class">Class</label>
              <select
                id="meta-class"
                className="form-control"
                value={selectedClass}
                onChange={handleClassChange}
              >
                <option value="">— Select Class —</option>
                {classes.map((cls) => (
                  <option key={cls} value={cls}>{cls}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="meta-ascendancy">Ascendancy</label>
              <select
                id="meta-ascendancy"
                className="form-control"
                value={buildState.ascendancy || ''}
                onChange={handleAscendancyChange}
                disabled={!selectedClass}
              >
                <option value="">— Select Ascendancy —</option>
                {/* shortName is pre-computed in fetchAscendancies — no on-the-fly transform needed */}
                {filteredAscendancies.map((asc) => (
                  <option key={asc.id} value={asc.id}>{asc.shortName}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Description */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label htmlFor="meta-desc">Description</label>
            <textarea
              id="meta-desc"
              rows={2}
              placeholder="Brief build summary..."
              className="form-control"
              value={buildState.description || ''}
              onChange={(e) => handleFieldChange('description', e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Quick Actions Grid */}
      <div className="metadata-card" style={{ marginTop: 0 }}>
        <div className="quick-actions-section">
          <div className="quick-actions-title">Quick Actions</div>
          <div className="quick-actions-grid">
            <div className="quick-action-card" onClick={handleNewBuild}>
              <div className="quick-action-icon">
                <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
                  <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
                </svg>
              </div>
              <span className="quick-action-label">New Build</span>
              <span className="quick-action-desc">Start a blank build guide</span>
            </div>

            <div className="quick-action-card" onClick={handleOpenFile}>
              <div className="quick-action-icon">
                <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
                  <path d="M20 6h-8l-2-2H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-6 10H6v-2h8v2zm4-4H6v-2h12v2z"/>
                </svg>
              </div>
              <span className="quick-action-label">Open File</span>
              <span className="quick-action-desc">Load a saved .build file</span>
            </div>

            <div className="quick-action-card" onClick={handleImportPob2}>
              <div className="quick-action-icon">
                <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
                  <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM19 18H6c-2.21 0-4-1.79-4-4 0-2.05 1.53-3.76 3.56-3.97l1.07-.11.5-.95C8.08 7.14 9.94 6 12 6c2.62 0 4.88 1.86 5.39 4.43l.3 1.5 1.53.11c1.56.1 2.78 1.41 2.78 2.96 0 1.65-1.35 3-3 3zm-5.55-8h-2.9v3H8l4 4 4-4h-2.55z"/>
                </svg>
              </div>
              <span className="quick-action-label">Import PoB2</span>
              <span className="quick-action-desc">Fetch from pobb.in link</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
