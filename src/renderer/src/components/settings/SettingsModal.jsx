import React, { useState, useEffect } from 'react';
import { showAlert } from '../../store/useBuildStore';

export default function SettingsModal({ isOpen, onClose, onMetaSettingChange }) {
  const [disableMeta, setDisableMeta] = useState(true);
  const [updatingTree, setUpdatingTree] = useState(false);
  const [updatingGems, setUpdatingGems] = useState(false);
  const [updatingUniques, setUpdatingUniques] = useState(false);

  const isElectron = typeof window.electronAPI !== 'undefined';

  useEffect(() => {
    if (localStorage.getItem("disableMetaGems") === null) {
      localStorage.setItem("disableMetaGems", "true");
    }
    const val = localStorage.getItem("disableMetaGems") === "true";
    setDisableMeta(val);
  }, [isOpen]);

  const handleDisableMetaChange = (e) => {
    const checked = e.target.checked;
    localStorage.setItem("disableMetaGems", checked ? "true" : "false");
    setDisableMeta(checked);
    if (onMetaSettingChange) {
      onMetaSettingChange(checked);
    }
  };

  const handleUpdateTree = async () => {
    if (!isElectron) {
      await showAlert("Unavailable", "Scripts can only be run in the Desktop app.");
      return;
    }
    setUpdatingTree(true);
    try {
      const output = await window.electronAPI.updateSkilltree();
      await showAlert("Success", "Skill tree data successfully updated!\n\n" + output);
    } catch (err) {
      await showAlert("Error", "Failed to update skill tree data:\n" + err.message);
    } finally {
      setUpdatingTree(false);
    }
  };

  const handleUpdateGems = async () => {
    if (!isElectron) {
      await showAlert("Unavailable", "Scripts can only be run in the Desktop app.");
      return;
    }
    setUpdatingGems(true);
    try {
      const output = await window.electronAPI.updateGems();
      await showAlert("Success", "Gem data successfully updated! Please restart the app or reload the UI.\n\n" + output);
    } catch (err) {
      await showAlert("Error", "Failed to update gem data:\n" + err.message);
    } finally {
      setUpdatingGems(false);
    }
  };

  const handleUpdateUniques = async () => {
    if (!isElectron) {
      await showAlert("Unavailable", "Scripts can only be run in the Desktop app.");
      return;
    }
    setUpdatingUniques(true);
    try {
      const output = await window.electronAPI.updateUniques();
      await showAlert("Success", "Unique items data successfully updated!\n\n" + output);
    } catch (err) {
      await showAlert("Error", "Failed to update unique items data:\n" + err.message);
    } finally {
      setUpdatingUniques(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" style={{ display: 'flex' }}>
      <div className="modal-content" style={{ maxWidth: '500px' }}>
        <div className="modal-border-top"></div>
        <h3 className="modal-title">App Settings</h3>

        <div className="settings-section" style={{ marginTop: '20px', textAlign: 'left' }}>
          <h4 style={{ color: 'var(--text-gold)', marginBottom: '10px' }}>General Options</h4>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', color: '#dfc190', fontSize: '13px' }}>
              <input 
                type="checkbox" 
                checked={disableMeta}
                onChange={handleDisableMetaChange}
              />
              Disable Meta (Spirit) Gems
            </label>
            <p style={{ color: '#8c8270', fontSize: '0.85em', marginTop: '5px', marginLeft: '24px' }}>
              Meta gems are currently unsupported by the official Build Planner. Check this to hide them from search (This may break the in-game build planner).
            </p>
          </div>

          <h4 style={{ color: 'var(--text-gold)', marginBottom: '10px' }}>Data Management</h4>
          
          <p style={{ color: '#8c8270', fontSize: '0.9em', marginBottom: '10px' }}>
            Fetch the latest passive skill tree mapping data from the official PoE2 export repository.
          </p>
          <button 
            className="btn btn-secondary" 
            style={{ width: '100%', marginBottom: '15px' }}
            disabled={updatingTree}
            onClick={handleUpdateTree}
          >
            {updatingTree ? "Updating... Please wait." : "Update Passive Skill Tree Data"}
          </button>

          <p style={{ color: '#8c8270', fontSize: '0.9em', marginBottom: '10px' }}>
            Fetch the latest skill and support gems data from the repoe-fork.
          </p>
          <button 
            className="btn btn-secondary" 
            style={{ width: '100%', marginBottom: '15px' }}
            disabled={updatingGems}
            onClick={handleUpdateGems}
          >
            {updatingGems ? "Updating... Please wait." : "Update Gem Data"}
          </button>

          <p style={{ color: '#8c8270', fontSize: '0.9em', marginBottom: '10px' }}>
            Fetch the latest unique items data from the repoe-fork.
          </p>
          <button 
            className="btn btn-secondary" 
            style={{ width: '100%' }}
            disabled={updatingUniques}
            onClick={handleUpdateUniques}
          >
            {updatingUniques ? "Updating... Please wait." : "Update Unique Items"}
          </button>
        </div>

        <div className="modal-buttons" style={{ marginTop: '30px' }}>
          <button className="btn btn-primary" onClick={onClose}>Close</button>
        </div>
        <div className="modal-border-bottom"></div>
      </div>
    </div>
  );
}
