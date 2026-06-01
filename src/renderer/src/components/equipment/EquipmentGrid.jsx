import React from 'react';
import { standardSlots } from '../../utils/constants';
import EquipmentSlot from './EquipmentSlot';

export default function EquipmentGrid() {
  return (
    <div className="equipment-grid">
      {standardSlots.map((slot) => (
        <EquipmentSlot key={slot.id} slot={slot} />
      ))}
    </div>
  );
}
