'use client'

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useTagContext } from '@/contexts/tag-context';

const useDebounce = <T,>(value: T, delay: number): T => {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debouncedValue;
};

const renderTags = (
  data: Record<string, any>,
  level = 0,
  expandedNodes: Record<string, boolean>,
  toggleNode: (key: string) => void,
  handleAddTag: (tag: string) => void,
  tagDescriptions: Record<string, string>,
  onTagHover: (tag: string | null, rect?: DOMRect) => void
) => {
  return Object.entries(data).map(([tag, value], index) => {
    if (tag.startsWith('__') || tag === 'children') return null;

    const key = `${level}-${tag}`;
    const isExpanded = expandedNodes[key] || false;
    const hasChildren = value.children && Object.keys(value.children).length > 0;
    const description = tagDescriptions[value.__name];

    return (
      <div key={key} className="tagNode" style={{ marginLeft: level * 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', whiteSpace: 'nowrap' }}>
          {hasChildren && (
            <span onClick={() => toggleNode(key)} className="expandButton">
              {hasChildren && (
                isExpanded ? (
                  <svg width="14" height="14" viewBox="0 0 12 12" style={{ display: 'inline', verticalAlign: 'middle' }}><path d="M2 3L6 10L10 3Z" fill="currentColor"/></svg>
                ) : (
                  <svg width="14" height="14" viewBox="0 0 12 12" style={{ display: 'inline', verticalAlign: 'middle' }}><path d="M3 2L10 6L3 10Z" fill="currentColor"/></svg>
                )
              )}
            </span>
          )}
          <span
            className="group relative"
            onMouseEnter={e => {
              if (description) {
                const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                onTagHover(value.__name, rect);
              }
            }}
            onMouseLeave={() => onTagHover(null)}
          >
            {tag} {value.__subTags > 0 && `(${value.__subTags}) `}
            {value.__count && (
              <span className="tagButton" onClick={() => handleAddTag(value.__name)}>
                +
              </span>
            )}
            {description && (
              <span className="ml-1 text-gray-500 group-hover:text-gray-700">
                <svg className="w-4 h-4 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </span>
            )}
          </span>
        </div>
        {isExpanded && hasChildren && renderTags(value.children, level + 1, expandedNodes, toggleNode, handleAddTag, tagDescriptions, onTagHover)}
      </div>
    );
  });
};

const TagContainer = () => {
  const data = useTagContext((state) => state.data);
  const expandedNodes = useTagContext((state) => state.expandedNodes);
  const toggleNode = useTagContext((state) => state.toggleNode);
  const addTag = useTagContext((state) => state.addTag);
  const setSearchTerm = useTagContext((state) => state.setSearchTerm);
  const searchTerm = useTagContext((state) => state.searchTerm);
  const tagDescriptions = useTagContext((state) => state.tagDescriptions);
  const fetchTagDescriptions = useTagContext((state) => state.fetchTagDescriptions);
  const [searchInput, setSearchInput] = useState(searchTerm || "");
  const debouncedSearchInput = useDebounce(searchInput, 300);

  // Tooltip state
  const [hoveredTag, setHoveredTag] = useState<string | null>(null);
  const [tooltipRect, setTooltipRect] = useState<DOMRect | null>(null);
  const hoverTimeout = useRef<NodeJS.Timeout | null>(null);

  // Fetch tag descriptions on mount
  useEffect(() => {
    fetchTagDescriptions();
  }, [fetchTagDescriptions]);

  // Sync searchInput with searchTerm from store
  React.useEffect(() => {
    setSearchInput(searchTerm || "");
  }, [searchTerm]);

  // Apply debounced search
  useEffect(() => {
    setSearchTerm(debouncedSearchInput.trim() || null);
  }, [debouncedSearchInput, setSearchTerm]);

  // Cleanup hover timeout on unmount
  useEffect(() => {
    return () => {
      if (hoverTimeout.current) clearTimeout(hoverTimeout.current);
    };
  }, []);

  const handleAddTag = (tag: string) => {
    addTag(tag);
  };

  const handleSearchKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      const term = searchInput.trim();
      setSearchTerm(term || null);
    }
  }, [searchInput, setSearchTerm]);

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchInput(e.target.value);
  }, []);

  // Tooltip handler with delay
  const handleTagHover = (tag: string | null, rect?: DOMRect) => {
    if (hoverTimeout.current) clearTimeout(hoverTimeout.current);
    if (tag && rect) {
      hoverTimeout.current = setTimeout(() => {
        setHoveredTag(tag);
        setTooltipRect(rect);
      }, 500);
    } else {
      setHoveredTag(null);
      setTooltipRect(null);
    }
  };

  return (
    <div className="tagContainer">
      <input
        type="text"
        value={searchInput}
        onChange={handleSearchChange}
        onKeyDown={handleSearchKeyDown}
        placeholder="Search blueprints..."
        style={{ backgroundColor: searchTerm ? '#f0f0f0' : 'white' }}
      />
      <div><strong>Browse Tags</strong></div>
      <div>{renderTags(data, 0, expandedNodes, toggleNode, handleAddTag, tagDescriptions, handleTagHover)}</div>
      {hoveredTag && tooltipRect && tagDescriptions[hoveredTag] && createPortal(
        <div
          style={{
            position: 'fixed',
            top: tooltipRect.top + tooltipRect.height + 4,
            left: Math.max(8, tooltipRect.left - 100),
            width: 400,
            zIndex: 2000,
            background: 'white',
            border: '2px solid #333',
            borderRadius: 8,
            boxShadow: '0 8px 32px rgba(0,0,0,0.35)',
            padding: 16,
            color: '#222',
            fontSize: 14,
            pointerEvents: 'none',
          }}
        >
          {tagDescriptions[hoveredTag]}
        </div>,
        document.body
      )}
    </div>
  );
};

export default TagContainer;
