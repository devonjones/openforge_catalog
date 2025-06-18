'use client'

import React, { useState, useEffect } from 'react';
import TabPartSearch from './tab-part-search';
import TabBlueprints from './tab-blueprints';

const TabbedInterface = () => {
  const [activeTab, setActiveTab] = useState<'partSearch' | 'blueprints' | 'baseGenerator'>('partSearch');
  const [baseGeneratorUrl, setBaseGeneratorUrl] = useState('http://localhost:8000');

  useEffect(() => {
    fetch('/app-config.json')
      .then(res => res.json())
      .then(cfg => { if (cfg.BASE_GENERATOR_URL) setBaseGeneratorUrl(cfg.BASE_GENERATOR_URL); });
  }, []);

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
        <button
          className={`tab ${activeTab === 'baseGenerator' ? 'active' : ''}`}
          onClick={() => setActiveTab('baseGenerator')}
        >
          Base Generator
        </button>
      </div>
      <div className="tabContent">
        <div style={{ display: activeTab === 'partSearch' ? 'block' : 'none' }}>
          <TabPartSearch />
        </div>
        <div style={{ display: activeTab === 'blueprints' ? 'block' : 'none' }}>
          <TabBlueprints />
        </div>
        <div style={{ display: activeTab === 'baseGenerator' ? 'block' : 'none', height: '100%' }}>
          <iframe src={baseGeneratorUrl} style={{ width: '100%', height: '100%', border: 'none', display: 'block' }} title="Base Generator" />
        </div>
      </div>
    </div>
  );
};

export default TabbedInterface; 