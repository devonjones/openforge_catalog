'use client'

import React from 'react';
import TagContainer from './tag-container';
import ResultsContainer from './results-container';
import BlueprintContainer from './blueprint-container';
import useStore from '@/stores/blueprints-store';
import { PartSearchProvider } from '@/contexts/part-search-context';

const TabPartSearch: React.FC = () => {
  const { selectedBlueprint, setSelectedBlueprint } = useStore();

  return (
    <PartSearchProvider>
      <div className='columnContainer'>
        <div className='tagContainerWrapper'>
          <TagContainer />
        </div>
        <div className='modelsContainerWrapper'>
          <ResultsContainer onSelect={setSelectedBlueprint} isPartSearch={true} />
        </div>
        <div className='modelDetailsContainerWrapper'>
          <BlueprintContainer blueprint={selectedBlueprint} isPartSearch={true} />
        </div>
      </div>
    </PartSearchProvider>
  );
};

export default TabPartSearch; 