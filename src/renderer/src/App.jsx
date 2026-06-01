import React, { useState, useEffect } from 'react';
import { useBuildStore } from './store/useBuildStore';
import { fetchGemsDatabases, fetchAscendancies } from './utils/database';

// Components
import Header from './components/layout/Header';
import LeftPanel from './components/layout/LeftPanel';
import CenterPanel from './components/layout/CenterPanel';
import RightPanel from './components/layout/RightPanel';
import Footer from './components/layout/Footer';
import Modal from './components/common/Modal';
import GemTooltip from './components/common/GemTooltip';
import PassiveTreeHeader from './components/tree/PassiveTreeHeader';
import PassiveCanvas from './components/tree/PassiveCanvas';
import SettingsModal from './components/settings/SettingsModal';

export default function App() {
  const [dbLoaded, setDbLoaded] = useState(false);
  const [activeTab, setActiveTab] = useState('equipment'); // 'equipment' | 'tree'
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [disableMeta, setDisableMeta] = useState(true);

  const setDbs = useBuildStore((state) => state.setDbs);
  const setAscendancies = useBuildStore((state) => state.setAscendancies);

  // 1. Initialize databases on mount
  useEffect(() => {
    async function initDbs() {
      try {
        const { activeGemsDb, supportGemsDb, uniquesDb } = await fetchGemsDatabases();
        const ascendancies = await fetchAscendancies();
        
        setDbs(activeGemsDb, supportGemsDb, uniquesDb);
        setAscendancies(ascendancies);

        // Fetch initial disableMetaGems setting
        if (localStorage.getItem("disableMetaGems") === null) {
          localStorage.setItem("disableMetaGems", "true");
        }
        setDisableMeta(localStorage.getItem("disableMetaGems") === "true");

        setDbLoaded(true);
      } catch (err) {
        console.error("Database initialization failed:", err);
      }
    }
    initDbs();
  }, []);

  if (!dbLoaded) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        backgroundColor: '#0c0c0c',
        color: '#dfc190',
        fontFamily: "'Cinzel', serif"
      }}>
        <h2 style={{ letterSpacing: '2px', marginBottom: '15px' }}>PATH OF EXILE II</h2>
        <div className="spinner" style={{
          border: '4px solid rgba(223, 193, 144, 0.1)',
          width: '36px',
          height: '36px',
          borderRadius: '50%',
          borderLeftColor: '#dfc190',
          animation: 'spin 1s linear infinite'
        }}></div>
        <p style={{ marginTop: '15px', color: '#8c8270', fontSize: '0.9em' }}>Loading database entries...</p>
        <style dangerouslySetInnerHTML={{__html: `
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}} />
      </div>
    );
  }

  return (
    <div className="app-container flex-column" style={{ height: '100vh', overflow: 'hidden' }}>
      <Header 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        onOpenSettings={() => setSettingsOpen(true)}
      />

      {disableMeta && (
        <div id="meta-gems-warning" style={{
          background: 'rgba(168, 58, 58, 0.1)',
          border: '1px solid var(--gem-red)',
          color: '#ffb3b3',
          padding: '10px',
          margin: '15px 15px 0 15px',
          borderRadius: '4px',
          fontSize: '12px',
          textAlign: 'center'
        }}>
          <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" style={{ verticalAlign: 'text-bottom', marginRight: '4px' }}>
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
          </svg>
          Meta (Spirit) Gems are currently disabled in Settings.
        </div>
      )}

      {activeTab === 'equipment' ? (
        <div className="main-layout">
          <LeftPanel />
          <CenterPanel />
          <RightPanel />
        </div>
      ) : (
        <div className="main-layout">
          <div className="tree-container flex-column" style={{ flexGrow: 1, minWidth: 0 }}>
            <PassiveTreeHeader />
            <PassiveCanvas />
          </div>
          <RightPanel />
        </div>
      )}

      <Footer />

      <Modal />
      <GemTooltip />
      <SettingsModal 
        isOpen={settingsOpen} 
        onClose={() => setSettingsOpen(false)} 
        onMetaSettingChange={(checked) => setDisableMeta(checked)}
      />
    </div>
  );
}
