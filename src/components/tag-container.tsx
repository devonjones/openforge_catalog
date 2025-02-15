'use client'

import React, { useState } from 'react';
import useStore from '@/stores/tag-store';

const renderTags = (data: Record<string, any>, level = 0, expandedNodes: Record<string, boolean>, toggleNode: (key: string) => void) => {
  return Object.entries(data).map(([tag, value], index) => {
    const key = `${level}-${tag}`;
    const isExpanded = expandedNodes[key] || false;
    const hasChildren = Object.keys(value).some(k => k !== 'count' && k !== '__count');

    return (
      <div key={key} style={{ marginLeft: level * 20 }}>
        <div onClick={() => hasChildren && toggleNode(key)} style={{ cursor: hasChildren ? 'pointer' : 'default' }}>
          {tag}: {value.count ?? value.__count ?? ''}
          {hasChildren && (isExpanded ? ' ▼' : ' ▶')}
        </div>
        {isExpanded && hasChildren && renderTags(value, level + 1, expandedNodes, toggleNode)}
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



