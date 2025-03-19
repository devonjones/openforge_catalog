'use client'

import React, { useEffect, useState } from 'react';
import useBlueprintStore from '@/stores/blueprints-store';
import { Blueprint } from '@/types';
import './results-container.css';

const ResultsContainer = ({ onSelect }: { onSelect: (blueprint: Blueprint) => void }) => {
  const fetchBlueprints = useBlueprintStore((state) => state.fetchBlueprints);
  const fetchBlueprintById = useBlueprintStore((state) => state.fetchBlueprintById);
  const blueprints = useBlueprintStore((state) => state.blueprints);
  const paging = useBlueprintStore((state) => state.paging);
  const selectedTags = useBlueprintStore((state) => state.selectedTags);
  const removeTag = useBlueprintStore((state) => state.removeTag);
  const addTag = useBlueprintStore((state) => state.addTag);
  const clearTags = useBlueprintStore((state) => state.clearTags);
  const [selectedBlueprint, setSelectedBlueprint] = useState<Blueprint | null>(null);

  useEffect(() => {
    // Read URL parameters and add tags
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      
      // Handle tags
      const tagParams = params.getAll('tag');
      tagParams.forEach(tag => {
        if (!selectedTags.includes(tag)) {
          addTag(tag);
        }
      });

      // Handle blueprint selection
      const blueprintId = params.get('blueprint_id');
      if (blueprintId) {
        fetchBlueprintById(blueprintId)
          .then(blueprint => {
            setSelectedBlueprint(blueprint);
            onSelect(blueprint);
          })
          .catch(error => {
            console.error('Failed to fetch blueprint:', error);
          });
      }
    }
  }, []); // Run only once on mount

  useEffect(() => {
    fetchBlueprints();
  }, [fetchBlueprints]);

  const handleSelect = (blueprint: Blueprint) => {
    setSelectedBlueprint(blueprint);
    onSelect(blueprint);
    
    // Update URL while preserving existing tag parameters
    if (typeof window !== 'undefined') {
      const currentParams = new URLSearchParams(window.location.search);
      const tags = currentParams.getAll('tag');
      
      const newParams = new URLSearchParams();
      tags.forEach(tag => newParams.append('tag', tag));
      newParams.set('blueprint_id', blueprint.id);
      
      const newUrl = `${window.location.pathname}?${newParams.toString()}`;
      window.history.pushState({}, '', newUrl);
    }
  };

  const handleRemoveTag = (tag: string) => {
    removeTag(tag);
  };

  const createDeepLink = (tags: string[]) => {
    const params = tags.map(tag => `tag=${encodeURIComponent(tag)}`).join('&');
    return `/?${params}`;
  };

  const handleClear = (e: React.MouseEvent) => {
    e.preventDefault();
    clearTags();
    // Update URL to remove tag parameters while preserving blueprint_id
    if (typeof window !== 'undefined') {
      const currentParams = new URLSearchParams(window.location.search);
      const blueprintId = currentParams.get('blueprint_id');
      
      const newParams = new URLSearchParams();
      if (blueprintId) {
        newParams.set('blueprint_id', blueprintId);
      }
      
      const newUrl = `${window.location.pathname}${newParams.toString() ? '?' + newParams.toString() : ''}`;
      window.history.pushState({}, '', newUrl);
    }
  };

  const startCount = (paging?.start_count ?? 0) + 1;
  const endCount = startCount + blueprints.length - 1;

  return (
    <div className='resultsContainer'>
      <h2>Blueprints</h2>
      {selectedTags.length > 0 && (
        <div className='selectedTagsContainer'>
          <div className='selectedTagsContainer__header'>Selected Tags - <a className='visibleLink' href={createDeepLink(selectedTags)}>deeplink</a></div>
          <ul>
            {selectedTags.map((tag) => (
              <li key={tag}>
                {tag} <button className="tagButton" onClick={() => handleRemoveTag(tag)}>-</button>
              </li>
            ))}
          </ul>
          <div className='selectedTagsContainer__header'><a className='visibleLink' href="#" onClick={handleClear}>clear</a></div>
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