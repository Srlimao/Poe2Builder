import React from 'react';
import BuildMetadata from '../metadata/BuildMetadata';
import EquipmentGrid from '../equipment/EquipmentGrid';
import EquipmentSetHeader from '../equipment/EquipmentSetHeader';

export default function LeftPanel() {
  return (
    <div className="left-panel flex-column">
      <div className="panel-section-title">Character Metadata</div>
      <BuildMetadata />

      <div className="panel-section-title">Equipment Slots</div>
      <EquipmentSetHeader />
      <EquipmentGrid />
    </div>
  );
}
