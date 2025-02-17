import { create } from 'zustand';
import { Blueprint } from '@/types';

interface StoreState {
  blueprints: Blueprint[];
  fetchBlueprints: () => Promise<void>;
}

const useStore = create<StoreState>((set) => ({
  blueprints: [],
  fetchBlueprints: async () => {
    const response = await fetch('/api/blueprints/tags', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    const result = await response.json();
    const blueprints = result.blueprints;
    console.log('blueprints', blueprints);
    set({ blueprints });
  },
}));

export default useStore;