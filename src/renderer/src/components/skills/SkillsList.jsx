import React from 'react';
import { useBuildStore } from '../../store/useBuildStore';
import SkillGroup from './SkillGroup';

export default function SkillsList({ filterLevel, showAll }) {
  const skills = useBuildStore((state) => state.buildState.skills);

  if (!skills || skills.length === 0) {
    return (
      <div className="no-skills-message">
        No skills added yet. Click "+ Add Skill" to add your first skill gem socket!
      </div>
    );
  }

  return (
    <div id="skills-list" className="skills-scroll-container skills-list">
      {skills.map((skill, idx) => {
        let isVisible = true;
        if (!showAll && skill.level_interval && Array.isArray(skill.level_interval)) {
          const min = skill.level_interval[0];
          const max = skill.level_interval[1];
          if (filterLevel < min || filterLevel > max) {
            isVisible = false;
          }
        }

        if (!isVisible) return null;

        return (
          <SkillGroup 
            key={idx}
            skill={skill}
            sIdx={idx}
          />
        );
      })}
    </div>
  );
}
