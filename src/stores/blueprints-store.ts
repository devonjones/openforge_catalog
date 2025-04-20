import { create } from 'zustand';
import { Blueprint } from '@/types';

interface StoreState {
  selectedBlueprint: Blueprint | null;
  setSelectedBlueprint: (blueprint: Blueprint | null) => void;
  fetchBlueprintById: (id: string) => Promise<Blueprint>;
}

const useStore = create<StoreState>((set, get) => ({
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

export default useStore;