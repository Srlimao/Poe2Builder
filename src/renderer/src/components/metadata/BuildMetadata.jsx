import React, { useMemo } from 'react';
import { useBuildStore } from '../../store/useBuildStore';

export default function BuildMetadata() {
  const buildState = useBuildStore((state) => state.buildState);
  const ascendancies = useBuildStore((state) => state.ascendancies);
  const updateMeta = useBuildStore((state) => state.updateMeta);

  const handleFieldChange = (field, val) => {
    updateMeta(field, val);
  };

  // Unique class list — uses pre-cleaned baseClass field from fetchAscendancies
  const classes = useMemo(() => {
    const seen = new Set();
    const result = [];
    for (const asc of ascendancies) {
      if (!seen.has(asc.baseClass)) {
        seen.add(asc.baseClass);
        result.push(asc.baseClass);
      }
    }
    return result;
  }, [ascendancies]);

  // Selected class comes from the stored ascendancy's baseClass field
  const selectedClass = buildState.ascendancy
    ? (ascendancies.find(a => a.id === buildState.ascendancy)?.baseClass
        ?? buildState.ascendancy.replace(/\d+[a-zA-Z]?$/, ''))
    : '';

  // Ascendancies filtered to the selected class
  const filteredAscendancies = useMemo(() => {
    if (!selectedClass) return [];
    return ascendancies.filter(asc => asc.baseClass === selectedClass);
  }, [ascendancies, selectedClass]);

  const handleClassChange = (e) => {
    const cls = e.target.value;
    // Default to first ascendancy of new class, or clear if no class
    const first = cls ? (ascendancies.find(a => a.baseClass === cls)?.id ?? '') : '';
    handleFieldChange('ascendancy', first);
  };

  const handleAscendancyChange = (e) => {
    handleFieldChange('ascendancy', e.target.value);
  };

  return (
    <div className="metadata-form">
      {/* Row 1: Build Name + Author side by side */}
      <div className="form-row">
        <div className="form-group" style={{ flex: 2 }}>
          <label htmlFor="meta-name">Build Name</label>
          <input
            type="text"
            id="meta-name"
            placeholder="e.g. Titan Warrior"
            className="form-control"
            value={buildState.name || ''}
            onChange={(e) => handleFieldChange('name', e.target.value)}
          />
        </div>

        <div className="form-group" style={{ flex: 1 }}>
          <label htmlFor="meta-author">Author</label>
          <input
            type="text"
            id="meta-author"
            placeholder="e.g. PlayerName"
            className="form-control"
            value={buildState.author || ''}
            onChange={(e) => handleFieldChange('author', e.target.value)}
          />
        </div>
      </div>

      {/* Row 2: Class + Ascendancy linked dropdowns */}
      <div className="form-row">
        <div className="form-group">
          <label htmlFor="meta-class">Class</label>
          <select
            id="meta-class"
            className="form-control"
            value={selectedClass}
            onChange={handleClassChange}
          >
            <option value="">— Select Class —</option>
            {classes.map((cls) => (
              <option key={cls} value={cls}>{cls}</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="meta-ascendancy">Ascendancy</label>
          <select
            id="meta-ascendancy"
            className="form-control"
            value={buildState.ascendancy || ''}
            onChange={handleAscendancyChange}
            disabled={!selectedClass}
          >
            <option value="">— Select Ascendancy —</option>
            {/* shortName is pre-computed in fetchAscendancies — no on-the-fly transform needed */}
            {filteredAscendancies.map((asc) => (
              <option key={asc.id} value={asc.id}>{asc.shortName}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Description */}
      <div className="form-group">
        <label htmlFor="meta-desc">Description</label>
        <textarea
          id="meta-desc"
          rows={2}
          placeholder="Brief build summary..."
          className="form-control"
          value={buildState.description || ''}
          onChange={(e) => handleFieldChange('description', e.target.value)}
        />
      </div>
    </div>
  );
}
