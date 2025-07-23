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
        // Search for tags that contain the search term
        const response = await fetch(`/api/tag-descriptions`);
        if (!response.ok) {
          throw new Error('Failed to fetch tags');
        }

        const data = await response.json();
        const allTags = Object.keys(data);
        
        // Filter tags that match the search term
        const matchingTags = allTags
          .filter(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
          .map(tag => tag.split('|'))
          .slice(0, 20); // Limit results

        setTags(matchingTags);
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
              <div
                key={index}
                className="tag-item"
                onClick={() => handleSelect(tag)}
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
              </div>
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