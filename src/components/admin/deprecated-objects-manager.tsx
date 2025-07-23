'use client'

import React, { useState, useEffect } from 'react';

interface DeprecatedBlueprint {
  id: string;
  blueprint_name: string;
  deprecated: boolean;
  successor_id: string | null;
  successor_name?: string;
  created_at: string;
  updated_at: string;
}

const DeprecatedObjectsManager: React.FC = () => {
  const [deprecatedBlueprints, setDeprecatedBlueprints] = useState<DeprecatedBlueprint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDeprecatedBlueprints();
  }, []);

  const loadDeprecatedBlueprints = async () => {
    try {
      // This would need a new API endpoint to fetch deprecated blueprints
      // For now, we'll use a placeholder
      setDeprecatedBlueprints([]);
    } catch (err) {
      setError('Failed to load deprecated blueprints');
      console.error('Deprecated blueprints loading error:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="deprecated-objects-manager">
      <div className="manager-header">
        <h3>Deprecated Objects</h3>
        <p>Manage deprecated blueprints and their successor relationships</p>
      </div>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      {loading && (
        <div className="loading-message">
          Loading deprecated blueprints...
        </div>
      )}

      {!loading && !error && (
        <div className="deprecated-content">
          {deprecatedBlueprints.length === 0 ? (
            <div className="no-deprecated">
              <p>No deprecated blueprints found.</p>
              <p>Blueprints are marked as deprecated when they are replaced by newer versions.</p>
            </div>
          ) : (
            <div className="deprecated-list">
              {deprecatedBlueprints.map((blueprint) => (
                <div key={blueprint.id} className="deprecated-item">
                  <div className="deprecated-info">
                    <h4>{blueprint.blueprint_name}</h4>
                    <div className="deprecated-meta">
                      <span className="deprecated-date">
                        Deprecated: {formatDate(blueprint.updated_at)}
                      </span>
                      {blueprint.successor_id && (
                        <span className="successor-info">
                          Successor: {blueprint.successor_name || blueprint.successor_id}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="deprecated-actions">
                    <button className="view-successor-btn">
                      View Successor
                    </button>
                    <button className="create-changelog-btn">
                      Create Changelog
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default DeprecatedObjectsManager; 