import { createStore } from 'zustand';
import type { Blueprint } from '@/types';

export interface BlueprintStore {
  selectedBlueprint: Blueprint | null;
  setSelectedBlueprint: (blueprint: Blueprint | null) => void;
  fetchBlueprintById: (id: string) => Promise<Blueprint>;
}

export const createBlueprintStore = () => {
  return createStore<BlueprintStore>((set, get) => ({
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
};