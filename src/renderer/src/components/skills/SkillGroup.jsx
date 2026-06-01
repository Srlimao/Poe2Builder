import React from 'react';
import { useBuildStore, showConfirm } from '../../store/useBuildStore';
import { getGemDisplayName, getGemTierString } from '../../utils/database';
import GemSocket from './GemSocket';

export default function SkillGroup({ skill, sIdx }) {
  const selectedElement = useBuildStore((state) => state.selectedElement);
  const setSelectedElement = useBuildStore((state) => state.setSelectedElement);
  const deleteSkill = useBuildStore((state) => state.deleteSkill);
  const updateSkill = useBuildStore((state) => state.updateSkill);
  const addSupportSkill = useBuildStore((state) => state.addSupportSkill);

  const isActiveGroup = selectedElement && selectedElement.skillIndex === sIdx;

  const handleActiveSocketClick = (e) => {
    e.stopPropagation();
    setSelectedElement({
      type: 'skill',
      skillIndex: sIdx,
      id: skill.id
    });
  };

  const handleSupportSocketClick = (supIdx, supportId) => (e) => {
    e.stopPropagation();
    setSelectedElement({
      type: 'support',
      skillIndex: sIdx,
      supportIndex: supIdx,
      id: supportId
    });
  };

  const handleAddSupportClick = (e) => {
    e.stopPropagation();
    addSupportSkill(sIdx);
  };

  const handleDeleteRowClick = async (e) => {
    e.stopPropagation();
    if (await showConfirm("Delete Skill", "Delete this active skill line?")) {
      deleteSkill(sIdx);
    }
  };

  const handleMinLvlChange = (e) => {
    const min = parseInt(e.target.value);
    const max = skill.level_interval ? skill.level_interval[1] : 100;
    const interval = isNaN(min) && isNaN(max) ? null : [isNaN(min) ? 0 : min, isNaN(max) ? 100 : max];
    
    // Update skill + all nested supports
    const updatedSupports = (skill.support_skills || []).map(sup => ({
      ...sup,
      level_interval: interval
    }));
    updateSkill(sIdx, { level_interval: interval, support_skills: updatedSupports });
  };

  const handleMaxLvlChange = (e) => {
    const min = skill.level_interval ? skill.level_interval[0] : 0;
    const max = parseInt(e.target.value);
    const interval = isNaN(min) && isNaN(max) ? null : [isNaN(min) ? 0 : min, isNaN(max) ? 100 : max];

    const updatedSupports = (skill.support_skills || []).map(sup => ({
      ...sup,
      level_interval: interval
    }));
    updateSkill(sIdx, { level_interval: interval, support_skills: updatedSupports });
  };

  const displayName = getGemDisplayName(skill.id) || "Unnamed Gem";
  const tierStr = getGemTierString(skill.id);
  const detailsStr = tierStr ? `Tier ${tierStr}` : "Active Skill";

  let minLvlVal = "";
  let maxLvlVal = "";
  if (skill.level_interval) {
    if (Array.isArray(skill.level_interval)) {
      minLvlVal = skill.level_interval[0];
      maxLvlVal = skill.level_interval[1];
    } else {
      minLvlVal = skill.level_interval;
      maxLvlVal = 100;
    }
  }

  return (
    <div className={`skill-socket-group ${isActiveGroup ? 'active-group' : ''}`}>
      <div className="sockets-linkage-row">
        <GemSocket 
          gemId={skill.id}
          socketType="skill"
          sIdx={sIdx}
          onClick={handleActiveSocketClick}
        />
        
        <div className="support-sockets-wrapper">
          {(skill.support_skills || []).map((support, supIdx) => (
            <GemSocket 
              key={supIdx}
              gemId={support.id}
              socketType="support"
              sIdx={sIdx}
              supIdx={supIdx}
              onClick={handleSupportSocketClick(supIdx, support.id)}
            />
          ))}
          
          <GemSocket 
            socketType="empty-support"
            sIdx={sIdx}
            onClick={handleAddSupportClick}
          />
        </div>
      </div>

      <div className="skill-info-overlay">
        <div className="skill-row-title">{displayName}</div>
        <div className="skill-row-details">{detailsStr}</div>
      </div>

      <div className="skill-level-badge">
        <span>Lvl:</span>
        <input 
          type="number" 
          className="skill-level-inline-input"
          min={0}
          max={100}
          placeholder="0"
          value={minLvlVal}
          onChange={handleMinLvlChange}
        />
        <span>-</span>
        <input 
          type="number" 
          className="skill-level-inline-input"
          min={0}
          max={100}
          placeholder="100"
          value={maxLvlVal}
          onChange={handleMaxLvlChange}
        />
      </div>

      <button 
        className="btn-remove-skill-row" 
        title="Delete Skill"
        onClick={handleDeleteRowClick}
      >
        &times;
      </button>
    </div>
  );
}
