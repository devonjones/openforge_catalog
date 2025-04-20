'use client'

import React from 'react';
import TagContainer from './tag-container';
import ResultsContainer from './results-container';
import BlueprintContainer from './blueprint-container';
import useStore from '@/stores/blueprints-store';
import { BlueprintsProvider } from '@/contexts/blueprints-context';
import './tab-blueprints.css';

const TabBlueprints: React.FC = () => {
  const { selectedBlueprint, setSelectedBlueprint } = useStore();

  return (
    <BlueprintsProvider>
      <div className='columnContainer'>
        <div className='tagContainerWrapper'>
          <TagContainer />
        </div>
        <div className='modelsContainerWrapper'>
          <ResultsContainer onSelect={setSelectedBlueprint} isPartSearch={false} />
        </div>
        <div className='modelDetailsContainerWrapper'>
          <BlueprintContainer blueprint={selectedBlueprint} isPartSearch={false} />
        </div>
      </div>
    </BlueprintsProvider>
  );
};

export default TabBlueprints; 