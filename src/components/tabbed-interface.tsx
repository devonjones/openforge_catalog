'use client'

import React, { useState } from 'react';
import PartSearch from './part-search';
import Blueprints from './blueprints';

const TabbedInterface = () => {
  const [activeTab, setActiveTab] = useState<'partSearch' | 'blueprints'>('partSearch');

  return (
    <div className="tabbedInterface">
      <div className="tabs">
        <button 
          className={`tab ${activeTab === 'partSearch' ? 'active' : ''}`}
          onClick={() => setActiveTab('partSearch')}
        >
          Part Search
        </button>
        <button 
          className={`tab ${activeTab === 'blueprints' ? 'active' : ''}`}
          onClick={() => setActiveTab('blueprints')}
        >
          Blueprints
        </button>
      </div>
      <div className="tabContent">
        {activeTab === 'partSearch' ? <PartSearch /> : <Blueprints />}
      </div>
    </div>
  );
};

export default TabbedInterface; 