'use client'

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Blueprint, SpriteThumbnailData } from '@/types';

// Drag sensitivity constant
const DRAG_THRESHOLD_PX = 30;

/**
 * Helper functions to derive angle indices from sprite metadata
 */
function getAngleIndices(angles: SpriteThumbnailData['angles']) {
  const topIndex = angles.findIndex(a => a.name === 'top');
  const bottomIndex = angles.findIndex(a => a.name === 'bottom');

  // Count horizontal angles (all except top and bottom)
  const horizontalCount = angles.filter(
    a => a.name !== 'top' && a.name !== 'bottom'
  ).length;

  return {
    horizontalCount,
    topIndex: topIndex !== -1 ? topIndex : 8,  // Default fallback
    bottomIndex: bottomIndex !== -1 ? bottomIndex : 9,  // Default fallback
  };
}

/**
 * Custom hook for keyboard-based sprite rotation
 */
function useKeyboardRotation(
  currentAngle: number,
  setCurrentAngle: (angle: number | ((prev: number) => number)) => void,
  angleIndices: ReturnType<typeof getAngleIndices>
) {
  const { horizontalCount, topIndex, bottomIndex } = angleIndices;

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      setCurrentAngle(prev => {
        // If we're on a vertical angle, go back to front (0)
        if (prev >= topIndex) return 0;
        // Otherwise, previous horizontal angle with wrapping
        return prev <= 0 ? horizontalCount - 1 : prev - 1;
      });
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      setCurrentAngle(prev => {
        // If we're on a vertical angle, go to front (0)
        if (prev >= topIndex) return 0;
        // Otherwise, next horizontal angle with wrapping
        return prev >= horizontalCount - 1 ? 0 : prev + 1;
      });
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setCurrentAngle(topIndex);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setCurrentAngle(bottomIndex);
    }
  }, [setCurrentAngle, topIndex, bottomIndex, horizontalCount]);

  return { handleKeyDown };
}

/**
 * Custom hook for mouse drag-based sprite rotation
 */
function useMouseDragRotation(
  currentAngle: number,
  setCurrentAngle: (angle: number) => void,
  horizontalCount: number
) {
  const [isDragging, setIsDragging] = useState(false);
  const dragStartX = useRef<number>(0);
  const initialAngle = useRef<number>(0);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    setIsDragging(true);
    dragStartX.current = e.clientX;
    initialAngle.current = currentAngle;
  }, [currentAngle]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;

    const deltaX = e.clientX - dragStartX.current;
    const angleChange = Math.floor(deltaX / DRAG_THRESHOLD_PX);

    // Only horizontal angles, wrap around
    let newAngle = (initialAngle.current + angleChange) % horizontalCount;
    if (newAngle < 0) newAngle += horizontalCount;

    setCurrentAngle(newAngle);
  }, [isDragging, setCurrentAngle, horizontalCount]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Setup and cleanup window event listeners for drag
  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  return { handleMouseDown, isDragging };
}

interface SpriteViewerProps {
  blueprint: Blueprint;
  thumbnailData: SpriteThumbnailData;
}

interface SpriteControlsProps {
  currentAngle: number;
  angles: SpriteThumbnailData['angles'];
  onAngleChange: (angle: number) => void;
}

const SpriteControls: React.FC<SpriteControlsProps> = ({ currentAngle, angles, onAngleChange }) => {
  // Build angle map dynamically from angle names to decouple from array order
  const angleMap: Record<number, { label: string; row: number; col: number }> = {};

  // Helper to find angle index by name
  const findAngleIndex = (name: string) => angles.findIndex(a => a.name === name);

  // Layout mapping: angle name -> grid position
  const layoutMap: Record<string, { label: string; row: number; col: number }> = {
    'top': { label: 'TOP', row: 0, col: 1 },
    'front-left': { label: 'FL', row: 1, col: 0 },
    'front': { label: 'F', row: 1, col: 1 },
    'front-right': { label: 'FR', row: 1, col: 2 },
    'left': { label: 'L', row: 2, col: 0 },
    'right': { label: 'R', row: 2, col: 2 },
    'back-left': { label: 'BL', row: 3, col: 0 },
    'back': { label: 'B', row: 3, col: 1 },
    'back-right': { label: 'BR', row: 3, col: 2 },
    'bottom': { label: 'BOT', row: 4, col: 1 },
  };

  // Build the dynamic angle map
  for (const [angleName, layout] of Object.entries(layoutMap)) {
    const angleIndex = findAngleIndex(angleName);
    if (angleIndex !== -1) {
      angleMap[angleIndex] = layout;
    }
  }

  return (
    <div>
      {/* Unwrapped cube layout */}
      <div className="grid grid-cols-3 gap-1" style={{ width: '120px' }}>
        {[0, 1, 2, 3, 4].map(row => (
          [0, 1, 2].map(col => {
            const angleEntry = Object.entries(angleMap).find(
              ([_, pos]) => pos.row === row && pos.col === col
            );

            if (!angleEntry) {
              // Empty cell
              return <div key={`${row}-${col}`} className="w-9 h-8" />;
            }

            const [angleIndexStr, pos] = angleEntry;
            const angleIndex = parseInt(angleIndexStr);
            const isActive = currentAngle === angleIndex;

            return (
              <button
                key={`${row}-${col}`}
                onClick={() => onAngleChange(angleIndex)}
                className={`w-9 h-8 text-xs font-medium rounded transition-colors ${
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                }`}
                aria-label={angles[angleIndex]?.name || pos.label}
                title={angles[angleIndex]?.name || pos.label}
                type="button"
              >
                {pos.label}
              </button>
            );
          })
        ))}
      </div>
    </div>
  );
};

const KeyboardHint: React.FC = () => (
  <div className="text-xs text-gray-500 mt-2 text-center">
    Use arrow keys or drag to rotate view
  </div>
);

const SpriteViewer: React.FC<SpriteViewerProps> = ({ blueprint, thumbnailData }) => {
  const [currentAngle, setCurrentAngle] = useState(thumbnailData.default_angle);
  const containerRef = useRef<HTMLDivElement>(null);

  // Derive angle indices from sprite metadata
  const angleIndices = getAngleIndices(thumbnailData.angles);

  // Use custom hooks for event handling
  const { handleKeyDown } = useKeyboardRotation(currentAngle, setCurrentAngle, angleIndices);
  const { handleMouseDown } = useMouseDragRotation(currentAngle, setCurrentAngle, angleIndices.horizontalCount);

  // Calculate background position based on current angle
  const row = Math.floor(currentAngle / thumbnailData.grid_cols);
  const col = currentAngle % thumbnailData.grid_cols;
  const backgroundPositionX = -(col * thumbnailData.tile_size);
  const backgroundPositionY = -(row * thumbnailData.tile_size);

  // Auto-focus viewer on mount for immediate keyboard navigation
  useEffect(() => {
    containerRef.current?.focus();
  }, []);

  return (
    <div
      ref={containerRef}
      className="flex flex-col items-center focus:outline-none"
      data-testid="sprite-viewer-container"
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      <div className="flex gap-4 items-center">
        <div
          className="cursor-grab active:cursor-grabbing rounded"
          style={{
            backgroundImage: `url(${thumbnailData.sprite_url})`,
            backgroundPosition: `${backgroundPositionX}px ${backgroundPositionY}px`,
            width: `${thumbnailData.tile_size}px`,
            height: `${thumbnailData.tile_size}px`,
            backgroundRepeat: 'no-repeat',
            userSelect: 'none'
          }}
          onMouseDown={handleMouseDown}
          aria-label={`${blueprint.blueprint_name} - 3D model view, current angle: ${thumbnailData.angles[currentAngle]?.name || currentAngle}`}
        />

        <SpriteControls
          currentAngle={currentAngle}
          angles={thumbnailData.angles}
          onAngleChange={setCurrentAngle}
        />
      </div>

      <KeyboardHint />
    </div>
  );
};

export default SpriteViewer;
