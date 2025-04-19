'use client'

import React from 'react';
import useStore from '../stores/blueprints-store';
import { Blueprint } from '@/types';
import './tab-blueprints.css';

const TabBlueprints: React.FC = () => {
  const { blueprints } = useStore();

  if (!blueprints.length) return <div>No blueprints found</div>;

  return (
    <div className="blueprintsContainer">
      {blueprints.map((blueprint: Blueprint) => (
        <div key={blueprint.id} className="blueprintCard">
          <h3>{blueprint.blueprint_name}</h3>
          <div className="blueprintDetails">
            <p><strong>Type:</strong> {blueprint.blueprint_type}</p>
            <p><strong>File:</strong> {blueprint.file_name}</p>
            <p><strong>Size:</strong> {blueprint.file_size} bytes</p>
            <p><strong>Last Modified:</strong> {new Date(blueprint.file_modified_at).toLocaleDateString()}</p>
            {blueprint.tags.length > 0 && (
              <div className="blueprintTags">
                <strong>Tags:</strong>
                <div className="tagList">
                  {blueprint.tags.map((tag, index) => (
                    <span key={index} className="tag">{tag}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
          {blueprint.images && blueprint.images.length > 0 && (
            <div className="blueprintImages">
              <p><strong>Images:</strong></p>
              <div className="imageGrid">
                {blueprint.images.map((image, index) => (
                  <img 
                    key={image.id} 
                    src={image.image_url} 
                    alt={image.image_name} 
                    className="blueprintImage"
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default TabBlueprints; 