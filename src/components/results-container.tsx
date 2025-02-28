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


      <div className="pagination flex justify-between mt-4">
        {paging?.previous_token && startCount > 1 &&(
          <button
            onClick={() => fetchBlueprints({ previous: paging.previous_token })}
            className="px-4 py-2 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Previous Page
          </button>
        )}
        
        {paging?.next_token && endCount < paging.total_count && (
          <button
            onClick={() => fetchBlueprints({ next: paging.next_token })}
            className="px-4 py-2 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Next Page
          </button>
        )}
      </div>
    </div>
  );
};

export default ResultsContainer;