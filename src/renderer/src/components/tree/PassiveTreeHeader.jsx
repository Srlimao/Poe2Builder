import React from 'react';
import { useBuildStore, showConfirm } from '../../store/useBuildStore';

export default function PassiveTreeHeader() {
  const passive_trees = useBuildStore((state) => state.buildState.passive_trees);
  const currentTreeIndex = useBuildStore((state) => state.currentTreeIndex);
  
  const setCurrentTreeIndex = useBuildStore((state) => state.setCurrentTreeIndex);
  const addTreeVariant = useBuildStore((state) => state.addTreeVariant);
  const duplicateTreeVariant = useBuildStore((state) => state.duplicateTreeVariant);
  const deleteTreeVariant = useBuildStore((state) => state.deleteTreeVariant);
  const updateTreeVariantInterval = useBuildStore((state) => state.updateTreeVariantInterval);

  const currentTree = passive_trees[currentTreeIndex] || passive_trees[0];

  const buildVariantLabel = (tree, index) => {
    let label = `Variant ${index + 1}`;
    if (tree.level_interval && Array.isArray(tree.level_interval)) {
      const [min, max] = tree.level_interval;
      if (min === 0 && max === 100) label += " (All Levels)";
      else if (max === 100)         label += ` (Lvl ${min}+)`;
      else                          label += ` (Lvl ${min}–${max})`;
    } else {
      label += " (All Levels)";
    }
    return label;
  };

  const handleDropdownChange = (e) => {
    setCurrentTreeIndex(parseInt(e.target.value) || 0);
  };

  const handleMinLvlChange = (e) => {
    const minVal = parseInt(e.target.value);
    const maxVal = currentTree.level_interval ? currentTree.level_interval[1] : 100;
    const interval = (!isNaN(minVal) || !isNaN(maxVal))
      ? [isNaN(minVal) ? 0 : minVal, isNaN(maxVal) ? 100 : maxVal]
      : null;
    updateTreeVariantInterval(currentTreeIndex, interval);
  };

  const handleMaxLvlChange = (e) => {
    const minVal = currentTree.level_interval ? currentTree.level_interval[0] : 0;
    const maxVal = parseInt(e.target.value);
    const interval = (!isNaN(minVal) || !isNaN(maxVal))
      ? [isNaN(minVal) ? 0 : minVal, isNaN(maxVal) ? 100 : maxVal]
      : null;
    updateTreeVariantInterval(currentTreeIndex, interval);
  };

  const handleDeleteClick = async () => {
    if (await showConfirm("Delete Tree", "Delete this passive tree variant? All allocated nodes for it will be lost.")) {
      deleteTreeVariant(currentTreeIndex);
    }
  };

  let minLvlVal = "";
  let maxLvlVal = "";
  if (currentTree && currentTree.level_interval && Array.isArray(currentTree.level_interval)) {
    minLvlVal = currentTree.level_interval[0] ?? "";
    maxLvlVal = currentTree.level_interval[1] ?? "";
  }

  return (
    <div className="tree-variant-bar flex-between" style={{ padding: '10px 15px', backgroundColor: '#140f0b', borderBottom: '1px solid #2d261e', gap: '15px' }}>
      <div className="flex-row" style={{ alignItems: 'center', gap: '10px', flexGrow: 1 }}>
        <label htmlFor="tree-variant-dropdown" style={{ color: 'var(--text-gold)', fontWeight: 'bold' }}>Tree Variant:</label>
        <select 
          id="tree-variant-dropdown" 
          className="form-control"
          style={{ maxWidth: '280px' }}
          value={currentTreeIndex}
          onChange={handleDropdownChange}
        >
          {passive_trees.map((tree, i) => (
            <option key={i} value={i}>{buildVariantLabel(tree, i)}</option>
          ))}
        </select>
      </div>

      <div className="flex-row" style={{ alignItems: 'center', gap: '12px' }}>
        <div className="flex-row" style={{ alignItems: 'center', gap: '6px' }}>
          <span style={{ color: '#aaa', fontSize: '0.9em' }}>Lvl Range:</span>
          <input 
            type="number" 
            id="tree-lvl-min" 
            className="form-control" 
            style={{ width: '60px', textAlign: 'center' }}
            placeholder="1"
            value={minLvlVal}
            onChange={handleMinLvlChange}
          />
          <span style={{ color: '#aaa' }}>-</span>
          <input 
            type="number" 
            id="tree-lvl-max" 
            className="form-control" 
            style={{ width: '60px', textAlign: 'center' }}
            placeholder="100"
            value={maxLvlVal}
            onChange={handleMaxLvlChange}
          />
        </div>

        <button 
          id="btn-tree-duplicate" 
          className="btn btn-secondary"
          onClick={() => duplicateTreeVariant(currentTreeIndex)}
        >
          Duplicate
        </button>
        
        <button 
          id="btn-tree-add-new" 
          className="btn btn-secondary"
          onClick={addTreeVariant}
        >
          + New
        </button>

        {passive_trees.length > 1 && (
          <button 
            id="btn-tree-delete" 
            className="btn btn-red"
            onClick={handleDeleteClick}
          >
            Delete
          </button>
        )}
      </div>
    </div>
  );
}
