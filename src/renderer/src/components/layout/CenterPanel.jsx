import React, { useState } from 'react';
import SkillsFilter from '../skills/SkillsFilter';
import SkillsList from '../skills/SkillsList';

export default function CenterPanel() {
  const [filterLevel, setFilterLevel] = useState(1);
  const [showAll, setShowAll] = useState(true);

  return (
    <div className="center-panel flex-column">
      <div className="panel-section-title">Skill Socket Grid</div>

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
