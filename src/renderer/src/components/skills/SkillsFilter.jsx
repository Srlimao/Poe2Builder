import React from 'react';
import { useBuildStore } from '../../store/useBuildStore';

export default function SkillsFilter({
  filterLevel,
  setFilterLevel,
  showAll,
  setShowAll
}) {
  const addSkill = useBuildStore((state) => state.addSkill);

  const handleSliderChange = (e) => {
    setFilterLevel(parseInt(e.target.value) || 1);
  };

  const handleCheckboxChange = (e) => {
    setShowAll(e.target.checked);
  };

  return (
    <div className="skills-filter-bar">
      <button
        id="btn-add-skill-socket"
        className="btn btn-gold"
        onClick={addSkill}
      >
        + Add Skill
      </button>

      <div className="filter-slider-container">
        <label className="checkbox-container">
          <input
            type="checkbox"
            id="chk-skills-show-all"
            checked={showAll}
            onChange={handleCheckboxChange}
          />
          <span className="checkbox-custom"></span>
          Show All
        </label>

        <div className="slider-wrapper" style={{ opacity: showAll ? 0.5 : 1 }}>
          <span className="slider-label">Lvl:</span>
          <input
            type="range"
            id="skills-level-slider"
            min="1"
            max="100"
            value={filterLevel}
            disabled={showAll}
            onChange={handleSliderChange}
          />
          <span id="skills-level-display" style={{ minWidth: '30px', fontWeight: 'bold' }}>
            {showAll ? 'All' : filterLevel}
          </span>
        </div>
      </div>
    </div>
  );
}