import { create } from 'zustand';
import { Blueprint, Paging } from '@/types';
import useTagStore from '@/stores/tag-store';

interface StoreState {
  blueprints: Blueprint[];
  selectedTags: string[];
  paging: Paging | null;
  fetchBlueprints: (params?: { next?: string; previous?: string }) => Promise<void>;
  fetchBlueprintById: (id: string) => Promise<Blueprint>;
  addTag: (tag: string) => void;
  addAllTags: (tags: string[]) => void;
  removeTag: (tag: string) => void;
  clearTags: () => void;
}

const useStore = create<StoreState>((set, get) => ({
  blueprints: [],
  selectedTags: [],
  paging: null,
  fetchBlueprintById: async (id: string) => {
    const { blueprints } = get();
    
    // Check if blueprint exists in local store
    const localBlueprint = blueprints.find(bp => bp.id === id);
    if (localBlueprint) {
      return localBlueprint;
    }

    // If not found locally, fetch from API
    const response = await fetch(`/api/blueprints/${id}`);
    if (!response.ok) {
      throw new Error('Failed to fetch blueprint');
    }
    const blueprint = await response.json();
    
    // Add to local store
    set(state => ({
      blueprints: [...state.blueprints, blueprint]
    }));
    
    return blueprint;
  },
  fetchBlueprints: async (params?: { next?: string; previous?: string }) => {
    const { selectedTags } = get();
    let url = '/api/blueprints/tags';

    // Add pagination parameters if provided
    if (params?.next) {
      url += `?next=${params.next}`;
    } else if (params?.previous) {
      url += `?previous=${params.previous}`;
    }
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        require: selectedTags.map(tag => ({ tag })),
      }),
    });
    const result = await response.json();
    set({ 
      blueprints: result.blueprints,
      paging: result.paging,
    });
    useTagStore.getState().setData(result.tag_counts);
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
  addAllTags: (tags: string[]) => {
    set((state) => {
      const uniqueTags = Array.from(new Set([...state.selectedTags, ...tags]));
      return { selectedTags: uniqueTags };
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
  clearTags: () => {
    set({ selectedTags: [] });
    get().fetchBlueprints();
  },
}));

export default useStore;