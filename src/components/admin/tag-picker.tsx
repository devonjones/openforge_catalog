'use client'

import React, { useState, useEffect } from 'react';

interface TagPickerProps {
  onSelect: (tag: string[]) => void;
  onClose: () => void;
}

interface TagSearchResult {
  tag: string;
  blueprint_count: number;
}



const TagPicker: React.FC<TagPickerProps> = ({ onSelect, onClose }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [tags, setTags] = useState<TagSearchResult[]>([]);
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
        // Use the new search endpoint with pagination
        const urlParams = new URLSearchParams();
        urlParams.set('search', searchTerm);
        urlParams.set('limit', '50'); // Limit results for better performance
        urlParams.set('offset', '0');

        const response = await fetch(`/api/tags/search?${urlParams.toString()}`);

        if (!response.ok) {
          throw new Error('Failed to fetch tags');
        }

        const result = await response.json();
        setTags(result.tags || []);
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

  const handleSelect = (tagResult: TagSearchResult) => {
    // Convert pipe-delimited string back to array
    const tagArray = tagResult.tag.split('|');
    onSelect(tagArray);
  };

  const formatTagDisplay = (tag: string) => {
    return tag.split('|').join(': ');
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
            {tags.map((tagResult, index) => (
              <button
                key={index}
                className="tag-item"
                onClick={() => handleSelect(tagResult)}
                type="button"
              >
                <div className="tag-name">
                  {formatTagDisplay(tagResult.tag)}
                  <span className="tag-count">({tagResult.blueprint_count})</span>
                </div>
                <div className="tag-hierarchy">
                  {tagResult.tag.split('|').map((part, i) => (
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