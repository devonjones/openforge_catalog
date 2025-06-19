import React from 'react';
import { render, screen } from '@testing-library/react';
import ImageGallery from '../image-gallery';
import { createMockBlueprint } from '@/test-utils';
import type { Image } from '@/types';

describe('ImageGallery', () => {
  const mockBlueprint = createMockBlueprint({
    images: [
      { id: '1', image_url: 'image1.jpg', image_name: 'Image 1', created_at: '2023-01-01', updated_at: '2023-01-01' },
      { id: '2', image_url: 'image2.jpg', image_name: 'Image 2', created_at: '2023-01-01', updated_at: '2023-01-01' },
      { id: '3', image_url: 'image3.jpg', image_name: 'Image 3', created_at: '2023-01-01', updated_at: '2023-01-01' }
    ]
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders all images in the gallery', () => {
    render(<ImageGallery blueprint={mockBlueprint} />);

    const images = screen.getAllByRole('img');
    expect(images).toHaveLength(3);
    expect(images[0]).toHaveAttribute('src', 'image1.jpg');
    expect(images[1]).toHaveAttribute('src', 'image2.jpg');
    expect(images[2]).toHaveAttribute('src', 'image3.jpg');
  });

  it('renders images with correct alt text', () => {
    render(<ImageGallery blueprint={mockBlueprint} />);

    expect(screen.getByAltText('Image 1')).toBeInTheDocument();
    expect(screen.getByAltText('Image 2')).toBeInTheDocument();
    expect(screen.getByAltText('Image 3')).toBeInTheDocument();
  });

  it('renders images in individual div containers', () => {
    render(<ImageGallery blueprint={mockBlueprint} />);

    const imageContainers = screen.getAllByRole('img').map(img => img.parentElement);
    expect(imageContainers).toHaveLength(3);
    imageContainers.forEach(container => {
      expect(container).toBeInTheDocument();
    });
  });

  it('returns null when blueprint has no images', () => {
    const blueprintWithoutImages = createMockBlueprint({ images: [] });

    const { container } = render(<ImageGallery blueprint={blueprintWithoutImages} />);

    expect(container.firstChild).toBeNull();
  });

  it('returns null when blueprint images is undefined', () => {
    const blueprintWithoutImages = createMockBlueprint({ images: undefined as unknown as Image[] });

    const { container } = render(<ImageGallery blueprint={blueprintWithoutImages} />);

    expect(container.firstChild).toBeNull();
  });

  it('handles single image', () => {
    const singleImageBlueprint = createMockBlueprint({
      images: [{ id: '1', image_url: 'single.jpg', image_name: 'Single Image', created_at: '2023-01-01', updated_at: '2023-01-01' }]
    });

    render(<ImageGallery blueprint={singleImageBlueprint} />);

    const image = screen.getByRole('img');
    expect(image).toBeInTheDocument();
    expect(image).toHaveAttribute('src', 'single.jpg');
    expect(image).toHaveAttribute('alt', 'Single Image');
  });

  it('renders images in a container div', () => {
    render(<ImageGallery blueprint={mockBlueprint} />);

    const container = screen.getByTestId('image-gallery-container');
    expect(container).toBeInTheDocument();
  });
}); 