import React, { useState } from 'react';
import { showAlert, useBuildStore } from '../../store/useBuildStore';

export default function SettingsModal({ isOpen, onClose }) {
  const debugMode = useBuildStore(state => state.debugMode);
  const setDebugMode = useBuildStore(state => state.setDebugMode);
  const theme = useBuildStore(state => state.theme);
  const setTheme = useBuildStore(state => state.setTheme);
  const poeUser = useBuildStore(state => state.poeUser);
  const poeLoading = useBuildStore(state => state.poeLoading);
  const loginWithPoE = useBuildStore(state => state.loginWithPoE);
  const logoutPoE = useBuildStore(state => state.logoutPoE);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" style={{ display: 'flex' }}>
      <div className="modal-content" style={{ maxWidth: '500px' }}>
        <div className="modal-border-top"></div>
        <h3 className="modal-title">App Settings</h3>

        <div className="settings-section" style={{ marginTop: '20px', textAlign: 'left' }}>
          <h4 style={{ color: 'var(--text-gold)', marginBottom: '10px' }}>General Settings</h4>
          
          <div style={{ marginBottom: '20px' }}>
            <label htmlFor="themeSelect" style={{ color: 'var(--text-muted)', marginBottom: '8px', fontSize: '0.9em', display: 'block', textTransform: 'uppercase', fontWeight: 600 }}>Active Theme</label>
            <select
              id="themeSelect"
              className="form-control"
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
              style={{ width: '100%' }}
            >
              <option value="default">Default RPG Gold</option>
              <option value="necrotic">Eldritch / Necrotic Green</option>
              <option value="glacial">Glacial / Frost Blue</option>
              <option value="crimson">Crimson / Vampiric Red</option>
              <option value="void">Cyberpunk / Void Purple</option>
            </select>
          </div>

          <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <input 
              type="checkbox" 
              id="debugModeToggle" 
              checked={debugMode} 
              onChange={(e) => setDebugMode(e.target.checked)} 
              style={{ accentColor: 'var(--text-gold)', width: '16px', height: '16px' }}
            />
            <label htmlFor="debugModeToggle" style={{ color: '#fff', cursor: 'pointer', fontSize: '0.95em' }}>Enable Developer Debug Mode (shows raw node data on hover)</label>
          </div>

          <h4 style={{ color: 'var(--text-gold)', marginBottom: '10px', marginTop: '25px' }}>Path of Exile Integration</h4>
          <p style={{ color: '#8c8270', fontSize: '0.9em', marginBottom: '15px' }}>
            Link your Path of Exile account to sync and upload your builds directly to your profile.
          </p>
          {poeLoading ? (
            <div style={{ color: '#fff', fontSize: '0.95em', padding: '10px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="spinner"></span> Waiting for authentication...
            </div>
          ) : poeUser ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#fff', fontSize: '0.95em' }}>
                <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#4caf50' }}></span>
                Linked Account: <strong style={{ color: 'var(--text-gold)' }}>{poeUser.name}</strong>
              </div>
              <button 
                className="btn btn-secondary" 
                onClick={logoutPoE}
                style={{ width: '100%' }}
              >
                Disconnect Account
              </button>
            </div>
          ) : (
            <button 
              className="btn btn-primary" 
              onClick={loginWithPoE}
              style={{ width: '100%' }}
            >
              Connect PoE Account
            </button>
          )}

          <h4 style={{ color: 'var(--text-gold)', marginBottom: '10px', marginTop: '30px' }}>Developer Database CLI</h4>
          <p style={{ color: '#8c8270', fontSize: '0.9em', marginBottom: '10px' }}>
            To update the local JSON database files, run these Node scripts in the project directory:
          </p>
          <div style={{ backgroundColor: '#1a1a1a', padding: '10px', borderRadius: '4px', fontFamily: 'monospace', fontSize: '0.85em', color: '#ccc', lineHeight: '1.6' }}>
            <div>npm run update-tree <span style={{ color: '#666' }}># passive tree mapping</span></div>
            <div>npm run update-gems <span style={{ color: '#666' }}># skill/support gems</span></div>
            <div>npm run update-uniques <span style={{ color: '#666' }}># unique items dataset</span></div>
          </div>
        </div>

        <div className="modal-buttons" style={{ marginTop: '30px' }}>
          <button className="btn btn-primary" onClick={onClose}>Close</button>
        </div>
        <div className="modal-border-bottom"></div>
      </div>
    </div>
  );
}
