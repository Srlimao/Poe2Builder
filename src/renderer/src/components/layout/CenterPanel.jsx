import React, { useState } from 'react';
import SkillsFilter from '../skills/SkillsFilter';
import SkillsList from '../skills/SkillsList';
import { useBuildStore } from '../../store/useBuildStore';

export default function CenterPanel() {
  const [filterLevel, setFilterLevel] = useState(1);
  const [showAll, setShowAll] = useState(true);

  const addSkill = useBuildStore((state) => state.addSkill);

  return (
    <div className="center-panel flex-column">
      <div className="panel-section-title">
        Skill Socket Grid
        <button
          id="btn-add-skill-socket"
          className="btn btn-gold btn-sm"
          onClick={addSkill}
        >
          + Add Skill
        </button>
      </div>


      <SkillsFilter
        filterLevel={filterLevel}
        setFilterLevel={setFilterLevel}
        showAll={showAll}
        setShowAll={setShowAll}
      />

      <SkillsList
        filterLevel={filterLevel}
        showAll={showAll}
      />
    </div>
  );
}
