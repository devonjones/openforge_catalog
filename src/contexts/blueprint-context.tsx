'use client'

import React, { createContext, useContext, useRef } from 'react';
import { StoreApi, useStore } from 'zustand';
import { createBlueprintStore, BlueprintStore } from '@/stores/blueprint-store';

type BlueprintContext = StoreApi<BlueprintStore> | null;

const BlueprintContext = createContext<BlueprintContext>(null);

export function BlueprintProvider({ children }: { children: React.ReactNode }) {
  const storeRef = useRef<BlueprintContext>();
  if (!storeRef.current) {
    storeRef.current = createBlueprintStore();
  }

  return (
    <BlueprintContext.Provider value={storeRef.current}>
      {children}
    </BlueprintContext.Provider>
  );
}

export function useBlueprintContext<T>(selector: (state: BlueprintStore) => T) {
  const store = useContext(BlueprintContext);
  if (!store) {
    throw new Error('useBlueprintContext must be used within a BlueprintProvider');
  }
  return useStore(store, selector);
} 