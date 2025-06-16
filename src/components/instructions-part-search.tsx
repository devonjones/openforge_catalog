'use client'

import React, { useState } from 'react';
import { useTagContext } from '@/contexts/tag-context';
import { tagToArray } from '../utils/tag-utils';

const TagRow: React.FC<{ tags: string[]; addExampleTag: (tag: string) => void; tooltipAbove?: boolean }> = ({ tags, addExampleTag, tooltipAbove = false }) => {
  const tagDescriptions = useTagContext((state) => state.tagDescriptions);
  
  return (
    <div className="flex flex-wrap gap-2 relative">
      {tags.map((tag) => {
        const description = tagDescriptions[tag];
        return (
          <div key={tag} className="group">
            <button
              onClick={() => addExampleTag(tag)}
              className="inline-block px-2 py-1 text-sm bg-blue-100 hover:bg-blue-200 rounded-md cursor-pointer"
            >
              {tag}
              {description && (
                <span className="ml-1 text-gray-500 group-hover:text-gray-700">
                  <svg className="w-4 h-4 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </span>
              )}
            </button>
            {description && (
              <div
                className={`absolute left-0 right-0 mx-auto ${tooltipAbove ? 'bottom-full mb-1' : 'top-full mt-1'} w-full max-w-full p-2 bg-gray-50 rounded-md shadow-lg text-sm text-gray-600 opacity-0 group-hover:opacity-100 z-50 transition-opacity duration-150 pointer-events-none`}
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
  const [hoveredTag, setHoveredTag] = useState<string | null>(null);

  const addExampleTag = (tag: string) => {
    const section = tag.split('|')[0];
    const sectionTags = selectedTags.filter((t: string) => t.startsWith(section + '|'));
    sectionTags.forEach((t: string) => removeTag(t));
    addTag(tag);
  };

  return (
    <div className="part-search-instructions p-6 max-w-3xl">
      <h1 className="text-3xl font-bold mb-6">Instructions (Part Search)</h1>
      <p className="mb-6">
        The main interface for this is designed for you to select tags that help you refine your search. 
        You can select tags in the tree on the left. The tags are broken into some broad categories.
        If you want to instead build full tiles, and select all the parts needed to make that tile, click on the Blueprints tab 
        above.
      </p>

      <h2 className="text-2xl font-bold mt-8 mb-4">Build</h2>
      <p className="mb-6">
        These tags are based around underlying system you want to use for building a tile. 
        Wall on Tile for example has a wall that takes up part of the floor space, but is much easier to reason about 
        when setting up a map quickly while GMing, while Separate Wall has the wall outside the floor, giving more play room, 
        but is harder to tesselate.
      </p>
      <p className="mb-4"><strong>Example Tags:</strong></p>
      <div className="mb-8">
        <TagRow
          tags={[
            'build|separate wall',
            'build|wall on tile',
            'build|s2w',
            'build|s-system',
            'build|thick wall',
          ]}
          addExampleTag={addExampleTag}
        />
      </div>

      <h2 className="text-2xl font-bold mt-8 mb-4">Component</h2>
      <p className="mb-6">
        These tags represent all the cool fun things you can have on the tile. Arrow Slits, Doorways, Grating, 
        LED torch walls, these tags let you browse between these choices.
      </p>
      <p className="mb-4"><strong>Example Tags:</strong></p>
      <div className="mb-8">
        <TagRow
          tags={[
            'component|arrow_slit',
            'component|door|arched',
            'component|drain',
            'component|portcullis',
            'component|wall',
            'component|window',
          ]}
          addExampleTag={addExampleTag}
        />
      </div>

      <h2 className="text-2xl font-bold mt-8 mb-4">Connection</h2>
      <p className="mb-6">
        These tags tell you what connection systems the part uses. Openforge is the most common, which is the system 
        where the tile has a base glued on it to gve you connection options. Others, like Openlock, or Magnetic tell 
        you the specific system used.
      </p>
      <p className="mb-4"><strong>Example Tags:</strong></p>
      <div className="mb-8">
        <TagRow
          tags={[
            'connection|dragonlock',
            'connection|openlock',
            'connection|openforge',
            'connection|magnetic|flex',
            'connection|side',
            'connection|pegs',
            'connection|openlock|topless',
          ]}
          addExampleTag={addExampleTag}
        />
      </div>

      <h2 className="text-2xl font-bold mt-8 mb-4">Decoration</h2>
      <p className="mb-6">
        These tags tell you if there's some special non functional decorations on the tile, like cool fire runes 
        or dragon skulls.
      </p>
      <p className="mb-4"><strong>Example Tags:</strong></p>
      <div className="mb-8">
        <TagRow
          tags={[
            'decoration|air',
            'decoration|earth',
            'decoration|fire',
            'decoration|water',
            'decoration|demon',
            'decoration|celtic_knot',
          ]}
          addExampleTag={addExampleTag}
        />
      </div>

      <h2 className="text-2xl font-bold mt-8 mb-4">Interface and Part</h2>
      <p className="mb-6">
        Some parts are used for a multi part build. Interface is used to encode the tags that describe those relationships. 
        So like a window can have a frame and shutters. Interface relates to how those parts connect to each other. 
        Part defines the actual pieces.
      </p>

      <h2 className="text-2xl font-bold mt-8 mb-4">Scatter</h2>
      <p className="mb-6">
        Scatter holds non tile stuff. Barrels, statues, that kind of thing.
      </p>

      <h2 className="text-2xl font-bold mt-8 mb-4">Shape</h2>
      <p className="mb-6">
        Shape holds tags that define the actual shape of the intended part, and some times the role the part has in a tile. 
        These are the descriptive, qualitative tags. Square, curved, convex are the shapes, while floor, base, wall also 
        describe the role.  Most tiles people want to build are square, so adding that tag will filter out a lot of stuff.
      </p>

      <h2 className="text-2xl font-bold mt-8 mb-4">Size</h2>
      <p className="mb-6">
        Size has the quantiative defintiions. the tile is 2 squares on the x, 4 squares on the y. A curve is 90 degrees or 45. This does have some qualitative tags as well.
      </p>

      <h2 className="text-2xl font-bold mt-8 mb-4">Texture</h2>
      <p className="mb-6">
        What does the tile look like. Stone? Wood? Here's where we can select the visuals.
      </p>
      <p className="mb-4"><strong>Example Tags:</strong></p>
      <div className="mb-8">
        <TagRow
          tags={[
            'texture|dungeon_stone',
            'texture|cut-stone',
            'texture|towne',
            'texture|sewer',
            'texture|cave',
          ]}
          addExampleTag={addExampleTag}
          tooltipAbove={true}
        />
      </div>
    </div>
  );
}

export default InstructionsPartSearch; 