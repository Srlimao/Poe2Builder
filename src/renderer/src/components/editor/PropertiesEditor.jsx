import React, { useRef } from 'react';
import { useBuildStore, showConfirm } from '../../store/useBuildStore';
import { getGemDisplayName } from '../../utils/database';
import { getPassiveNodeName } from '../../utils/skillTree';
import { standardSlots } from '../../utils/constants';
import Autocomplete from '../common/Autocomplete';

export default function PropertiesEditor() {
  const selectedElement = useBuildStore((state) => state.selectedElement);
  const setSelectedElement = useBuildStore((state) => state.setSelectedElement);
  const buildState = useBuildStore((state) => state.buildState);
  const currentTreeIndex = useBuildStore((state) => state.currentTreeIndex);
  const currentEquipmentSetIndex = useBuildStore((state) => state.currentEquipmentSetIndex);

  // Store actions
  const updateSkill = useBuildStore((state) => state.updateSkill);
  const deleteSkill = useBuildStore((state) => state.deleteSkill);
  const updateSupportSkill = useBuildStore((state) => state.updateSupportSkill);
  const deleteSupportSkill = useBuildStore((state) => state.deleteSupportSkill);
  const updateEquipmentSlot = useBuildStore((state) => state.updateEquipmentSlot);
  const updatePassiveText = useBuildStore((state) => state.updatePassiveText);
  const togglePassiveNode = useBuildStore((state) => state.togglePassiveNode);

  const textareaRef = useRef(null);

  const getSlotLabel = (id) => {
    const found = standardSlots.find(x => x.id === id);
    return found ? found.label : id;
  };

  if (!selectedElement) {
    return (
      <div className="editor-placeholder-view">
        <div className="placeholder-icon"></div>
        <h3>No Element Selected</h3>
        <p>Click on an equipment slot, skill gem socket, or passive skill tree node to edit its instructions and properties.</p>
      </div>
    );
  }

  // --- Resolve current data & config ---
  let itemType = "";
  let itemTitle = "";
  let idLabel = "Item ID";
  let showUniqueGroup = false;
  let showVariantsGroup = false;
  let isIdDisabled = false;
  
  let currentId = "";
  let currentUniqueName = "";
  let currentMinLvl = "";
  let currentMaxLvl = "";
  let currentText = "";

  let variants = [];

  if (selectedElement.type === 'slot') {
    const currentSet = buildState.equipment_sets[currentEquipmentSetIndex] || buildState.equipment_sets[0];
    const slot = currentSet?.slots?.find(x => x.inventory_id === selectedElement.id);
    
    itemType = "SLOT";
    itemTitle = getSlotLabel(selectedElement.id);
    idLabel = "Slot ID";
    showUniqueGroup = true;
    showVariantsGroup = false;
    isIdDisabled = true;

    if (slot) {
      currentId = slot.inventory_id;
      currentUniqueName = slot.unique_name || "";
      currentText = slot.additional_text || "";
    }
  } else if (selectedElement.type === 'skill') {
    const skill = buildState.skills[selectedElement.skillIndex];
    itemType = "SKILL GEM";
    itemTitle = getGemDisplayName(skill?.id) || "New Active Gem";
    idLabel = "Skill Gem";
    
    if (skill) {
      currentId = skill.id;
      currentMinLvl = skill.level_interval ? (Array.isArray(skill.level_interval) ? skill.level_interval[0] : skill.level_interval) : "";
      currentMaxLvl = skill.level_interval && Array.isArray(skill.level_interval) ? skill.level_interval[1] : "";
      currentText = skill.additional_text || "";
    }
  } else if (selectedElement.type === 'support') {
    const skill = buildState.skills[selectedElement.skillIndex];
    const support = skill?.support_skills?.[selectedElement.supportIndex];
    itemType = "SUPPORT GEM";
    itemTitle = getGemDisplayName(support?.id) || "New Support Gem";
    idLabel = "Support Gem";

    if (support) {
      currentId = support.id;
      currentMinLvl = support.level_interval ? (Array.isArray(support.level_interval) ? support.level_interval[0] : support.level_interval) : "";
      currentMaxLvl = support.level_interval && Array.isArray(support.level_interval) ? support.level_interval[1] : "";
      currentText = support.additional_text || "";
    }
  } else if (selectedElement.type === 'passive') {
    const activeTree = buildState.passive_trees[currentTreeIndex];
    const passive = activeTree?.nodes.find(p => p.id === selectedElement.id);
    itemType = "PASSIVE SKILL";
    itemTitle = getPassiveNodeName(selectedElement.id);
    idLabel = "Passive Node ID";

    if (passive) {
      currentId = passive.id;
      currentText = passive.additional_text || "";
    }
  }

  // --- Mutate Handlers ---
  const handleFieldChange = (field, val) => {
    if (selectedElement.type === 'slot') {
      let fields = {};
      if (field === 'unique_name') {
        fields.unique_name = val;
      } else if (field === 'additional_text') {
        fields.additional_text = val;
      }
      updateEquipmentSlot(selectedElement.id, fields);
    } else if (selectedElement.type === 'skill') {
      let fields = {};
      if (field === 'id') {
        fields.id = val;
      } else if (field === 'min_lvl') {
        const min = parseInt(val);
        const max = currentMaxLvl !== "" ? parseInt(currentMaxLvl) : 100;
        fields.level_interval = isNaN(min) && isNaN(max) ? null : [isNaN(min) ? 0 : min, isNaN(max) ? 100 : max];
      } else if (field === 'max_lvl') {
        const min = currentMinLvl !== "" ? parseInt(currentMinLvl) : 0;
        const max = parseInt(val);
        fields.level_interval = isNaN(min) && isNaN(max) ? null : [isNaN(min) ? 0 : min, isNaN(max) ? 100 : max];
      } else if (field === 'additional_text') {
        fields.additional_text = val;
      }
      updateSkill(selectedElement.skillIndex, fields);
    } else if (selectedElement.type === 'support') {
      let fields = {};
      if (field === 'id') {
        fields.id = val;
      } else if (field === 'min_lvl') {
        const min = parseInt(val);
        const max = currentMaxLvl !== "" ? parseInt(currentMaxLvl) : 100;
        fields.level_interval = isNaN(min) && isNaN(max) ? null : [isNaN(min) ? 0 : min, isNaN(max) ? 100 : max];
      } else if (field === 'max_lvl') {
        const min = currentMinLvl !== "" ? parseInt(currentMinLvl) : 0;
        const max = parseInt(val);
        fields.level_interval = isNaN(min) && isNaN(max) ? null : [isNaN(min) ? 0 : min, isNaN(max) ? 100 : max];
      } else if (field === 'additional_text') {
        fields.additional_text = val;
      }
      updateSupportSkill(selectedElement.skillIndex, selectedElement.supportIndex, fields);
    } else if (selectedElement.type === 'passive') {
      if (field === 'additional_text') {
        updatePassiveText(selectedElement.id, val);
      }
    }
  };

  const handleDeleteClick = async () => {
    if (selectedElement.type === 'slot') {
      if (await showConfirm("Clear Slot", "Clear this equipment slot's instructions?")) {
        updateEquipmentSlot(selectedElement.id, { unique_name: "", additional_text: "" });
      }
    } else if (selectedElement.type === 'skill') {
      if (await showConfirm("Delete Skill", "Delete this active skill line?")) {
        deleteSkill(selectedElement.skillIndex);
      }
    } else if (selectedElement.type === 'support') {
      if (await showConfirm("Delete Support", "Delete this support gem?")) {
        deleteSupportSkill(selectedElement.skillIndex, selectedElement.supportIndex);
      }
    } else if (selectedElement.type === 'passive') {
      if (await showConfirm("Unallocate Passive", "Unallocate this passive node?")) {
        togglePassiveNode(selectedElement.id);
      }
    }
  };

  // --- Insertion Helper ---
  const insertMarkupTag = (tag) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;

    const selectedText = text.substring(start, end);
    const replacement = `<${tag}>{${selectedText}}`;
    const newVal = text.substring(0, start) + replacement + text.substring(end);

    handleFieldChange('additional_text', newVal);

    setTimeout(() => {
      textarea.focus();
      const newCursorPos = start + tag.length + 2 + selectedText.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 50);
  };

  return (
    <div id="editor-form-container" className="editor-form-container">
      <div className="editor-section-header">
        <span id="editor-item-type" className="item-type-badge">{itemType}</span>
        <h3 id="editor-item-title" className="editor-title">{itemTitle}</h3>
      </div>

      <div>
        {showVariantsGroup && (
          <div id="editor-variant-selector" className="form-group flex-between" style={{ borderBottom: '1px solid #2d261e', paddingBottom: '12px' }}>
            <div style={{ flexGrow: 1, marginRight: '10px' }}>
              <label htmlFor="variant-dropdown">Level Variant</label>
              <select 
                id="variant-dropdown" 
                className="form-control"
                value={selectedElement.variantIndex || 0}
                onChange={handleVariantChange}
              >
                {variants.map((v, idx) => {
                  let label = `Variant ${idx + 1}`;
                  if (v.level_interval) {
                    const min = Array.isArray(v.level_interval) ? v.level_interval[0] : v.level_interval;
                    const max = Array.isArray(v.level_interval) ? v.level_interval[1] : "";
                    label += max !== "" ? ` (Lvl ${min}-${max})` : ` (Lvl ${min}+)`;
                  } else {
                    label += ` (All Levels)`;
                  }
                  return <option key={idx} value={idx}>{label}</option>;
                })}
              </select>
            </div>
            <button 
              id="btn-add-variant" 
              className="btn btn-secondary" 
              style={{ marginTop: '20px' }}
              onClick={handleAddVariantClick}
            >
              + Add
            </button>
          </div>
        )}

        <div className="form-group" style={{ marginTop: '12px' }}>
          <label id="edit-id-label" htmlFor="edit-id">{idLabel}</label>
          {selectedElement.type === 'skill' || selectedElement.type === 'support' ? (
            <Autocomplete 
              value={currentId} 
              onChange={(val) => handleFieldChange('id', val)} 
              type="gem"
              placeholder="e.g. Earthquake"
            />
          ) : (
            <input 
              type="text" 
              id="edit-id" 
              className="form-control" 
              value={currentId}
              disabled={isIdDisabled}
              onChange={(e) => handleFieldChange('id', e.target.value)}
            />
          )}
        </div>

        {showUniqueGroup && (
          <div id="editor-group-unique" className="form-group">
            <label htmlFor="edit-unique-name">Unique Item Name</label>
            <Autocomplete 
              value={currentUniqueName} 
              onChange={(val) => handleFieldChange('unique_name', val)} 
              type="unique"
              placeholder="Start typing unique name..."
            />
          </div>
        )}

        {selectedElement.type !== 'passive' && (
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="edit-level-min">Min Level</label>
              <input 
                type="number" 
                id="edit-level-min" 
                className="form-control" 
                placeholder="1"
                value={currentMinLvl}
                onChange={(e) => handleFieldChange('min_lvl', e.target.value)}
              />
            </div>
            <div className="form-group">
              <label htmlFor="edit-level-max">Max Level</label>
              <input 
                type="number" 
                id="edit-level-max" 
                className="form-control" 
                placeholder="100"
                value={currentMaxLvl}
                onChange={(e) => handleFieldChange('max_lvl', e.target.value)}
              />
            </div>
          </div>
        )}

        <div className="form-group">
          <label htmlFor="edit-text">Instructions & Stats</label>
          <textarea 
            id="edit-text" 
            ref={textareaRef}
            rows={4} 
            className="form-control font-code" 
            placeholder="Add stats or recommendations..."
            value={currentText}
            onChange={(e) => handleFieldChange('additional_text', e.target.value)}
          />
          <div className="markup-helpers">
            <button className="markup-btn" data-tag="gold" onClick={() => insertMarkupTag('gold')}>Gold</button>
            <button className="markup-btn" data-tag="green" onClick={() => insertMarkupTag('green')}>Green</button>
            <button className="markup-btn" data-tag="red" onClick={() => insertMarkupTag('red')}>Red</button>
            <button className="markup-btn" data-tag="blue" onClick={() => insertMarkupTag('blue')}>Blue</button>
            <button className="markup-btn" data-tag="grey" onClick={() => insertMarkupTag('grey')}>Grey</button>
            <button className="markup-btn" data-tag="b" onClick={() => insertMarkupTag('b')}>Bold</button>
            <button className="markup-btn" data-tag="l" onClick={() => insertMarkupTag('l')}>Large</button>
          </div>
        </div>
      </div>

      <div style={{ marginTop: '20px' }}>
        <button 
          id="btn-delete-element" 
          className="btn btn-danger"
          style={{ width: '100%' }}
          onClick={handleDeleteClick}
        >
          {selectedElement.type === 'slot' && 'Clear Slot'}
          {selectedElement.type === 'skill' && 'Delete Active Gem'}
          {selectedElement.type === 'support' && 'Delete Support Gem'}
          {selectedElement.type === 'passive' && 'Unallocate Passive'}
        </button>
      </div>
    </div>
  );
}
