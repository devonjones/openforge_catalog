'use client'

import React from 'react';
import TagContainer from './tag-container';
import ResultsContainer from './results-container';
import BlueprintContainer from './blueprint-container';
import useStore from '@/stores/blueprints-store';

const TabPartSearch: React.FC = () => {
  const { selectedBlueprint, setSelectedBlueprint } = useStore();

  return (
    <div className='columnContainer'>
      <div className='tagContainerWrapper'>
        <TagContainer />
      </div>
      <div className='modelsContainerWrapper'>
        <ResultsContainer onSelect={setSelectedBlueprint} />
      </div>
      <div className='modelDetailsContainerWrapper'>
        <BlueprintContainer blueprint={selectedBlueprint} />
      </div>
    </div>
  );
};

export default TabPartSearch; 