import React, { useState, useEffect } from 'react';
import { useBuildStore } from '../../store/useBuildStore';
import { standardSlots } from '../../utils/constants';

export default function Footer() {
  const skills = useBuildStore((state) => state.buildState.skills);
  const inventory_slots = useBuildStore((state) => state.buildState.inventory_slots);

  const [pathStatus, setPathStatus] = useState({
    text: "Initializing...",
    className: "text-muted"
  });

  const isElectron = typeof window.electronAPI !== 'undefined';

  // --- Compute Stats ---
  const skillCount = skills.length;
  let supportCount = 0;
  skills.forEach(s => {
    supportCount += s.support_skills ? s.support_skills.length : 0;
  });

  const activeSlotsCount = standardSlots.filter(s => {
    return inventory_slots.some(v =>
      v.inventory_id === s.id && (v.additional_text || v.unique_name || v.level_interval)
    );
  }).length;

  // --- Check Path Status ---
  useEffect(() => {
    async function checkPath() {
      if (isElectron) {
        try {
          const pathInfo = await window.electronAPI.getDefaultBuildPath();
          if (pathInfo.exists) {
            setPathStatus({
              text: `Connected (${pathInfo.path})`,
              className: "text-green"
            });
          } else {
            setPathStatus({
              text: `Ready (${pathInfo.path} - will create on save)`,
              className: "text-muted"
            });
          }
        } catch (e) {
          setPathStatus({
            text: "Not available",
            className: "text-red"
          });
        }
      } else {
        setPathStatus({
          text: "Browser Mode (Local Download Fallback)",
          className: "text-muted"
        });
      }
    }
    checkPath();
  }, [isElectron]);

  return (
    <footer className="app-footer flex-between">
      <div id="poe-path-status">
        PoE2 BuildPlanner directory: <span className={`path-val ${pathStatus.className}`}>{pathStatus.text}</span>
      </div>
      <div className="stats-bar flex-row">
        <span>Active Skills: <strong id="stat-skills-count">{skillCount}</strong></span>
        <span>Support Links: <strong id="stat-supports-count">{supportCount}</strong></span>
        <span>Configured Items: <strong id="stat-slots-count">{activeSlotsCount}/{standardSlots.length}</strong></span>
      </div>
    </footer>
  );
}
