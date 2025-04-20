'use client'

import React, { createContext, useContext, useState, ReactNode } from 'react';

interface PartSearchContextType {
  noSelectionText: string;
  resultsTitle: string;
}

const PartSearchContext = createContext<PartSearchContextType | undefined>(undefined);

export const usePartSearchContext = () => {
  const context = useContext(PartSearchContext);
  if (context === undefined) {
    throw new Error('usePartSearchContext must be used within a PartSearchProvider');
  }
  return context;
};

interface PartSearchProviderProps {
  children: ReactNode;
}

export const PartSearchProvider: React.FC<PartSearchProviderProps> = ({ children }) => {
  // We'll add state management here as we need it

  const value = {
    noSelectionText: 'No part selected',
    resultsTitle: 'Parts'
  };

  return (
    <PartSearchContext.Provider value={value}>
      {children}
    </PartSearchContext.Provider>
  );
}; 