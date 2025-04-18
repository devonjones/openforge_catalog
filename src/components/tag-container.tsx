'use client'

import React, { useState } from 'react';
import useTagStore from '@/stores/tag-store';
import useBlueprintStore from '@/stores/blueprints-store';

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
  const data = useTagStore((state) => state.data);
  const addTag = useBlueprintStore((state) => state.addTag);
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({});

  const toggleNode = (key: string) => {
    setExpandedNodes((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleAddTag = (tag: string) => {
    addTag(tag);
  };

  return (
    <div className="tagContainer">
      <div>Browse Tags</div>
      <div>{renderTags(data, 0, expandedNodes, toggleNode, handleAddTag)}</div>
    </div>
  );
};

export default TagContainer;



