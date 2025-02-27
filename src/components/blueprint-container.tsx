'use client'

import React from 'react';
import { Blueprint } from '@/types';

const BlueprintContainer = ({ blueprint }: { blueprint: Blueprint | null }) => {
  if (!blueprint) {
    return <div>No blueprint selected</div>;
  }

  return (
    <div className='blueprintContainer'>
      <h2>{blueprint.blueprint_name}</h2>
      <p><strong>Type:</strong> {blueprint.blueprint_type}</p>
      <p><strong>Created At:</strong> {blueprint.created_at}</p>
      <p><strong>File Changed At:</strong> {blueprint.file_changed_at}</p>
      <p><strong>File Modified At:</strong> {blueprint.file_modified_at}</p>
      <p><strong>File Name:</strong> {blueprint.file_name}</p>
      <p><strong>File Size:</strong> {blueprint.file_size}</p>
      <p><strong>Full Name:</strong> {blueprint.full_name}</p>
      <p><strong>ID:</strong> {blueprint.id}</p>
      <p><strong>Storage Address:</strong> <a href={blueprint.storage_address}>{blueprint.storage_address}</a></p>
      <p><strong>Tags:</strong> {blueprint.tags.join(', ')}</p>
      <p><strong>Updated At:</strong> {blueprint.updated_at}</p>
      <div>
        <h3>Images</h3>
        {blueprint.images.map((image) => (
          <div key={image.id}>
            <p><strong>{image.image_name}</strong></p>
            <img src={image.image_url} alt={image.image_name} />
          </div>
        ))}
      </div>
    </div>
  );
};

export default BlueprintContainer;