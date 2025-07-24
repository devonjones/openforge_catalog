'use client'

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import type { TagNode } from '@/types';

interface AdminTagPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (tag: string[]) => void;
}

// Simplified version of tag rendering with selection capability
const renderSelectableTags = (
  data: Record<string, TagNode>,
  level = 0,
  expandedNodes: Record<string, boolean>,
  toggleNode: (key: string) => void,
  onSelectTag: (tag: string) => void,
  searchTerm: string
) => {
  return Object.entries(data).map(([tag, value]) => {
    if (tag.startsWith('__') || tag === 'children') return null;

    const key = `${level}-${tag}`;
    const isExpanded = expandedNodes[key] || false;
    const hasChildren = value.children && Object.keys(value.children).length > 0;
    const fullTagName = value.__name as string;
    
    // Simple search filter
    if (searchTerm && !fullTagName.toLowerCase().includes(searchTerm.toLowerCase())) {
      // Still render if children match
      if (hasChildren && value.children) {
        const hasMatchingChild = Object.values(value.children).some(child => 
          (child.__name as string).toLowerCase().includes(searchTerm.toLowerCase())
        );
        if (!hasMatchingChild) return null;
      } else {
        return null;
      }
    }

    return (
      <div key={key} className="tagNode" style={{ marginLeft: level * 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', whiteSpace: 'nowrap' }}>
          {hasChildren && (
            <span onClick={() => toggleNode(key)} className="expandButton">
              {isExpanded ? (
                <svg width="14" height="14" viewBox="0 0 12 12" style={{ display: 'inline', verticalAlign: 'middle' }}>
                  <path d="M2 3L6 10L10 3Z" fill="currentColor"/>
                </svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 12 12" style={{ display: 'inline', verticalAlign: 'middle' }}>
                  <path d="M3 2L10 6L3 10Z" fill="currentColor"/>
                </svg>
              )}
            </span>
          )}
          <span 
            onClick={() => onSelectTag(fullTagName)}
            style={{ 
              cursor: 'pointer', 
              padding: '2px 6px',
              borderRadius: '3px',
              transition: 'background-color 0.2s'
            }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#e0e0e0'; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
          >
            {tag} {typeof value.__subTags === 'number' && value.__subTags > 0 && `(${value.__subTags})`}
          </span>
        </div>
        {isExpanded && hasChildren && value.children && 
          renderSelectableTags(value.children, level + 1, expandedNodes, toggleNode, onSelectTag, searchTerm)
        }
      </div>
    );
  });
};

const AdminTagPicker = ({ isOpen, onClose, onSelect }: AdminTagPickerProps): React.ReactPortal | null => {
  const [tagData, setTagData] = useState<Record<string, TagNode>>({});
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  // Fetch all tags on mount
  useEffect(() => {
    if (!isOpen) return;
    
    const fetchTags = async () => {
      try {
        const response = await fetch('/api/blueprints/tags', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ require: [], deny: [] })
        });
        
        if (response.ok) {
          const data = await response.json();
          
          // Build hierarchical structure from flat tag list
          const tagTree: Record<string, TagNode> = {};
          const tagCounts = data.tag_counts || {};
          
          Object.keys(tagCounts).forEach(tagString => {
            const parts = tagString.split('|');
            let current = tagTree;
            
            parts.forEach((part, index) => {
              if (!current[part]) {
                current[part] = {
                  __name: parts.slice(0, index + 1).join('|'),
                  __count: 0,
                  __subTags: 0,
                  children: {}
                };
              }
              
              if (index === parts.length - 1) {
                current[part].__count = tagCounts[tagString];
              }
              
              current = current[part].children!;
            });
          });
          
          setTagData(tagTree);
        }
      } catch (error) {
        console.error('Failed to fetch tags:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchTags();
  }, [isOpen]);

  const toggleNode = useCallback((key: string) => {
    setExpandedNodes(prev => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const handleSelectTag = useCallback((tagString: string) => {
    const tagArray = tagString.split('|');
    onSelect(tagArray);
    onClose();
  }, [onSelect, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px', maxHeight: '80vh' }}>
        <div className="modal-header">
          <h3>Select Tag</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        
        <div className="modal-body" style={{ overflow: 'auto' }}>
          <div className="search-container" style={{ marginBottom: '1rem' }}>
            <input
              type="text"
              placeholder="Search tags..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
              style={{ width: '100%' }}
            />
          </div>
          
          {loading ? (
            <div className="loading-message">Loading tags...</div>
          ) : (
            <div className="tag-tree-container">
              {renderSelectableTags(tagData, 0, expandedNodes, toggleNode, handleSelectTag, searchTerm)}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};

export default AdminTagPicker;