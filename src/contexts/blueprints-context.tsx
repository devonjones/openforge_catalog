'use client'

import React, { createContext, useContext, useState, ReactNode } from 'react';

interface BlueprintsContextType {
  noSelectionText: string;
  resultsTitle: string;
}

const BlueprintsContext = createContext<BlueprintsContextType | undefined>(undefined);

export const useBlueprintsContext = () => {
  const context = useContext(BlueprintsContext);
  if (context === undefined) {
    throw new Error('useBlueprintsContext must be used within a BlueprintsProvider');
  }
  return context;
};

interface BlueprintsProviderProps {
  children: ReactNode;
}

export const BlueprintsProvider: React.FC<BlueprintsProviderProps> = ({ children }) => {
  // We'll add state management here as we need it

  const value = {
    noSelectionText: 'No blueprint selected',
    resultsTitle: 'Blueprints'
  };

  return (
    <BlueprintsContext.Provider value={value}>
      {children}
    </BlueprintsContext.Provider>
  );
}; 