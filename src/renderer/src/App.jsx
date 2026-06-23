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
import BuildMetadata from './components/metadata/BuildMetadata';
import Changelog from './components/metadata/Changelog';
import KoFiButton from './components/common/KoFiButton';

export default function App() {
  const [dbLoaded, setDbLoaded] = useState(false);
  const [activeTab, setActiveTab] = useState('build'); // 'build' | 'equipment' | 'tree'
  const [settingsOpen, setSettingsOpen] = useState(false);

  const setDbs = useBuildStore((state) => state.setDbs);
  const setAscendancies = useBuildStore((state) => state.setAscendancies);
  const theme = useBuildStore((state) => state.theme);

  // Apply theme class to document body
  useEffect(() => {
    document.body.className = `theme-${theme}`;
  }, [theme]);

  // 1. Initialize databases on mount
  useEffect(() => {
    async function initDbs() {
      try {
        const { activeGemsDb, supportGemsDb, uniquesDb } = await fetchGemsDatabases();
        const ascendancies = await fetchAscendancies();
        
        setDbs(activeGemsDb, supportGemsDb, uniquesDb);
        setAscendancies(ascendancies);


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
        <h1 style={{ letterSpacing: '2px', marginBottom: '15px' }}>PATH OF EXILE II</h1>
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


      {activeTab === 'build' ? (
        <div className="main-layout">
          <div className="left-panel flex-column">
            <Changelog />
          </div>
          <div className="center-panel flex-column" style={{ padding: '20px', overflowY: 'auto' }}>
            <h2 className="panel-section-title" style={{ margin: '-20px -20px 20px -20px' }}>Build Guide Configuration</h2>
            <div style={{ maxWidth: '600px', margin: '0 auto', width: '100%' }}>
              <BuildMetadata />
            </div>
          </div>
          <div className="right-panel flex-column" style={{ justifyContent: 'flex-end', alignItems: 'flex-end', padding: '15px' }}>
            <KoFiButton />
          </div>
        </div>
      ) : activeTab === 'equipment' ? (
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

      <SettingsModal 
        isOpen={settingsOpen} 
        onClose={() => setSettingsOpen(false)} 
      />
      <GemTooltip />
      <Modal />
    </div>
  );
}
