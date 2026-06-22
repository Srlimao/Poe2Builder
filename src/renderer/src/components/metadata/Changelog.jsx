import React, { useState, useEffect } from 'react';

const GITHUB_REPO = 'Srlimao/Poe2Builder';
const RELEASES_URL = `https://api.github.com/repos/${GITHUB_REPO}/releases?per_page=10`;

// ── Lightweight Markdown → HTML ───────────────────────────────────────────────
// Handles the subset commonly used in GitHub release notes.
function mdToHtml(md) {
  if (!md) return '';

  const lines = md.split('\n');
  const out = [];
  let inList = false;

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];

    // Horizontal rule
    if (/^---+$/.test(line.trim())) {
      if (inList) { out.push('</ul>'); inList = false; }
      out.push('<hr/>');
      continue;
    }

    // Headings
    const h3 = line.match(/^###\s+(.*)/);
    const h2 = line.match(/^##\s+(.*)/);
    const h1 = line.match(/^#\s+(.*)/);
    if (h1 || h2 || h3) {
      if (inList) { out.push('</ul>'); inList = false; }
      const level = h1 ? 1 : h2 ? 2 : 3;
      const text = inlineFormat(h1?.[1] ?? h2?.[1] ?? h3?.[1]);
      out.push(`<h${level} class="md-h${level}">${text}</h${level}>`);
      continue;
    }

    // Unordered list item (- or *)
    const li = line.match(/^[-*]\s+(.*)/);
    if (li) {
      if (!inList) { out.push('<ul class="md-list">'); inList = true; }
      out.push(`<li>${inlineFormat(li[1])}</li>`);
      continue;
    }

    // Close list on blank/non-list line
    if (inList && line.trim() === '') {
      out.push('</ul>');
      inList = false;
      out.push('<br/>');
      continue;
    }

    if (inList) { out.push('</ul>'); inList = false; }

    // Blank line → spacing
    if (line.trim() === '') {
      out.push('<br/>');
      continue;
    }

    // Regular paragraph line
    out.push(`<p class="md-p">${inlineFormat(line)}</p>`);
  }

  if (inList) out.push('</ul>');
  return out.join('');
}

// Inline formatting: bold, italic, inline code, links
function inlineFormat(text) {
  return text
    // Escape HTML special chars first
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    // Inline code: `code`
    .replace(/`([^`]+)`/g, '<code class="md-code">$1</code>')
    // Bold+italic: ***text***
    .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
    // Bold: **text**
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    // Italic: *text* or _text_
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/_(.+?)_/g, '<em>$1</em>')
    // Links: [text](url)
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g,
      '<a href="$2" target="_blank" rel="noreferrer" class="md-link">$1 ↗</a>');
}

function MarkdownBody({ src }) {
  return (
    <div
      className="changelog-md"
      dangerouslySetInnerHTML={{ __html: mdToHtml(src.trim()) }}
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────────

export default function Changelog() {
  const [releases, setReleases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState(null);

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
                  <MarkdownBody src={rel.body} />
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
