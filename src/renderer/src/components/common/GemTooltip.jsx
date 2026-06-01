import React, { useEffect, useRef, useState } from 'react';
import { useBuildStore } from '../../store/useBuildStore';
import { getGemDataById } from '../../utils/database';

export default function GemTooltip() {
  const tooltipState = useBuildStore((state) => state.tooltip);
  const [style, setStyle] = useState({ display: 'none' });
  const tooltipRef = useRef(null);

  useEffect(() => {
    if (tooltipState && tooltipRef.current) {
      const tooltipRect = tooltipRef.current.getBoundingClientRect();
      const targetRect = tooltipState.rect;
      
      let top = targetRect.bottom + 10;
      let left = targetRect.left + (targetRect.width / 2) - (tooltipRect.width / 2);

      if (left < 10) left = 10;
      if (left + tooltipRect.width > window.innerWidth - 10) {
        left = window.innerWidth - tooltipRect.width - 10;
      }
      if (top + tooltipRect.height > window.innerHeight - 10) {
        top = targetRect.top - tooltipRect.height - 10;
      }

      setStyle({
        position: 'fixed',
        top: `${top}px`,
        left: `${left}px`,
        zIndex: 10000,
        pointerEvents: 'none',
        display: 'block'
      });
    } else {
      setStyle({ display: 'none' });
    }
  }, [tooltipState]);

  if (!tooltipState) return null;

  const gem = getGemDataById(tooltipState.gemId);
  if (!gem) return null;

  const title = gem.Gem || gem.name;
  const tags = gem.Tags && gem.Tags.length > 0 ? gem.Tags.join(', ') : null;

  const formatText = (text) => {
    if (!text) return "";
    let formatted = text.replace(/\[([^|\\]+)\|([^\]]+)\]/g, '<span style="color: #6495ED;">$2</span>');
    formatted = formatted.replace(/\[([^\]]+)\]/g, '<span style="color: #6495ED;">$1</span>');
    formatted = formatted.replace(/\\n/g, '<br>');
    return formatted;
  };

  return (
    <div 
      ref={tooltipRef}
      id="gem-tooltip" 
      className="game-tooltip-panel" 
      style={{
        ...style,
        maxWidth: '400px',
        background: 'rgba(10, 15, 20, 0.95)',
        border: '1px solid var(--border-gold-dark)',
        textAlign: 'center'
      }}
    >
      <div className="tooltip-border-top" />
      <div className="tooltip-header" style={{ paddingBottom: '5px' }}>
        <h4 id="gem-tooltip-title" className="tooltip-title" style={{ color: 'var(--color-gem-active, #189dbd)', fontSize: '1.2em', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '5px' }}>{title}</h4>
        {tags && (
          <div id="gem-tooltip-tags" className="tooltip-tags" style={{ color: '#666', fontSize: '0.75em', textTransform: 'uppercase', marginBottom: '5px', fontFamily: "'Cinzel', serif" }}>{tags}</div>
        )}
        <div style={{ fontSize: '0.85em', color: '#aaa' }}>Level Required: <span style={{ color: 'white' }}>{gem.Level || 1}</span></div>
      </div>
      <div className="tooltip-divider"></div>
      
      <div id="gem-tooltip-stats" className="tooltip-content" style={{ textShadow: '1px 1px 2px #000', fontSize: '0.9em', padding: '10px 0' }}>
        {gem.BaseCastTime && (
          <div style={{ marginBottom: '2px', color: '#aaa' }}>
            Cast Time: <span style={{ color: 'white' }}>{gem.BaseCastTime / 1000} sec</span>
          </div>
        )}
        {gem.Cost?.ManaPerMinute && (
          <div style={{ marginBottom: '2px', color: '#aaa' }}>
            Cost: <span style={{ color: 'white' }}>{(gem.Cost.ManaPerMinute / 60).toFixed(2)} Mana per second</span>
          </div>
        )}
        {gem.StatText && gem.StatText.map((stat, i) => (
          <div 
            key={i} 
            style={{ marginBottom: '2px', color: '#8888FF' }}
            dangerouslySetInnerHTML={{ __html: formatText(stat) }}
          />
        ))}
      </div>

      {gem.Description && (
        <>
          <div id="gem-tooltip-desc-divider" className="tooltip-divider"></div>
          <div 
            id="gem-tooltip-desc" 
            className="tooltip-content"
            style={{ color: '#a38d6d', fontStyle: 'italic', fontSize: '0.85em', textAlign: 'left', padding: '5px 10px' }}
            dangerouslySetInnerHTML={{ __html: formatText(gem.Description) }}
          />
        </>
      )}
      <div className="tooltip-border-bottom" />
    </div>
  );
}
