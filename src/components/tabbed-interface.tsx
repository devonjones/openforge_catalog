'use client'

import React, { useState, useEffect } from 'react';
import TabPartSearch from './tab-part-search';
import TabBlueprints from './tab-blueprints';
import TabAdmin from './tab-admin';
import { useAdminContext } from '@/contexts/admin-context';

const TabbedInterface = () => {
  const [activeTab, setActiveTab] = useState<'partSearch' | 'blueprints' | 'baseGenerator' | 'admin'>('partSearch');
  const [baseGeneratorUrl, setBaseGeneratorUrl] = useState(process.env.NEXT_PUBLIC_BASE_GENERATOR_URL || 'http://localhost:8000');

  const { state } = useAdminContext();

  useEffect(() => {
    // Load base generator URL from localStorage and app-config.json
    const savedUrl = localStorage.getItem('baseGeneratorUrl');
    if (savedUrl) {
      setBaseGeneratorUrl(savedUrl);
    }

    fetch('/app-config.json')
      .then(res => res.json())
      .then(cfg => { if (cfg.BASE_GENERATOR_URL) setBaseGeneratorUrl(cfg.BASE_GENERATOR_URL); })
      .catch(err => console.error("Failed to load or parse app-config.json", err));
  }, []);

  const handleBaseGeneratorUrlChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newUrl = event.target.value;
    setBaseGeneratorUrl(newUrl);
    localStorage.setItem('baseGeneratorUrl', newUrl);
  };

  return (
    <div className="tabbedInterface">
      <div className="tabContainer">
        <div className="tabButtons">
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
          {state.isAuthenticated && (
            <button
              className={`tab ${activeTab === 'admin' ? 'active' : ''}`}
              onClick={() => setActiveTab('admin')}
            >
              Admin
            </button>
          )}
        </div>
        <div className="tabContent">
          <div style={{ display: activeTab === 'partSearch' ? 'block' : 'none' }}>
            <TabPartSearch />
          </div>
          <div style={{ display: activeTab === 'blueprints' ? 'block' : 'none' }}>
            <TabBlueprints />
          </div>
          <div style={{ display: activeTab === 'baseGenerator' ? 'block' : 'none' }}>
            <div className="baseGeneratorContainer">
              <div className="baseGeneratorControls">
                <label htmlFor="baseGeneratorUrl">Base Generator URL:</label>
                <input
                  type="text"
                  id="baseGeneratorUrl"
                  value={baseGeneratorUrl}
                  onChange={handleBaseGeneratorUrlChange}
                  className="baseGeneratorUrlInput"
                />
              </div>
              <iframe src={baseGeneratorUrl} style={{ width: '100%', height: '100%', border: 'none', display: 'block' }} title="Base Generator" />
            </div>
          </div>
          {state.isAuthenticated && (
            <div style={{ display: activeTab === 'admin' ? 'block' : 'none' }}>
              <TabAdmin />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TabbedInterface;
