import { create } from 'zustand';
import { Blueprint } from '@/types';

interface StoreState {
  blueprints: Blueprint[];
  selectedTags: string[];
  fetchBlueprints: () => Promise<void>;
  addTag: (tag: string) => void;
  removeTag: (tag: string) => void;
}

const useStore = create<StoreState>((set, get) => ({
  blueprints: [],
  selectedTags: [],
  fetchBlueprints: async () => {
    const { selectedTags } = get();
    const response = await fetch('/api/blueprints/tags', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        require: selectedTags.map(tag => ({ tag })),
      }),
    });
    const result = await response.json();
    const blueprints = result.blueprints;
    set({ blueprints });
  },
  addTag: (tag: string) => {
    set((state) => {
      if (!state.selectedTags.includes(tag)) {
        const updatedTags = [...state.selectedTags, tag];
        return { selectedTags: updatedTags };
      }
      return state;
    });
    get().fetchBlueprints();
  },
  removeTag: (tag: string) => {
    set((state) => {
      const updatedTags = state.selectedTags.filter((t) => t !== tag);
      return { selectedTags: updatedTags };
    });
    get().fetchBlueprints();
  },
}));

export default useStore;