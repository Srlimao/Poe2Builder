import React from 'react';
import PropertiesEditor from '../editor/PropertiesEditor';
import LivePreview from '../editor/LivePreview';

export default function RightPanel() {
  return (
    <div className="right-panel flex-column">
      <div className="panel-section-title">Properties Editor</div>
      <PropertiesEditor />
      
      <div className="panel-section-title" style={{ marginTop: '20px' }}>In-game Live Preview</div>
      <LivePreview />
    </div>
  );
}
