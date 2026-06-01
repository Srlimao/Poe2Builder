import React from 'react';
import BuildMetadata from '../metadata/BuildMetadata';
import EquipmentGrid from '../equipment/EquipmentGrid';

export default function LeftPanel() {
  return (
    <div className="left-panel flex-column">
      <div className="panel-section-title">Character Metadata</div>
      <BuildMetadata />
      
      <div className="panel-section-title" style={{ marginTop: '20px' }}>Equipment Slots</div>
      <EquipmentGrid />
    </div>
  );
}
