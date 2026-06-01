import React from 'react';
import { useBuildStore } from '../../store/useBuildStore';
import { getGemDisplayName } from '../../utils/database';
import { getPassiveNodeName } from '../../utils/skillTree';
import { compilePoEMarkup, getLevelIntervalString } from '../../utils/markup';
import { standardSlots } from '../../utils/constants';

export default function LivePreview() {
  const selectedElement = useBuildStore((state) => state.selectedElement);
  const buildState = useBuildStore((state) => state.buildState);
  const currentTreeIndex = useBuildStore((state) => state.currentTreeIndex);

  const getSlotLabel = (id) => {
    const found = standardSlots.find(x => x.id === id);
    return found ? found.label : id;
  };

  if (!selectedElement) {
    return (
      <div className="preview-container" id="editor-preview-panel">
        <div className="game-tooltip-panel">
          <div className="tooltip-border-top"></div>
          <div className="tooltip-header">
            <h4 className="tooltip-title">Build Planner Instructions</h4>
          </div>
          <div className="tooltip-divider"></div>
          <div className="tooltip-content" style={{ color: '#7a7262', fontStyle: 'italic' }}>
            Select an item to view live tooltips as they appear in the Path of Exile 2 game planner.
          </div>
          <div className="tooltip-border-bottom"></div>
        </div>
      </div>
    );
  }

  let titleText = "";
  let lvlText = "";
  let additionalText = "";

  if (selectedElement.type === 'slot') {
    const variants = buildState.inventory_slots.filter(x => x.inventory_id === selectedElement.id);
    const slot = variants[selectedElement.variantIndex || 0] || variants[0];
    if (slot) {
      titleText = slot.unique_name 
        ? `${getSlotLabel(slot.inventory_id)}: ${slot.unique_name}` 
        : `${getSlotLabel(slot.inventory_id)} recommendation`;
      lvlText = getLevelIntervalString(slot.level_interval);
      additionalText = slot.additional_text || "";
    }
  } else if (selectedElement.type === 'skill') {
    const skill = buildState.skills[selectedElement.skillIndex];
    if (skill) {
      titleText = getGemDisplayName(skill.id) || "Active Gem Socket";
      lvlText = getLevelIntervalString(skill.level_interval);
      additionalText = skill.additional_text || "";
    }
  } else if (selectedElement.type === 'support') {
    const skill = buildState.skills[selectedElement.skillIndex];
    const support = skill?.support_skills?.[selectedElement.supportIndex];
    if (support) {
      titleText = `${getGemDisplayName(support.id) || "Support Gem"} (Socketed)`;
      lvlText = getLevelIntervalString(support.level_interval);
      additionalText = support.additional_text || "";
    }
  } else if (selectedElement.type === 'passive') {
    const activeTree = buildState.passive_trees[currentTreeIndex];
    const passive = activeTree?.nodes.find(p => p.id === selectedElement.id);
    if (passive) {
      titleText = getPassiveNodeName(passive.id);
      lvlText = "";
      additionalText = passive.additional_text || "";
    }
  }

  const compiledContent = additionalText 
    ? compilePoEMarkup(additionalText)
    : `<span style="color: #7a7262; font-style: italic;">No specific instructions provided for this item yet. Use text box above.</span>`;

  return (
    <div className="preview-container" id="editor-preview-panel">
      <div className="game-tooltip-panel">
        <div className="tooltip-border-top"></div>
        <div className="tooltip-header">
          <h4 className="tooltip-title">{titleText}</h4>
          {lvlText && <span className="tooltip-level">{lvlText}</span>}
        </div>
        <div className="tooltip-divider"></div>
        <div 
          className="tooltip-content"
          dangerouslySetInnerHTML={{ __html: compiledContent }}
        />
        <div className="tooltip-border-bottom"></div>
      </div>
    </div>
  );
}
