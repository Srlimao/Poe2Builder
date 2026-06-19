import React from 'react';
import { useBuildStore } from '../../store/useBuildStore';
import { getGemColor, getGemDisplayName } from '../../utils/database';

export default function GemSocket({ 
  gemId, 
  socketType, // 'skill' | 'support' | 'empty-support'
  sIdx, 
  supIdx = -1,
  onClick
}) {
  const selectedElement = useBuildStore((state) => state.selectedElement);
  const showTooltip = useBuildStore((state) => state.showTooltip);
  const hideTooltip = useBuildStore((state) => state.hideTooltip);

  const isSelected = selectedElement && (
    (socketType === 'skill' && selectedElement.type === 'skill' && selectedElement.skillIndex === sIdx) ||
    (socketType === 'support' && selectedElement.type === 'support' && selectedElement.skillIndex === sIdx && selectedElement.supportIndex === supIdx)
  );

  const color = socketType !== 'empty-support' ? getGemColor(gemId) : null;
  const displayName = socketType !== 'empty-support' ? getGemDisplayName(gemId) : '';

  const classNames = [
    socketType === 'skill' ? 'socket-active' : 'socket-support',
    socketType === 'empty-support' ? 'empty-support' : '',
    color ? `gem-${color}` : '',
    isSelected ? 'selected' : ''
  ].filter(Boolean).join(' ');

  const labelSymbol = socketType === 'empty-support'
    ? '+'
    : (displayName.charAt(0) || '?');

  const handleMouseEnter = (e) => {
    if (socketType === 'empty-support' || !gemId) return;
    const rect = e.currentTarget.getBoundingClientRect();
    showTooltip(gemId, rect);
  };

  const handleMouseLeave = () => {
    hideTooltip();
  };

  return (
    <div 
      className={classNames}
      onClick={onClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <span className={socketType === 'skill' ? 'gem-label-symbol' : 'support-label-symbol'}>
        {labelSymbol}
      </span>
    </div>
  );
}
