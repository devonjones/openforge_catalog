'use client'

import React from 'react';
import TagContainer from './tag-container';
import ResultsContainer from './results-container';
import BlueprintContainer from './blueprint-container';
import { useStore } from 'zustand';
import blueprintStore from '@/stores/blueprint-store';
import './tab-blueprints.css';

const TabBlueprints: React.FC = () => {
  const selectedBlueprint = useStore(blueprintStore, (state) => state.selectedBlueprint);
  const setSelectedBlueprint = useStore(blueprintStore, (state) => state.setSelectedBlueprint);

  return (
    <div className='columnContainer'>
      <div className='tagContainerWrapper'>
        <TagContainer />
      </div>
      <div className='modelsContainerWrapper'>
        <ResultsContainer onSelect={setSelectedBlueprint}/>
      </div>
      <div className='modelDetailsContainerWrapper'>
        <BlueprintContainer blueprint={selectedBlueprint}/>
      </div>
    </div>
  );
};

export default TabBlueprints; 