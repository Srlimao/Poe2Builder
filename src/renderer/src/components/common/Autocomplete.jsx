import React, { useState, useEffect, useRef } from 'react';
import { useBuildStore } from '../../store/useBuildStore';
import { getGemColor } from '../../utils/database';

export default function Autocomplete({ 
  value, 
  onChange, 
  type, // 'gem' | 'unique'
  placeholder = "",
  className = "form-control"
}) {
  const [suggestions, setSuggestions] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  
  const activeGemsDb = useBuildStore((state) => state.activeGemsDb);
  const supportGemsDb = useBuildStore((state) => state.supportGemsDb);
  const uniquesDb = useBuildStore((state) => state.uniquesDb);
  const selectedElement = useBuildStore((state) => state.selectedElement);
  const buildState = useBuildStore((state) => state.buildState);
  
  const showTooltip = useBuildStore((state) => state.showTooltip);
  const hideTooltip = useBuildStore((state) => state.hideTooltip);
  
  const containerRef = useRef(null);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
        hideTooltip();
      }
    };
    window.addEventListener('click', handleOutsideClick);
    return () => window.removeEventListener('click', handleOutsideClick);
  }, []);

  const handleInputChange = (e) => {
    const val = e.target.value;
    onChange(val);
    
    if (!val || val.trim().length < 1) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }

    const query = val.toLowerCase();

    if (type === 'gem' && selectedElement) {
      const disableMeta = localStorage.getItem("disableMetaGems") !== "false";
      let db = [];

      if (selectedElement.type === 'skill') {
        db = disableMeta 
          ? activeGemsDb.filter(g => g.type !== 'spirit') 
          : activeGemsDb;
      } else if (selectedElement.type === 'support') {
        db = supportGemsDb;

        // Spirit gems can also accept active skill links
        if (selectedElement.skillIndex !== undefined && buildState.skills) {
          const parentSkill = buildState.skills[selectedElement.skillIndex];
          if (parentSkill && parentSkill.id) {
            const parentGemData = activeGemsDb.find(g => g.id === parentSkill.id);
            if (parentGemData && parentGemData.type === 'spirit') {
              const activeSkills = activeGemsDb.filter(g => g.type === 'skill');
              db = supportGemsDb.concat(activeSkills);
            }
          }
        }

        if (disableMeta) {
          db = db.filter(g => g.type !== 'spirit');
        }
      }

      const filtered = db.filter(item => 
        item.name.toLowerCase().includes(query) || 
        item.id.toLowerCase().includes(query)
      ).slice(0, 8);

      setSuggestions(filtered);
      setIsOpen(filtered.length > 0);
    } else if (type === 'unique' && selectedElement && selectedElement.type === 'slot') {
      if (!uniquesDb || uniquesDb.length === 0) return;

      const slotClassMap = {
        'Helm1': ['Helmet'],
        'BodyArmour1': ['Body Armour'],
        'Gloves1': ['Gloves'],
        'Boots1': ['Boots'],
        'Amulet1': ['Amulet', 'Talisman'],
        'Ring1': ['Ring'],
        'Ring2': ['Ring'],
        'Belt1': ['Belt'],
        'Weapon1': ['Wand', 'Shield', 'Focii', 'Spear', 'Staff', 'Mace', 'Warstaff', 'Bow', 'Crossbow', 'Sceptre', 'Quiver', 'Axe', 'Sword', 'Claw', 'Dagger', 'Flail', 'Two Hand Mace', 'One Hand Mace'],
        'Weapon2': ['Wand', 'Shield', 'Focii', 'Spear', 'Staff', 'Mace', 'Warstaff', 'Bow', 'Crossbow', 'Sceptre', 'Quiver', 'Axe', 'Sword', 'Claw', 'Dagger', 'Flail', 'Two Hand Mace', 'One Hand Mace']
      };

      const allowedClasses = slotClassMap[selectedElement.id];

      const filtered = uniquesDb.filter(item => {
        if (allowedClasses && !allowedClasses.includes(item.ItemClass)) {
          if (selectedElement.id === 'Weapon1' || selectedElement.id === 'Weapon2') {
            const nonWeapons = ['Helmet', 'Body Armour', 'Gloves', 'Boots', 'Amulet', 'Talisman', 'Ring', 'Belt', 'Flask', 'Jewel', 'Charm'];
            if (nonWeapons.includes(item.ItemClass)) return false;
          } else {
            return false;
          }
        }
        return item.Name.toLowerCase().includes(query);
      }).slice(0, 8);

      setSuggestions(filtered);
      setIsOpen(filtered.length > 0);
    }
  };

  const handleSelect = (item) => {
    if (type === 'gem') {
      onChange(item.id);
    } else if (type === 'unique') {
      onChange(item.Name);
    }
    setIsOpen(false);
    hideTooltip();
  };

  const handleMouseEnter = (itemId) => (e) => {
    if (type !== 'gem') return;
    const rect = e.currentTarget.getBoundingClientRect();
    showTooltip(itemId, rect);
  };

  const handleMouseLeave = () => {
    hideTooltip();
  };

  return (
    <div className="autocomplete-container" ref={containerRef} style={{ position: 'relative' }}>
      <input 
        type="text" 
        className={className} 
        placeholder={placeholder}
        value={value}
        onChange={handleInputChange}
        onFocus={(e) => {
          if (value && value.trim().length > 0) {
            handleInputChange(e);
          }
        }}
      />
      {isOpen && (
        <div className="autocomplete-suggestions">
          {suggestions.map((item, idx) => {
            const displayTitle = type === 'gem' ? item.name : item.Name;
            const displaySub = type === 'gem' 
              ? (item.type === 'spirit' ? 'Spirit Gem' : `Tier ${item.tier}`)
              : item.ItemClass;
            
            return (
              <div 
                key={idx}
                className="suggestion-item"
                onClick={() => handleSelect(item)}
                onMouseEnter={handleMouseEnter(type === 'gem' ? item.id : null)}
                onMouseLeave={handleMouseLeave}
              >
                <span className="sug-name">{displayTitle}</span>
                <span className="sug-details">{displaySub}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
