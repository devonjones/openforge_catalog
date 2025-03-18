'use client'

import React, { useEffect } from 'react';
import { Blueprint } from '@/types';
import useBlueprintStore from '@/stores/blueprints-store';
import { formatFileSize } from '@/utils/format';

const BlueprintContainer = ({ blueprint }: { blueprint: Blueprint | null }) => {
  const addTag = useBlueprintStore((state) => state.addTag);

  useEffect(() => {
    // Handle browser back/forward buttons
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      const blueprintId = params.get('blueprint_id');
      if (!blueprintId && blueprint) {
        // Clear the blueprint selection if there's no ID in the URL
        window.location.reload();
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [blueprint]);

  if (!blueprint) {
    return <div>No blueprint selected</div>;
  }

  const downloadUrl = "/api/blueprints/" + blueprint.id + "/download";

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
      <p><strong><a className='visibleLink' 
        href={downloadUrl}
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