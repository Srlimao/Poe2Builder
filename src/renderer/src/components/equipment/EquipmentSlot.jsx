import React from 'react';
import { useBuildStore } from '../../store/useBuildStore';

export default function EquipmentSlot({ slot }) {
  const { id, label, iconClass } = slot;
  
  const inventory_slots = useBuildStore((state) => state.buildState.inventory_slots);
  const variants = inventory_slots.filter(x => x.inventory_id === id);
  
  const selectedElement = useBuildStore((state) => state.selectedElement);
  const setSelectedElement = useBuildStore((state) => state.setSelectedElement);

  const isSelected = selectedElement && selectedElement.type === 'slot' && selectedElement.id === id;
  const hasConfig = variants.some(v => v.additional_text || v.unique_name || v.level_interval);

  let valueText = "Empty";
  if (hasConfig) {
    if (variants.length > 1) {
      valueText = `Configured (${variants.length} Variants)`;
    } else {
      const slotState = variants[0];
      let displayText = slotState.unique_name || 
        (slotState.additional_text ? slotState.additional_text.trim().split('\n')[0] : '') || 
        "Configured";
      // Strip HTML/markup
      displayText = displayText.replace(/&lt;[^&]*&gt;|<[^>]*>/g, "");
      valueText = displayText;
    }
  }

  const handleClick = () => {
    setSelectedElement({
      type: 'slot',
      id: id,
      variantIndex: isSelected ? (selectedElement.variantIndex || 0) : 0
    });
  };

  const classNames = [
    'eq-slot',
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
