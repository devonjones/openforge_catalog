'use client'

import React, { useState } from 'react';
import TabPartSearch from './tab-part-search';
import TabBlueprints from './tab-blueprints';

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
        <div style={{ display: activeTab === 'partSearch' ? 'block' : 'none' }}>
          <TabPartSearch />
        </div>
        <div style={{ display: activeTab === 'blueprints' ? 'block' : 'none' }}>
          <TabBlueprints />
        </div>
      </div>
    </div>
  );
};

export default TabbedInterface; 