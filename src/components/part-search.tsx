'use client'

import React, { useState } from 'react';
import { Blueprint } from '@/types';
import TagContainer from './tag-container';
import ResultsContainer from './results-container';
import BlueprintContainer from './blueprint-container';

const PartSearch = () => {
  const [selectedBlueprint, setSelectedBlueprint] = useState<Blueprint | null>(null);

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

export default PartSearch; 