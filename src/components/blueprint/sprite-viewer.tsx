'use client'

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Blueprint, SpriteThumbnailData } from '@/types';

// Constants for sprite viewer rotation logic
const HORIZONTAL_ANGLE_COUNT = 8;
const TOP_ANGLE_INDEX = 8;
const BOTTOM_ANGLE_INDEX = 9;
const DRAG_THRESHOLD_PX = 30;

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
  // Map angle indices to their positions in the unwrapped cube layout
  const angleMap: Record<number, { label: string; row: number; col: number }> = {
    [TOP_ANGLE_INDEX]: { label: 'TOP', row: 0, col: 1 },       // Top
    7: { label: 'FL', row: 1, col: 0 },         // Front-left
    0: { label: 'F', row: 1, col: 1 },          // Front
    1: { label: 'FR', row: 1, col: 2 },         // Front-right
    6: { label: 'L', row: 2, col: 0 },          // Left
    2: { label: 'R', row: 2, col: 2 },          // Right
    5: { label: 'BL', row: 3, col: 0 },         // Back-left
    4: { label: 'B', row: 3, col: 1 },          // Back
    3: { label: 'BR', row: 3, col: 2 },         // Back-right
    [BOTTOM_ANGLE_INDEX]: { label: 'BOT', row: 4, col: 1 },        // Bottom
  };

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
  const [isDragging, setIsDragging] = useState(false);

  const dragStartX = useRef<number>(0);
  const initialAngle = useRef<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Calculate background position based on current angle
  const row = Math.floor(currentAngle / thumbnailData.grid_cols);
  const col = currentAngle % thumbnailData.grid_cols;
  const backgroundPositionX = -(col * thumbnailData.tile_size);
  const backgroundPositionY = -(row * thumbnailData.tile_size);

  // Mouse drag handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    setIsDragging(true);
    dragStartX.current = e.clientX;
    initialAngle.current = currentAngle;
  }, [currentAngle]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;

    const deltaX = e.clientX - dragStartX.current;
    const angleChange = Math.floor(deltaX / DRAG_THRESHOLD_PX);

    // Only horizontal angles (0-7), wrap around
    let newAngle = (initialAngle.current + angleChange) % HORIZONTAL_ANGLE_COUNT;
    if (newAngle < 0) newAngle += HORIZONTAL_ANGLE_COUNT;

    setCurrentAngle(newAngle);
  }, [isDragging]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    // Refocus the container after drag ends
    containerRef.current?.focus();
  }, []);

  // Keyboard navigation handler
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      setCurrentAngle(prev => {
        // If we're on a vertical angle, go back to front (0)
        if (prev >= TOP_ANGLE_INDEX) return 0;
        // Otherwise, previous horizontal angle with wrapping
        return prev <= 0 ? HORIZONTAL_ANGLE_COUNT - 1 : prev - 1;
      });
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      setCurrentAngle(prev => {
        // If we're on a vertical angle, go to front (0)
        if (prev >= TOP_ANGLE_INDEX) return 0;
        // Otherwise, next horizontal angle with wrapping
        return prev >= HORIZONTAL_ANGLE_COUNT - 1 ? 0 : prev + 1;
      });
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setCurrentAngle(TOP_ANGLE_INDEX);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setCurrentAngle(BOTTOM_ANGLE_INDEX);
    }
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

  // Auto-focus viewer on mount for immediate keyboard navigation
  useEffect(() => {
    containerRef.current?.focus();
  }, []);

  // Reset angle to default when blueprint changes
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCurrentAngle(thumbnailData.default_angle);
  }, [thumbnailData.sprite_url, thumbnailData.default_angle]);

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
