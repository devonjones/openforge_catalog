'use client'

import React, { useEffect, useState } from 'react';
import useBlueprintStore from '@/stores/blueprints-store';
import { Blueprint } from '@/types';
import './results-container.css';

const ResultsContainer = ({ onSelect }: { onSelect: (blueprint: Blueprint) => void }) => {
  const fetchBlueprints = useBlueprintStore((state) => state.fetchBlueprints);
  const blueprints = useBlueprintStore((state) => state.blueprints);
  const paging = useBlueprintStore((state) => state.paging);
  const selectedTags = useBlueprintStore((state) => state.selectedTags);
  const removeTag = useBlueprintStore((state) => state.removeTag);
  const [selectedBlueprint, setSelectedBlueprint] = useState<Blueprint | null>(null);

  useEffect(() => {
    fetchBlueprints();
  }, [fetchBlueprints]);

  const handleSelect = (blueprint: Blueprint) => {
    setSelectedBlueprint(blueprint);
    onSelect(blueprint);
  };

  const handleRemoveTag = (tag: string) => {
    removeTag(tag);
  };

  const startCount = (paging?.start_count ?? 0) + 1;
  const endCount = startCount + blueprints.length - 1;

  return (
    <div className='resultsContainer'>
      <h2>Blueprints</h2>
      {selectedTags.length > 0 && (
        <div className='selectedTagsContainer'>
          <div className='selectedTagsContainer__header'>Selected Tags</div>
          <ul>
            {selectedTags.map((tag) => (
              <li key={tag}>
                {tag} <button  className="tagButton" onClick={() => handleRemoveTag(tag)}>-</button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <ul>
        {blueprints.map((blueprint) => (
          <li
            key={blueprint.id}
            onClick={() => handleSelect(blueprint)}
            style={{ cursor: 'pointer', backgroundColor: selectedBlueprint?.id === blueprint.id ? 'lightblue' : 'transparent' }}
          >
            {blueprint.blueprint_name}
          </li>
        ))}
      </ul>
      
      <div className="totalCount">
        <strong>{startCount} - {endCount}</strong> of <strong>{paging?.total_count}</strong> that match your tags
      </div>
    </div>
  );
};

export default ResultsContainer;