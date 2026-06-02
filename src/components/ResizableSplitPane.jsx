import React, { useState, useRef, useCallback, useEffect } from 'react';
import { GripVertical, PanelLeftClose, PanelRightClose, Maximize2 } from 'lucide-react';

const ResizableSplitPane = ({ 
  left, 
  right, 
  defaultLeftWidth = 55, // percentage
  minLeftWidth = 30,
  maxLeftWidth = 80,
  leftLabel = 'Editor',
  rightLabel = 'Preview',
}) => {
  const [leftWidth, setLeftWidth] = useState(defaultLeftWidth);
  const [isLeftHidden, setIsLeftHidden] = useState(false);
  const [isRightHidden, setIsRightHidden] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef(null);
  const savedLeftWidth = useRef(defaultLeftWidth);
  const isDraggingRef = useRef(false);

  const handleMouseDown = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    isDraggingRef.current = true;
    setIsDragging(true);
  }, []);

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isDraggingRef.current || !containerRef.current) return;
      
      e.preventDefault();
      const container = containerRef.current;
      const rect = container.getBoundingClientRect();
      const newLeftWidth = ((e.clientX - rect.left) / rect.width) * 100;
      
      // Clamp to min/max
      const clampedWidth = Math.min(Math.max(newLeftWidth, minLeftWidth), maxLeftWidth);
      setLeftWidth(clampedWidth);
      savedLeftWidth.current = clampedWidth;
    };

    const handleMouseUp = () => {
      if (isDraggingRef.current) {
        isDraggingRef.current = false;
        setIsDragging(false);
      }
    };

    // Always listen to these events
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [minLeftWidth, maxLeftWidth]);

  // Update body styles when dragging changes
  useEffect(() => {
    if (isDragging) {
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    } else {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }
    
    return () => {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isDragging]);

  const hideLeft = () => {
    savedLeftWidth.current = leftWidth;
    setIsLeftHidden(true);
    setIsRightHidden(false);
  };

  const hideRight = () => {
    savedLeftWidth.current = leftWidth;
    setIsRightHidden(true);
    setIsLeftHidden(false);
  };

  const showBoth = () => {
    setIsLeftHidden(false);
    setIsRightHidden(false);
    setLeftWidth(savedLeftWidth.current);
  };

  // Calculate actual widths
  const actualLeftWidth = isLeftHidden ? 0 : isRightHidden ? 100 : leftWidth;
  const actualRightWidth = isRightHidden ? 0 : isLeftHidden ? 100 : 100 - leftWidth;

  return (
    <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
      {/* Toggle Bar */}
      <div className="h-8 bg-neutral-100 border-b border-neutral-200 flex items-center justify-center gap-2 px-4 flex-shrink-0">
        <div className="flex items-center gap-1">
          <button
            onClick={hideRight}
            disabled={isRightHidden}
            className={`p-1 rounded text-xs flex items-center gap-1 transition-colors ${
              isRightHidden 
                ? 'bg-neutral-900 text-white' 
                : 'text-neutral-600 hover:bg-neutral-200'
            }`}
            title={`Show only ${leftLabel}`}
          >
            <PanelRightClose className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{leftLabel}</span>
          </button>
          
          <button
            onClick={showBoth}
            disabled={!isLeftHidden && !isRightHidden}
            className={`p-1 rounded text-xs flex items-center gap-1 transition-colors ${
              !isLeftHidden && !isRightHidden
                ? 'bg-neutral-900 text-white'
                : 'text-neutral-600 hover:bg-neutral-200'
            }`}
            title="Show both panels"
          >
            <Maximize2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Both</span>
          </button>
          
          <button
            onClick={hideLeft}
            disabled={isLeftHidden}
            className={`p-1 rounded text-xs flex items-center gap-1 transition-colors ${
              isLeftHidden 
                ? 'bg-neutral-900 text-white' 
                : 'text-neutral-600 hover:bg-neutral-200'
            }`}
            title={`Show only ${rightLabel}`}
          >
            <PanelLeftClose className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{rightLabel}</span>
          </button>
        </div>
      </div>

      {/* Split Pane Content */}
      <div 
        ref={containerRef}
        className="flex-1 min-w-0 flex overflow-hidden relative"
      >
        {/* Drag Overlay - captures all mouse events during drag */}
        {isDragging && (
          <div className="fixed inset-0 z-50 cursor-col-resize" />
        )}

        {/* Left Panel */}
        {!isLeftHidden && (
          <div 
            className={`min-w-0 overflow-hidden flex flex-col ${isDragging ? '' : 'transition-all duration-200'}`}
            style={{ width: `${actualLeftWidth}%` }}
          >
            {left}
          </div>
        )}

        {/* Resize Handle */}
        {!isLeftHidden && !isRightHidden && (
          <div
            onMouseDown={handleMouseDown}
            className={`w-2 hover:w-2 bg-neutral-200 hover:bg-blue-500 cursor-col-resize flex-shrink-0 flex items-center justify-center group transition-colors ${
              isDragging ? 'bg-blue-500 w-2' : ''
            }`}
          >
            <div className={`w-4 h-8 flex items-center justify-center rounded transition-colors ${
              isDragging ? 'bg-blue-500' : 'bg-neutral-300 group-hover:bg-blue-400'
            }`}>
              <GripVertical className={`w-3 h-3 ${isDragging ? 'text-white' : 'text-neutral-600 group-hover:text-white'}`} />
            </div>
          </div>
        )}

        {/* Right Panel */}
        {!isRightHidden && (
          <div 
            className={`min-w-0 overflow-hidden flex flex-col ${isDragging ? '' : 'transition-all duration-200'}`}
            style={{ width: `${actualRightWidth}%` }}
          >
            {right}
          </div>
        )}
      </div>
    </div>
  );
};

export default ResizableSplitPane;
