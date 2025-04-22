'use client'

import React from 'react';
import TagContainer from './tag-container';
import ResultsContainer from './results-container';
import BlueprintContainer from './blueprint-container';
import { BlueprintProvider } from '@/contexts/blueprint-context';

const TabPartSearch: React.FC = () => {
  return (
    <BlueprintProvider>
      <div className='columnContainer'>
        <div className='tagContainerWrapper'>
          <TagContainer />
        </div>
        <div className='modelsContainerWrapper'>
          <ResultsContainer />
        </div>
        <div className='modelDetailsContainerWrapper'>
          <BlueprintContainer />
        </div>
      </div>
    </BlueprintProvider>
  );
};

export default TabPartSearch; 