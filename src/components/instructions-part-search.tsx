'use client'

import React, { useState, useRef, useEffect } from 'react';
import { useTagContext } from '@/contexts/tag-context';

const TagRow: React.FC<{ tags: string[]; addExampleTag: (tag: string) => void; tooltipAbove?: boolean }> = ({ tags, addExampleTag, tooltipAbove = false }) => {
  const tagDescriptions = useTagContext((state) => state.tagDescriptions);
  const [hoveredTag, setHoveredTag] = useState<string | null>(null);
  const hoverTimeout = useRef<NodeJS.Timeout | null>(null);

  const handleMouseEnter = (tag: string) => {
    if (hoverTimeout.current) clearTimeout(hoverTimeout.current);
    hoverTimeout.current = setTimeout(() => setHoveredTag(tag), 500);
  };
  const handleMouseLeave = () => {
    if (hoverTimeout.current) clearTimeout(hoverTimeout.current);
    setHoveredTag(null);
  };
  useEffect(() => {
    return () => {
      if (hoverTimeout.current) clearTimeout(hoverTimeout.current);
    };
  }, []);

  return (
    <div className="flex flex-wrap gap-2 relative">
      {tags.map((tag) => {
        const description = tagDescriptions[tag];
        return (
          <div key={tag} className="group" onMouseEnter={() => handleMouseEnter(tag)} onMouseLeave={handleMouseLeave}>
            <button
              onClick={() => addExampleTag(tag)}
              className="inline-block px-2 py-1 text-sm bg-blue-100 hover:bg-blue-200 rounded-md cursor-pointer"
            >
              {tag}
              {description && (
                <span className="ml-1 text-gray-500 group-hover:text-gray-700">
                  <svg className="w-4 h-4 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-label="tag description">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </span>
              )}
            </button>
            {description && hoveredTag === tag && (
              <div
                className={`absolute left-0 right-0 mx-auto ${tooltipAbove ? 'bottom-full mb-1' : 'top-full mt-1'} w-full max-w-full p-2 bg-gray-50 rounded-md shadow-lg text-sm text-gray-600 opacity-100 z-50 transition-opacity duration-150 pointer-events-none`}
              >
                {description}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export function InstructionsPartSearch() {
  const addTag = useTagContext((state) => state.addTag);
  const removeTag = useTagContext((state) => state.removeTag);
  const selectedTags = useTagContext((state) => state.selectedTags);
  const tagDescriptions = useTagContext((state) => state.tagDescriptions);

  const addExampleTag = (tag: string) => {
    const section = tag.split('|')[0];
    const sectionTags = selectedTags.filter((t: string) => t.startsWith(section + '|'));
    sectionTags.forEach((t: string) => removeTag(t));
    addTag(tag);
  };

  // Helper to render h2 + description + tag row
  const Section = ({ title, tags, tooltipAbove }: { title: string, tags?: string[], tooltipAbove?: boolean }) => (
    <>
      <h2 className="text-2xl font-bold mt-8 mb-4">{title}</h2>
      {tagDescriptions[title.toLowerCase()] && (
        <p className="mb-6">{tagDescriptions[title.toLowerCase()]}</p>
      )}
      {tags && tags.length > 0 && (
        <>
          <p className="mb-4"><strong>Example Tags:</strong></p>
          <div className="mb-8">
            <TagRow tags={tags} addExampleTag={addExampleTag} tooltipAbove={tooltipAbove} />
          </div>
        </>
      )}
    </>
  );

  return (
    <div className="part-search-instructions p-6 max-w-3xl">
      <h1 className="text-3xl font-bold mb-6">Instructions (Part Search)</h1>
      <p className="mb-6">
        The main interface for this is designed for you to select tags that help you refine your search. 
        You can select tags in the tree on the left. The tags are broken into some broad categories.
        If you want to instead build full tiles, and select all the parts needed to make that tile, click on the Blueprints tab 
        above.
      </p>

      {Section({ title: 'Build', tags: [
        'build|separate wall',
        'build|wall on tile',
        'build|s2w',
        'build|s-system',
        'build|thick wall',
      ] })}
      {Section({ title: 'Component', tags: [
        'component|arrow_slit',
        'component|door|arched',
        'component|drain',
        'component|portcullis',
        'component|wall',
        'component|window',
      ] })}
      {Section({ title: 'Connection', tags: [
        'connection|dragonlock',
        'connection|openlock',
        'connection|openforge',
        'connection|magnetic|flex',
        'connection|side',
        'connection|pegs',
        'connection|openlock|topless',
      ] })}
      {Section({ title: 'Decoration', tags: [
        'decoration|air',
        'decoration|earth',
        'decoration|fire',
        'decoration|water',
        'decoration|demon',
        'decoration|celtic_knot',
      ] })}
      {Section({ title: 'Interface' })}
      {Section({ title: 'Part' })}
      {Section({ title: 'Scatter' })}
      {Section({ title: 'Shape' })}
      {Section({ title: 'Size' })}
      {Section({ title: 'Texture', tags: [
        'texture|dungeon_stone',
        'texture|cut-stone',
        'texture|towne',
        'texture|sewer',
        'texture|cave',
      ], tooltipAbove: true })}
    </div>
  );
}

export default InstructionsPartSearch; 