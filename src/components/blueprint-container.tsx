'use client'

import React from 'react';
import { Blueprint } from '@/types';
import useBlueprintStore from '@/stores/blueprints-store';

const formatFileSize = (bytes: number): string => {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${Math.round(size * 100) / 100} ${units[unitIndex]}`;
};

const BlueprintContainer = ({ blueprint }: { blueprint: Blueprint | null }) => {
  const addTag = useBlueprintStore((state) => state.addTag);

  if (!blueprint) {
    return <div>No blueprint selected</div>;
  }

  const laterDate = new Date(
    Math.max(
      new Date(blueprint.file_changed_at).getTime(),
      new Date(blueprint.file_modified_at).getTime()
    )
  );

  return (
    <div className='blueprintContainer'>
      <h2>{blueprint.blueprint_name}</h2>
      <p><strong>Type:</strong> {blueprint.blueprint_type}</p>
      <p><strong>Last Modified:</strong> {laterDate.toLocaleString()}, <strong>Size:</strong> {formatFileSize(blueprint.file_size)}</p>
      <p>{blueprint.tags.map(tag => (
        <button
          key={tag}
          onClick={() => addTag(tag)}
          className="inline-block px-2 py-1 mr-2 text-sm bg-blue-100 hover:bg-blue-200 rounded-md cursor-pointer"
        >
          {tag}
        </button>
      ))}</p>
      <p><strong><a 
        href={blueprint.storage_address}
        download={blueprint.file_name}
      >
        Download
      </a></strong></p>
      <div>
        {blueprint.images.map((image) => (
          <div key={image.id}>
            <img src={image.image_url} alt={image.image_name} />
          </div>
        ))}
      </div>
    </div>
  );
};

export default BlueprintContainer;