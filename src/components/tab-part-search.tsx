'use client'

import React from 'react';
import TagContainer from './tag-container';
import ResultsContainer from './results-container';
import BlueprintContainer from './blueprint-container';
import { BlueprintProvider } from '@/contexts/blueprint-context';
import { TagProvider } from '@/contexts/tag-context';

const TabPartSearch: React.FC = () => {
  return (
    <TagProvider autoload={true}>
      <BlueprintProvider autoload={true}>
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
    </TagProvider>
  );
};

export default TabPartSearch; 