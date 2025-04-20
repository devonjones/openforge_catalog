import { create } from 'zustand';
import { Blueprint, Paging } from '@/types';
import useTagStore from '@/stores/tag-store';

interface StoreState {
  blueprints: Blueprint[];
  paging: Paging | null;
  selectedBlueprint: Blueprint | null;
  setSelectedBlueprint: (blueprint: Blueprint | null) => void;
  fetchBlueprints: (params?: { next?: string; previous?: string }) => Promise<void>;
  fetchBlueprintById: (id: string) => Promise<Blueprint>;
}

const useStore = create<StoreState>((set, get) => ({
  blueprints: [],
  paging: null,
  selectedBlueprint: null,
  setSelectedBlueprint: (blueprint) => set({ selectedBlueprint: blueprint }),
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
    const selectedTags = useTagStore.getState().selectedTags;
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
}));

export default useStore;