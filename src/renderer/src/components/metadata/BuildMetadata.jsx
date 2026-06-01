import React from 'react';
import { useBuildStore } from '../../store/useBuildStore';

export default function BuildMetadata() {
  const buildState = useBuildStore((state) => state.buildState);
  const ascendancies = useBuildStore((state) => state.ascendancies);
  const updateMeta = useBuildStore((state) => state.updateMeta);

  const handleFieldChange = (field, val) => {
    updateMeta(field, val);
  };

  const isCustomAscendancy = buildState.ascendancy && 
    buildState.ascendancy !== '' && 
    !ascendancies.some(asc => asc.id === buildState.ascendancy);

  const handleSelectChange = (e) => {
    const val = e.target.value;
    if (val === 'Custom') {
      handleFieldChange('ascendancy', 'Custom');
    } else {
      handleFieldChange('ascendancy', val);
    }
  };

  return (
    <div className="metadata-form">
      <div className="form-group">
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
      
      <div className="form-row">
        <div className="form-group">
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
        
        <div className="form-group">
          <label htmlFor="meta-ascendancy">Ascendancy</label>
          <select 
            id="meta-ascendancy" 
            className="form-control"
            value={isCustomAscendancy ? 'Custom' : (buildState.ascendancy || '')}
            onChange={handleSelectChange}
          >
            <option value="">None / Base Class</option>
            {ascendancies.map((asc) => (
              <option key={asc.id} value={asc.id}>{asc.name}</option>
            ))}
            <option value="Custom">Custom...</option>
          </select>
          
          {(buildState.ascendancy === 'Custom' || isCustomAscendancy) && (
            <input 
              type="text" 
              id="meta-ascendancy-custom" 
              className="form-control"
              placeholder="Enter custom class/ascendancy"
              value={buildState.ascendancy === 'Custom' ? '' : buildState.ascendancy}
              onChange={(e) => handleFieldChange('ascendancy', e.target.value)}
              style={{ marginTop: '8px' }}
            />
          )}
        </div>
      </div>

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
