import React, { useState, useEffect, useRef } from 'react';
import { useBuildStore } from '../../store/useBuildStore';

export default function Modal() {
  const modal = useBuildStore((state) => state.modal);
  const closeModal = useBuildStore((state) => state.closeModal);
  const [promptInput, setPromptInput] = useState('');
  const [promptInputUrl, setPromptInputUrl] = useState('');

  // POB2 Import State
  const [pob2Tab, setPob2Tab] = useState('passives');
  const [resetAll, setResetAll] = useState(false);
  const [selectedTrees, setSelectedTrees] = useState([]);
  const [selectedSkillSets, setSelectedSkillSets] = useState([]);
  const [selectedGearSets, setSelectedGearSets] = useState([]);

  // Auto-focus logic
  const confirmBtnRef = useRef(null);
  const promptInputRef = useRef(null);

  const buildState = useBuildStore((state) => state.buildState);

  useEffect(() => {
    if (modal) {
      if (modal.type === 'prompt' || modal.type === 'pob2-prompt') {
        setPromptInput('');
        setPromptInputUrl('');
        setTimeout(() => promptInputRef.current?.focus(), 50);
      } else {
        setTimeout(() => confirmBtnRef.current?.focus(), 50);
      }

      if (modal.type === 'pob2' && modal.pob2Result) {
        // Default select all
        setSelectedTrees((modal.pob2Result.trees || []).map((_, i) => i));
        setSelectedSkillSets((modal.pob2Result.skillSets || []).map((_, i) => i));
        setSelectedGearSets((modal.pob2Result.itemSets || []).map((_, i) => i));

        const isNewBuild = buildState.skills.length === 0 && 
                           buildState.passive_trees.length === 1 && 
                           buildState.passive_trees[0].nodes.length === 0;

        setResetAll(isNewBuild);
        setPob2Tab('passives');
      }
    }
  }, [modal, buildState]);

  if (!modal) return null;

  const handleConfirm = () => {
    if (modal.type === 'prompt') {
      closeModal(promptInput);
    } else if (modal.type === 'pob2-prompt') {
      closeModal({ code: promptInput, url: promptInputUrl });
    } else if (modal.type === 'pob2') {
      closeModal({
        resetAll,
        selectedTrees,
        selectedSkillSets,
        selectedGearSets
      });
    } else {
      closeModal(true);
    }
  };

  const handleCancel = () => {
    closeModal(null);
  };

  // Render generic Alert/Confirm/Prompt modals
  if (modal.type === 'alert' || modal.type === 'confirm' || modal.type === 'prompt') {
    return (
      <div className="modal-overlay">
        <div className="modal-content">
          <div className="modal-border-top"></div>
          <h3 className="modal-title">{modal.title}</h3>
          <p className="modal-message" dangerouslySetInnerHTML={{ __html: modal.message }}></p>

          {modal.type === 'prompt' && (
            <input
              type="text"
              ref={promptInputRef}
              className="form-control"
              placeholder="Enter text here..."
              value={promptInput}
              onChange={(e) => setPromptInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleConfirm(); }}
              style={{ marginBottom: '15px' }}
            />
          )}

          <div className="modal-buttons">
            {modal.type !== 'alert' && (
              <button className="btn btn-secondary" onClick={handleCancel}>Cancel</button>
            )}
            <button
              ref={confirmBtnRef}
              className="btn btn-gold"
              onClick={handleConfirm}
            >
              {modal.type === 'prompt' ? 'Import' : 'Confirm'}
            </button>
          </div>
          <div className="modal-border-bottom"></div>
        </div>
      </div>
    );
  }

  // Render pob2-prompt Modal
  if (modal.type === 'pob2-prompt') {
    return (
      <div className="modal-overlay">
        <div className="modal-content" style={{ minWidth: '400px' }}>
          <div className="modal-border-top"></div>
          <h3 className="modal-title">{modal.title}</h3>

          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', color: 'var(--text-gold)' }}>PoB Code:</label>
            <input
              type="text"
              ref={promptInputRef}
              className="form-control"
              placeholder="Paste Base64 build code..."
              value={promptInput}
              onChange={(e) => setPromptInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleConfirm(); }}
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', color: 'var(--text-gold)' }}>
              Or Link URL:
              {!modal.isElectron && <span style={{ color: 'var(--gem-red)', fontSize: '11px', marginLeft: '10px' }}>(Desktop App Only)</span>}
            </label>
            <input
              type="text"
              className="form-control"
              placeholder="https://pobb.in/..."
              value={promptInputUrl}
              onChange={(e) => {
                if (modal.isElectron) setPromptInputUrl(e.target.value);
              }}
              onKeyDown={(e) => { if (e.key === 'Enter' && modal.isElectron) handleConfirm(); }}
              disabled={!modal.isElectron}
              style={{ opacity: !modal.isElectron ? 0.5 : 1 }}
            />
            {modal.isElectron && (
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginTop: '5px' }}>
                Supported auto-links: pobb.in, poe.ninja, poe2db.tw, pastebin
              </span>
            )}
          </div>

          <div className="modal-buttons">
            <button className="btn btn-secondary" onClick={handleCancel}>Cancel</button>
            <button
              className="btn btn-gold"
              onClick={handleConfirm}
            >
              Import
            </button>
          </div>
          <div className="modal-border-bottom"></div>
        </div>
      </div>
    );
  }

  // Render POB2 Modal
  if (modal.type === 'pob2' && modal.pob2Result) {
    const res = modal.pob2Result;
    let buildNameStr = "Unknown Build";
    if (res.className) {
      buildNameStr = res.className;
      if (res.ascendancyName && res.ascendancyName !== "None") {
        buildNameStr += ` / ${res.ascendancyName}`;
      }
    }

    const toggleSelection = (index, type) => {
      if (type === 'passives') {
        setSelectedTrees(prev => prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]);
      } else if (type === 'gems') {
        setSelectedSkillSets(prev => prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]);
      } else if (type === 'gear') {
        setSelectedGearSets(prev => prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]);
      }
    };

    const trees = res.trees || [{ title: "Default Tree", passives: res.passives }];
    const skillSets = res.skillSets || [{ title: "Default Skill Set", skills: res.skills }];
    const itemSets = res.itemSets || [{ title: "Default Item Set", inventory_slots: res.inventory_slots }];

    return (
      <div className="modal-overlay">
        <div className="modal-content pob2-modal-content">
          <div className="pob2-modal-header">
            <div className="flex-between">
              <h3 className="pob2-modal-title">POB2 IMPORT OPTIONS</h3>
              <button className="pob2-modal-close" onClick={handleCancel} title="Close">×</button>
            </div>
            <div className="pob2-modal-subtitle">
              Build: <span className="text-gold-light">{buildNameStr}</span>
            </div>
          </div>

          <div className="pob2-reset-container">
            <label className="pob2-checkbox-label" style={{ cursor: 'pointer' }}>
              <input
                type="checkbox"
                className="pob2-checkbox-input"
                checked={resetAll}
                onChange={(e) => setResetAll(e.target.checked)}
              />
              <div className="pob2-checkbox-custom"></div>
              <div className="pob2-checkbox-text">
                <div className="pob2-checkbox-title text-gold">RESET ALL EXISTING BUILD COMPONENTS</div>
                <div className="pob2-checkbox-desc">Overwrites current setup entirely instead of appending as new variants</div>
              </div>
            </label>
          </div>

          <div className="pob2-tabs-nav">
            <button
              className={`pob2-tab-btn ${pob2Tab === 'passives' ? 'active' : ''}`}
              onClick={() => setPob2Tab('passives')}
            >
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '6px' }}>
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
              </svg>
              PASSIVES
            </button>
            <button
              className={`pob2-tab-btn ${pob2Tab === 'gems' ? 'active' : ''}`}
              onClick={() => setPob2Tab('gems')}
            >
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '6px' }}>
                <polygon points="12 2 2 7 12 12 22 7 12 2"></polygon>
                <polyline points="2 17 12 22 22 17"></polyline>
                <polyline points="2 12 12 17 22 12"></polyline>
              </svg>
              GEMS
            </button>
            <button
              className={`pob2-tab-btn ${pob2Tab === 'gear' ? 'active' : ''}`}
              onClick={() => setPob2Tab('gear')}
            >
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '6px' }}>
                <rect x="3" y="8" width="18" height="12" rx="2" ry="2"></rect>
                <line x1="8" y1="8" x2="8" y2="4"></line>
                <line x1="16" y1="8" x2="16" y2="4"></line>
              </svg>
              GEAR
            </button>
          </div>

          <div className="pob2-tabs-content">
            {pob2Tab === 'passives' && (
              <div className="pob2-tab-pane active">
                <div className="pob2-tab-info">
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="16" x2="12" y2="12"></line>
                    <line x1="12" y1="8" x2="12.01" y2="8"></line>
                  </svg>
                  <span>Select one or more passive tree progression tiers to import:</span>
                </div>
                <div className="pob2-cards-list">
                  {trees.map((t, idx) => (
                    <div
                      key={idx}
                      className={`pob2-card ${selectedTrees.includes(idx) ? 'selected' : ''}`}
                      onClick={() => toggleSelection(idx, 'passives')}
                    >
                      <label className="pob2-checkbox-label" style={{ pointerEvents: 'none' }}>
                        <input
                          type="checkbox"
                          className="pob2-checkbox-input"
                          checked={selectedTrees.includes(idx)}
                          readOnly
                        />
                        <div className="pob2-checkbox-custom"></div>
                      </label>
                      <div className="pob2-checkbox-text">
                        <div className="pob2-card-title">{t.title}</div>
                        <div className="pob2-card-desc">Allocates {t.passives ? t.passives.length : 0} nodes</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {pob2Tab === 'gems' && (
              <div className="pob2-tab-pane active">
                <div className="pob2-tab-info">
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="16" x2="12" y2="12"></line>
                    <line x1="12" y1="8" x2="12.01" y2="8"></line>
                  </svg>
                  <span>Select one or more skill sets to import:</span>
                </div>
                <div className="pob2-cards-list">
                  {skillSets.map((s, idx) => (
                    <div
                      key={idx}
                      className={`pob2-card ${selectedSkillSets.includes(idx) ? 'selected' : ''}`}
                      onClick={() => toggleSelection(idx, 'gems')}
                    >
                      <label className="pob2-checkbox-label" style={{ pointerEvents: 'none' }}>
                        <input
                          type="checkbox"
                          className="pob2-checkbox-input"
                          checked={selectedSkillSets.includes(idx)}
                          readOnly
                        />
                        <div className="pob2-checkbox-custom"></div>
                      </label>
                      <div className="pob2-checkbox-text">
                        <div className="pob2-card-title">{s.title}</div>
                        <div className="pob2-card-desc">Contains {s.skills ? s.skills.length : 0} skills</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {pob2Tab === 'gear' && (
              <div className="pob2-tab-pane active">
                <div className="pob2-tab-info">
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="16" x2="12" y2="12"></line>
                    <line x1="12" y1="8" x2="12.01" y2="8"></line>
                  </svg>
                  <span>Select one or more gear setups to import:</span>
                </div>
                <div className="pob2-cards-list">
                  {itemSets.map((s, idx) => (
                    <div
                      key={idx}
                      className={`pob2-card ${selectedGearSets.includes(idx) ? 'selected' : ''}`}
                      onClick={() => toggleSelection(idx, 'gear')}
                    >
                      <label className="pob2-checkbox-label" style={{ pointerEvents: 'none' }}>
                        <input
                          type="checkbox"
                          className="pob2-checkbox-input"
                          checked={selectedGearSets.includes(idx)}
                          readOnly
                        />
                        <div className="pob2-checkbox-custom"></div>
                      </label>
                      <div className="pob2-checkbox-text">
                        <div className="pob2-card-title">{s.title}</div>
                        <div className="pob2-card-desc">Contains {s.inventory_slots ? s.inventory_slots.length : 0} items</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="pob2-modal-footer flex-between">
            <div className="pob2-footer-left">Format: PoE2 .build</div>
            <div className="pob2-footer-right">
              <button className="btn btn-secondary" onClick={handleCancel}>CANCEL</button>
              <button
                ref={confirmBtnRef}
                className="btn btn-gold"
                style={{ background: 'linear-gradient(180deg, #dfc190 0%, #b3935b 100%)', color: '#000', fontWeight: '700' }}
                onClick={handleConfirm}
              >
                IMPORT SELECTED
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
