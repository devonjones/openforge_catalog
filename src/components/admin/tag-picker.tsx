'use client'

import React, { useState, useEffect } from 'react';

interface TagPickerProps {
  onSelect: (tag: string[]) => void;
  onClose: () => void;
}



const TagPicker: React.FC<TagPickerProps> = ({ onSelect, onClose }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [tags, setTags] = useState<string[][]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const searchTags = async () => {
      if (!searchTerm.trim()) {
        setTags([]);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        // Use the same endpoint as tag-container with search parameter
        const urlParams = new URLSearchParams();
        urlParams.set('search', searchTerm);
        urlParams.set('limit', '50'); // Limit results for better performance

        const requestBody = {
          require: [],
          deny: [],
        };

        const response = await fetch(`/api/blueprints/tags?${urlParams.toString()}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
          throw new Error('Failed to fetch tags');
        }

        const result = await response.json();
        const tagCounts = result.tag_counts || {};
        
        // Convert tag counts to array of tag arrays
        const allTags = Object.keys(tagCounts)
          .map(tag => tag.split('|'))
          .slice(0, 20); // Limit results for UI

        setTags(allTags);
      } catch (err) {
        setError('Failed to search tags');
        console.error('Tag search error:', err);
      } finally {
        setLoading(false);
      }
    };

    const debounceTimer = setTimeout(searchTags, 300);
    return () => clearTimeout(debounceTimer);
  }, [searchTerm]);

  const handleSelect = (tag: string[]) => {
    onSelect(tag);
  };

  const formatTagDisplay = (tag: string[]) => {
    return tag.join(': ');
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Select Tag</h3>
          <button className="modal-close" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="modal-body">
          <div className="search-container">
            <input
              type="text"
              placeholder="Search tags..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          {loading && (
            <div className="loading-message">
              Searching...
            </div>
          )}

          <div className="tag-list">
            {tags.map((tag, index) => (
              <button
                key={index}
                className="tag-item"
                onClick={() => handleSelect(tag)}
                type="button"
              >
                <div className="tag-name">
                  {formatTagDisplay(tag)}
                </div>
                <div className="tag-hierarchy">
                  {tag.map((part, i) => (
                    <span key={i} className="tag-part">
                      {part}
                    </span>
                  ))}
                </div>
              </button>
            ))}
          </div>

          {!loading && !error && tags.length === 0 && searchTerm && (
            <div className="no-results">
              No tags found matching &quot;{searchTerm}&quot;
            </div>
          )}

          {!loading && !error && !searchTerm && (
            <div className="search-prompt">
              Enter a search term to find tags
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TagPicker; 