'use client'

import React, { useState, useCallback, useEffect } from 'react';
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
  handleAddTag: (tag: string) => void
) => {
  return Object.entries(data).map(([tag, value], index) => {
    
    if (tag.startsWith('__') || tag === 'children') return null;

    const key = `${level}-${tag}`;
    const isExpanded = expandedNodes[key] || false;
    const hasChildren = value.children && Object.keys(value.children).length > 0;

    return (
      <div key={key} className="tagNode" style={{ marginLeft: level * 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', whiteSpace: 'nowrap' }}>
          {hasChildren && (
            <span onClick={() => toggleNode(key)} className="expandButton">
              {isExpanded ? '▼' : '▶'}
            </span>
          )}
          <span>
            {tag} {value.__subTags > 0 && `(${value.__subTags}) `}
            {value.__count && (
              <span className="tagButton" onClick={() => handleAddTag(value.__name)}>
                +
              </span>
            )}
          </span>
        </div>
        {isExpanded && hasChildren && renderTags(value.children, level + 1, expandedNodes, toggleNode, handleAddTag)}
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
  const [searchInput, setSearchInput] = useState(searchTerm || "");
  const debouncedSearchInput = useDebounce(searchInput, 300);

  // Sync searchInput with searchTerm from store
  React.useEffect(() => {
    setSearchInput(searchTerm || "");
  }, [searchTerm]);

  // Apply debounced search
  useEffect(() => {
    setSearchTerm(debouncedSearchInput.trim() || null);
  }, [debouncedSearchInput, setSearchTerm]);

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
      <div>{renderTags(data, 0, expandedNodes, toggleNode, handleAddTag)}</div>
    </div>
  );
};

export default TagContainer;
