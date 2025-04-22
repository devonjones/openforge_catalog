import React, { createContext, useContext, useRef } from 'react';
import { StoreApi, useStore, createStore } from 'zustand';
import type { BlueprintStoreState } from '@/stores/blueprint-store';

const BlueprintContext = createContext<StoreApi<BlueprintStoreState> | null>(null);

export function BlueprintProvider({ children }: { children: React.ReactNode }) {
  const storeRef = useRef<StoreApi<BlueprintStoreState>>();
  if (!storeRef.current) {
    storeRef.current = createStore<BlueprintStoreState>((set, get) => ({
      selectedBlueprint: null,
      setSelectedBlueprint: (blueprint) => set({ selectedBlueprint: blueprint }),
      fetchBlueprintById: async (id: string) => {
        const response = await fetch(`/api/blueprints/${id}`);
        if (!response.ok) {
          throw new Error('Failed to fetch blueprint');
        }
        const blueprint = await response.json();
        return blueprint;
      },
    }));
  }

  return (
    <BlueprintContext.Provider value={storeRef.current}>
      {children}
    </BlueprintContext.Provider>
  );
}

export function useBlueprintContext<T>(
  selector: (state: BlueprintStoreState) => T,
): T {
  const store = useContext(BlueprintContext);
  if (!store) {
    throw new Error('useBlueprintContext must be used within a BlueprintProvider');
  }
  return useStore(store, selector);
} 