'use client'

import React from 'react';
import { Blueprint } from '@/types';

interface BlueprintImageGalleryProps {
  blueprint: Blueprint;
}

const BlueprintImageGallery: React.FC<BlueprintImageGalleryProps> = ({ blueprint }) => {
  if (!blueprint.images || blueprint.images.length === 0) {
    return null;
  }

  return (
    <div data-testid="image-gallery-container">
      {blueprint.images.map((image) => (
        <div key={image.id}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={image.image_url} alt={image.image_name} />
        </div>
      ))}
    </div>
  );
};

export default BlueprintImageGallery; 