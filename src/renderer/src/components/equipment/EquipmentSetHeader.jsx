import React from 'react';
import { useBuildStore, showConfirm } from '../../store/useBuildStore';

export default function EquipmentSetHeader() {
  const equipment_sets = useBuildStore((state) => state.buildState.equipment_sets);
  const currentEquipmentSetIndex = useBuildStore((state) => state.currentEquipmentSetIndex);
  
  const setCurrentEquipmentSetIndex = useBuildStore((state) => state.setCurrentEquipmentSetIndex);
  const addEquipmentSet = useBuildStore((state) => state.addEquipmentSet);
  const duplicateEquipmentSet = useBuildStore((state) => state.duplicateEquipmentSet);
  const deleteEquipmentSet = useBuildStore((state) => state.deleteEquipmentSet);
  const updateEquipmentSetInterval = useBuildStore((state) => state.updateEquipmentSetInterval);

  const currentSet = equipment_sets[currentEquipmentSetIndex] || equipment_sets[0];

  const buildSetLabel = (set, index) => {
    let label = `Variant ${index + 1}`;
    if (set.level_interval && Array.isArray(set.level_interval)) {
      const [min, max] = set.level_interval;
      if (min === 0 && max === 100) label += " (All Levels)";
      else if (max === 100)         label += ` (Lvl ${min}+)`;
      else                          label += ` (Lvl ${min}–${max})`;
    } else {
      label += " (All Levels)";
    }
    return label;
  };

  const handleDropdownChange = (e) => {
    setCurrentEquipmentSetIndex(parseInt(e.target.value) || 0);
  };

  const handleMinLvlChange = (e) => {
    const minVal = parseInt(e.target.value);
    const maxVal = currentSet.level_interval ? currentSet.level_interval[1] : 100;
    const interval = (!isNaN(minVal) || !isNaN(maxVal))
      ? [isNaN(minVal) ? 0 : minVal, isNaN(maxVal) ? 100 : maxVal]
      : null;
    updateEquipmentSetInterval(currentEquipmentSetIndex, interval);
  };

  const handleMaxLvlChange = (e) => {
    const minVal = currentSet.level_interval ? currentSet.level_interval[0] : 0;
    const maxVal = parseInt(e.target.value);
    const interval = (!isNaN(minVal) || !isNaN(maxVal))
      ? [isNaN(minVal) ? 0 : minVal, isNaN(maxVal) ? 100 : maxVal]
      : null;
    updateEquipmentSetInterval(currentEquipmentSetIndex, interval);
  };

  const handleDeleteClick = async () => {
    if (await showConfirm("Delete Equipment Set", "Delete this equipment set variant? All configuration for it will be lost.")) {
      deleteEquipmentSet(currentEquipmentSetIndex);
    }
  };

  let minLvlVal = "";
  let maxLvlVal = "";
  if (currentSet && currentSet.level_interval && Array.isArray(currentSet.level_interval)) {
    minLvlVal = currentSet.level_interval[0] ?? "";
    maxLvlVal = currentSet.level_interval[1] ?? "";
  }

  return (
    <div className="eq-set-bar flex-column">
      <div className="eq-set-row1 flex-row" style={{ alignItems: 'center', gap: '10px' }}>
        <label htmlFor="eq-set-dropdown" className="eq-set-label">Equipment Variant:</label>
        <select 
          id="eq-set-dropdown" 
          className="form-control eq-set-select"
          value={currentEquipmentSetIndex}
          onChange={handleDropdownChange}
          style={{ flexGrow: 1, height: '30px', padding: '4px 8px', fontSize: '12px' }}
        >
          {equipment_sets.map((set, i) => (
            <option key={i} value={i}>{buildSetLabel(set, i)}</option>
          ))}
        </select>
      </div>

      <div className="eq-set-row2 flex-row" style={{ alignItems: 'center', justifyContent: 'space-between', marginTop: '6px' }}>
        <div className="eq-set-lvl-group flex-row" style={{ alignItems: 'center', gap: '6px' }}>
          <span style={{ color: '#aaa', fontSize: '0.85em' }}>Lvl Range:</span>
          <input 
            type="number" 
            id="eq-set-lvl-min" 
            className="form-control eq-set-lvl-input" 
            placeholder="1"
            value={minLvlVal}
            onChange={handleMinLvlChange}
            onFocus={(e) => e.target.select()}
            style={{ width: '45px', height: '26px', padding: '2px 4px', fontSize: '11px', textAlign: 'center' }}
          />
          <span className="eq-set-lvl-sep" style={{ color: '#8c8270' }}>-</span>
          <input 
            type="number" 
            id="eq-set-lvl-max" 
            className="form-control eq-set-lvl-input" 
            placeholder="100"
            value={maxLvlVal}
            onChange={handleMaxLvlChange}
            onFocus={(e) => e.target.select()}
            style={{ width: '45px', height: '26px', padding: '2px 4px', fontSize: '11px', textAlign: 'center' }}
          />
        </div>

        <div className="eq-set-actions flex-row" style={{ gap: '4px' }}>
          <button 
            id="btn-eq-set-duplicate" 
            className="btn btn-secondary btn-sm"
            onClick={() => duplicateEquipmentSet(currentEquipmentSetIndex)}
          >
            Duplicate
          </button>
          
          <button 
            id="btn-eq-set-add-new" 
            className="btn btn-secondary btn-sm"
            onClick={addEquipmentSet}
          >
            + New
          </button>

          {equipment_sets.length > 1 && (
            <button 
              id="btn-eq-set-delete" 
              className="btn btn-danger btn-sm"
              onClick={handleDeleteClick}
            >
              Delete
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
