'use client'

import React, { useState, useEffect } from 'react';
import { Blueprint } from '@/types';

interface BlueprintPickerProps {
  onSelect: (blueprint: Blueprint) => void;
  onClose: () => void;
}

const BlueprintPicker: React.FC<BlueprintPickerProps> = ({ onSelect, onClose }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [blueprints, setBlueprints] = useState<Blueprint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const searchBlueprints = async () => {
      if (!searchTerm.trim()) {
        setBlueprints([]);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/blueprints/tags`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            search: searchTerm,
            limit: 20,
            models: true,
            blueprints: false,
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to search blueprints');
        }

        const data = await response.json();
        setBlueprints(data.blueprints || []);
      } catch (err) {
        setError('Failed to search blueprints');
        console.error('Blueprint search error:', err);
      } finally {
        setLoading(false);
      }
    };

    const debounceTimer = setTimeout(searchBlueprints, 300);
    return () => clearTimeout(debounceTimer);
  }, [searchTerm]);

  const handleSelect = (blueprint: Blueprint) => {
    onSelect(blueprint);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Select Blueprint</h3>
          <button className="modal-close" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="modal-body">
          <div className="search-container">
            <input
              type="text"
              placeholder="Search blueprints..."
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

          <div className="blueprint-list">
            {blueprints.map((blueprint) => (
              <div
                key={blueprint.id}
                className="blueprint-item"
                onClick={() => handleSelect(blueprint)}
              >
                <div className="blueprint-name">
                  {blueprint.blueprint_name}
                </div>
                <div className="blueprint-meta">
                  <span className="blueprint-type">{blueprint.blueprint_type}</span>
                  <span className="blueprint-tags">
                    {blueprint.tags.slice(0, 3).join(', ')}
                    {blueprint.tags.length > 3 && '...'}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {!loading && !error && blueprints.length === 0 && searchTerm && (
            <div className="no-results">
              No blueprints found matching &quot;{searchTerm}&quot;
            </div>
          )}

          {!loading && !error && !searchTerm && (
            <div className="search-prompt">
              Enter a search term to find blueprints
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BlueprintPicker; 