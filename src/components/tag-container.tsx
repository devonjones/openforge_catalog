'use client'

import React, { useState } from 'react';
import useStore from '@/stores/tag-store';

const renderTags = (data: Record<string, any>, level = 0, expandedNodes: Record<string, boolean>, toggleNode: (key: string) => void) => {
  return Object.entries(data).map(([tag, value], index) => {
    if (tag.startsWith('__') || tag === 'children') return null;

    const key = `${level}-${tag}`;
    const isExpanded = expandedNodes[key] || false;
    const hasChildren = value.children && Object.keys(value.children).length > 0;

    return (
      <div key={key} style={{ marginLeft: level * 20 }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          {hasChildren && (
            <span onClick={() => toggleNode(key)} style={{ cursor: 'pointer', marginRight: 5 }}>
              {isExpanded ? '▼' : '▶'}
            </span>
          )}
          <span>{tag} {value.__subTags > 0 && `(${value.__subTags})`}</span>
        </div>
        {isExpanded && hasChildren && renderTags(value.children, level + 1, expandedNodes, toggleNode)}
      </div>
    );
  });
};

const TagContainer = () => {
  const data = useStore((state) => state.data);
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({});

  const toggleNode = (key: string) => {
    setExpandedNodes((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  return (
    <div className='tagContainer'>
      <div>Browse Tags</div>
      <div>{renderTags(data, 0, expandedNodes, toggleNode)}</div>
    </div>
  );
};

export default TagContainer;



