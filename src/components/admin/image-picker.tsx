'use client'

import React, { useState, useEffect } from 'react';

interface Image {
  id: string;
  image_name: string;
  image_url: string;
  image_type: 'thumbnail' | 'documentation';
  created_at: string;
  updated_at: string;
}

interface ImagePickerProps {
  onSelect: (image: Image) => void;
  onClose: () => void;
}

const ImagePicker: React.FC<ImagePickerProps> = ({ onSelect, onClose }) => {
  const [images, setImages] = useState<Image[]>([]);
  const [filter, setFilter] = useState('');
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadImages();
  }, []);

  const loadImages = async () => {
    try {
      const response = await fetch('/api/admin/images?type=documentation');
      if (!response.ok) {
        throw new Error('Failed to load images');
      }
      const data = await response.json();
      setImages(data.images || []);
    } catch (err) {
      setError('Failed to load images');
      console.error('Image loading error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (file: File) => {
    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('metadata', JSON.stringify({
      image_name: file.name,
      image_type: 'documentation'
    }));

    try {
      const response = await fetch('/api/admin/images', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const { image } = await response.json();
      setImages(prev => [image, ...prev]);
    } catch (error) {
      console.error('Upload failed:', error);
      setError('Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  const filteredImages = images.filter(img => 
    img.image_name.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content image-picker-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Select Image</h3>
          <button className="modal-close" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="modal-body">
          <div className="image-picker-header">
            <input
              type="text"
              placeholder="Search images..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="search-input"
            />
            <input
              type="file"
              accept="image/*"
              onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
              disabled={uploading}
              className="file-input"
            />
          </div>

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          {loading && (
            <div className="loading-message">
              Loading images...
            </div>
          )}

          {uploading && (
            <div className="uploading-message">
              Uploading image...
            </div>
          )}

          <div className="image-grid">
            {filteredImages.map(image => (
              <div 
                key={image.id} 
                className="image-item"
                onClick={() => onSelect(image)}
              >
                <img src={image.image_url} alt={image.image_name} />
                <span className="image-name">{image.image_name}</span>
              </div>
            ))}
          </div>

          {!loading && !error && filteredImages.length === 0 && (
            <div className="no-images">
              {filter ? 'No images found matching your search.' : 'No documentation images available.'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ImagePicker; 