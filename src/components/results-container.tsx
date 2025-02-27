'use client'

import React, { useEffect, useState } from 'react';
import useBlueprintStore from '@/stores/blueprints-store';
import { Blueprint } from '@/types';

const ResultsContainer = ({ onSelect }: { onSelect: (blueprint: Blueprint) => void }) => {
  const fetchBlueprints = useBlueprintStore((state) => state.fetchBlueprints);
  const blueprints = useBlueprintStore((state) => state.blueprints);
  const [selectedBlueprint, setSelectedBlueprint] = useState<Blueprint | null>(null);

  useEffect(() => {
    fetchBlueprints();
  }, [fetchBlueprints]);

  const handleSelect = (blueprint: Blueprint) => {
    setSelectedBlueprint(blueprint);
    onSelect(blueprint);
  };

  return (
    <div className='resultsContainer'>
      <div>Blueprints</div>
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
    </div>
  );
};

export default ResultsContainer;