import React, { useState, useEffect } from 'react';

const GITHUB_REPO = 'Srlimao/Poe2Builder';
const RELEASES_URL = `https://api.github.com/repos/${GITHUB_REPO}/releases?per_page=10`;

export default function Changelog() {
  const [releases, setReleases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState(null); // id of expanded release

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch(RELEASES_URL, {
      headers: { Accept: 'application/vnd.github+json' }
    })
      .then(r => {
        if (!r.ok) throw new Error(`GitHub API ${r.status}`);
        return r.json();
      })
      .then(data => {
        if (cancelled) return;
        setReleases(data);
        // Auto-expand latest
        if (data.length > 0) setExpanded(data[0].id);
      })
      .catch(err => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, []);

  return (
    <div className="changelog-panel">
      <div className="panel-section-title">Changelog</div>

      <div className="changelog-content">
        {loading && (
          <div className="changelog-state">
            <div className="changelog-spinner" />
            <span>Fetching releases...</span>
          </div>
        )}

        {error && (
          <div className="changelog-state changelog-error">
            <span>⚠ Could not load changelog</span>
            <span className="changelog-err-detail">{error}</span>
          </div>
        )}

        {!loading && !error && releases.length === 0 && (
          <div className="changelog-state">No releases found.</div>
        )}

        {!loading && !error && releases.map(rel => (
          <div
            key={rel.id}
            className={`changelog-entry ${expanded === rel.id ? 'expanded' : ''}`}
          >
            <button
              className="changelog-entry-header"
              onClick={() => setExpanded(expanded === rel.id ? null : rel.id)}
            >
              <div className="changelog-entry-left">
                <span className="changelog-tag">{rel.tag_name}</span>
                {rel.prerelease && <span className="changelog-badge pre">Pre-release</span>}
                {!rel.prerelease && rel.id === releases[0]?.id && (
                  <span className="changelog-badge latest">Latest</span>
                )}
              </div>
              <div className="changelog-entry-right">
                <span className="changelog-date">
                  {new Date(rel.published_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                </span>
                <span className="changelog-chevron">{expanded === rel.id ? '▲' : '▼'}</span>
              </div>
            </button>

            {expanded === rel.id && (
              <div className="changelog-body">
                {rel.name && rel.name !== rel.tag_name && (
                  <div className="changelog-release-name">{rel.name}</div>
                )}
                {rel.body ? (
                  <pre className="changelog-notes">{rel.body.trim()}</pre>
                ) : (
                  <p className="changelog-empty">No release notes provided.</p>
                )}
                <a
                  href={rel.html_url}
                  target="_blank"
                  rel="noreferrer"
                  className="changelog-link"
                >
                  View on GitHub ↗
                </a>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
