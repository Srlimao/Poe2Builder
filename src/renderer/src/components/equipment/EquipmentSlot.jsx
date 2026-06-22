import React from 'react';
import { useBuildStore } from '../../store/useBuildStore';

export default function EquipmentSlot({ slot }) {
  const { id, label, iconClass } = slot;
  
  const equipment_sets = useBuildStore((state) => state.buildState.equipment_sets);
  const currentEquipmentSetIndex = useBuildStore((state) => state.currentEquipmentSetIndex);
  const currentSet = equipment_sets[currentEquipmentSetIndex] || equipment_sets[0];
  const slotState = currentSet?.slots?.find(x => x.inventory_id === id);
  
  const selectedElement = useBuildStore((state) => state.selectedElement);
  const setSelectedElement = useBuildStore((state) => state.setSelectedElement);

  const isSelected = selectedElement && selectedElement.type === 'slot' && selectedElement.id === id;
  const hasConfig = slotState && (slotState.additional_text || slotState.unique_name);

  let valueText = "Empty";
  if (hasConfig) {
    let displayText = slotState.unique_name || 
      (slotState.additional_text ? slotState.additional_text.trim().split('\n')[0] : '') || 
      "Configured";
    // Strip HTML/markup
    displayText = displayText.replace(/&lt;[^&]*&gt;|<[^>]*>/g, "");
    valueText = displayText;
  }

  const handleClick = () => {
    setSelectedElement({
      type: 'slot',
      id: id
    });
  };

  const classNames = [
    'eq-slot',
    `eq-slot-${id.toLowerCase()}`,
    isSelected ? 'active' : '',
    hasConfig ? 'configured' : ''
  ].filter(Boolean).join(' ');

  return (
    <div className={classNames} onClick={handleClick}>
      <div className={`eq-icon ${iconClass}`}></div>
      <div className="eq-label">{label}</div>
      <div className="eq-value">{valueText}</div>
    </div>
  );
}
