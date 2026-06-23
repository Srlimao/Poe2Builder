import React, { useState, useEffect, useMemo } from 'react';
import { useBuildStore, executePob2Import } from '../../store/useBuildStore';
import { parsePob2 } from '../../utils/pob2Parser';

export default function PublicBuildsList() {
  const [builds, setBuilds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedAscendancy, setSelectedAscendancy] = useState('');
  const [sortBy, setSortBy] = useState('popularity');
  
  const setBuildState = useBuildStore(state => state.setBuildState);

  useEffect(() => {
    async function fetchBuilds() {
      try {
        const response = await fetch('/api/public_builds');
        if (!response.ok) {
          throw new Error('Failed to fetch builds');
        }
        const data = await response.json();
        setBuilds(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchBuilds();
  }, []);

  const handleLoadBuild = async (build) => {
    try {
      const response = await fetch(`/api/pob2/fetch?url=${encodeURIComponent(build.pobb_url + '/raw')}`);
      if (!response.ok) {
        throw new Error('Failed to fetch build data from proxy');
      }
      const base64Data = await response.text();
      const parsedBuild = await parsePob2(base64Data);
      
      // Keep the scraped build name if the parsed one is generic
      if (parsedBuild.trees && parsedBuild.trees.length > 0) {
         if (!parsedBuild.trees[0].title || parsedBuild.trees[0].title.startsWith("Tree ")) {
            parsedBuild.trees[0].title = build.build_name;
         }
      }
      
      parsedBuild.buildName = build.build_name;
      parsedBuild.author = build.author;

      await executePob2Import(parsedBuild);
    } catch (err) {
      alert("Error loading build: " + err.message);
    }
  };

  // Get unique classes present in the builds
  const classes = useMemo(() => {
    const set = new Set();
    builds.forEach(b => {
      if (b.class_name) set.add(b.class_name);
    });
    return Array.from(set).sort();
  }, [builds]);

  // Get unique ascendancies for the selected class present in the builds
  const ascendancies = useMemo(() => {
    const set = new Set();
    builds.forEach(b => {
      if (selectedClass && b.class_name !== selectedClass) return;
      if (b.ascendancy_name && b.ascendancy_name !== 'None') {
        set.add(b.ascendancy_name);
      }
    });
    return Array.from(set).sort();
  }, [builds, selectedClass]);

  const handleClassChange = (e) => {
    setSelectedClass(e.target.value);
    setSelectedAscendancy(''); // Reset ascendancy when class changes
  };

  // Filter and sort builds based on class/ascendancy selects and sortBy method
  const filteredAndSortedBuilds = useMemo(() => {
    // 1. Filter
    const filtered = builds.filter(b => {
      const matchesClass = !selectedClass || b.class_name === selectedClass;
      const matchesAscendancy = !selectedAscendancy || b.ascendancy_name === selectedAscendancy;
      return matchesClass && matchesAscendancy;
    });

    // 2. Sort
    return filtered.sort((a, b) => {
      if (sortBy === 'popularity') {
        const popA = parseInt((a.popularity || '').replace(/[^0-9]/g, ''), 10) || 0;
        const popB = parseInt((b.popularity || '').replace(/[^0-9]/g, ''), 10) || 0;
        return popB - popA; // Descending
      }
      if (sortBy === 'dps') {
        const getDpsNum = (val) => {
          if (!val) return 0;
          const s = val.toLowerCase().trim();
          const n = parseFloat(s.replace(/[^0-9.]/g, '')) || 0;
          if (s.includes('m')) return n * 1000000;
          if (s.includes('k')) return n * 1000;
          return n;
        };
        return getDpsNum(b.dps) - getDpsNum(a.dps); // Descending
      }
      if (sortBy === 'ehp') {
        const getEhpNum = (val) => {
          if (!val) return 0;
          const s = val.toLowerCase().trim();
          const n = parseFloat(s.replace(/[^0-9.]/g, '')) || 0;
          if (s.includes('m')) return n * 1000000;
          if (s.includes('k')) return n * 1000;
          return n;
        };
        return getEhpNum(b.ehp) - getEhpNum(a.ehp); // Descending
      }
      // 'newest' (ID DESC)
      return b.id - a.id;
    });
  }, [builds, selectedClass, selectedAscendancy, sortBy]);

  return (
    <div className="community-builds-container">
      <div className="panel-section-title">Community Builds</div>
      
      <div className="build-filters-bar" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          <select value={selectedClass} onChange={handleClassChange} className="form-control">
            <option value="">All Classes</option>
            {classes.map(cls => (
              <option key={cls} value={cls}>{cls}</option>
            ))}
          </select>
          <select 
            value={selectedAscendancy} 
            onChange={(e) => setSelectedAscendancy(e.target.value)} 
            className="form-control"
            disabled={!selectedClass && ascendancies.length === 0}
          >
            <option value="">All Ascendancies</option>
            {ascendancies.map(asc => (
              <option key={asc} value={asc}>{asc}</option>
            ))}
          </select>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '2px 0' }}>
          <label style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', margin: 0, whiteSpace: 'nowrap' }}>Sort By</label>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="form-control" style={{ height: '28px', padding: '2px 6px', fontSize: '11px', flex: 1 }}>
            <option value="popularity">Popularity (♥)</option>
            <option value="newest">Newest</option>
            <option value="dps">Highest DPS (⚔)</option>
            <option value="ehp">Highest EHP (🛡)</option>
          </select>
        </div>
      </div>

      <div className="builds-list-content">
        {loading && <div className="changelog-state"><div className="changelog-spinner" /></div>}
        {error && <div className="changelog-state changelog-error">⚠ {error}</div>}
        
        {!loading && !error && filteredAndSortedBuilds.length === 0 && (
          <div className="build-empty-state">
            <span>No builds found matching the selected filters.</span>
          </div>
        )}
        
        {!loading && !error && filteredAndSortedBuilds.map(build => {
          const classLower = (build.class_name || '').toLowerCase();
          const badgeClass = `build-card-badge badge-${classLower}`;
          const badgeText = build.ascendancy_name && build.ascendancy_name !== 'None'
            ? build.ascendancy_name
            : (build.class_name || 'Class');

          return (
            <div key={build.id} className="build-card" onClick={() => handleLoadBuild(build)}>
              <div className="build-card-header">
                <span className="build-card-title" title={build.build_name}>
                  {build.build_name}
                </span>
                {build.popularity && (
                  <span className="build-card-popularity">♥ {build.popularity}</span>
                )}
              </div>
              
              <div className="build-card-meta">
                <span className={badgeClass}>{badgeText}</span>
                {build.author && (
                  <span className="build-card-author">by {build.author}</span>
                )}
              </div>
              
              <div className="build-card-stats">
                {build.dps && (
                  <span className="build-stat-pill">
                    <span className="build-stat-icon swords">⚔</span> {build.dps}
                  </span>
                )}
                {build.ehp && (
                  <span className="build-stat-pill">
                    <span className="build-stat-icon shield">🛡</span> {build.ehp}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

