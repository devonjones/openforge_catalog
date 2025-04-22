/* 
  Data returned looks like:
  {
    tag_counts: {
      'tag1': 5,
      'tag1|tag2': 3,
      'tag1|tag4': 2,
      'tag1|tag2|tag3': 1,
    }
  }

  Resulting data structure:
  {
    tag1: {
      __count: 5,       <-- Note that there are no instances of the top level tags having a count
      __totalCount: 11,
      __subTags: 3,
      children: {
        tag2: {
          __count: 3,
          __totalCount: 4,
          __subTags: 1,
          children: {
            tag3: {
              __count: 1
            }
          }
        },
        tag4: {
          __count: 2
        }
      },
    },
    ...
  }
*/

import { createStore } from 'zustand';
import type { TagNode, Blueprint, Paging } from '@/types';

export interface TagStore {
  data: Record<string, TagNode>;
  expandedNodes: Record<string, boolean>;
  selectedTags: string[];
  blueprints: Blueprint[];
  paging: Paging | null;
  autoload: boolean;
  search_models: boolean;
  search_blueprints: boolean;
  fetchData: () => Promise<void>;
  setData: (tagCounts: object) => void;
  toggleNode: (key: string) => void;
  addTag: (tag: string) => void;
  addAllTags: (tags: string[]) => void;
  removeTag: (tag: string) => void;
  clearTags: () => void;
  fetchBlueprints: (params?: { next?: string; previous?: string }) => Promise<void>;
  setBlueprints: (blueprints: Blueprint[], paging: Paging | null) => void;
}

export const createTagStore = (autoload = false, search_models = false, search_blueprints = false) => {
  return createStore<TagStore>((set, get) => ({
    data: {},
    expandedNodes: {},
    selectedTags: [],
    blueprints: [],
    paging: null,
    autoload,
    search_models,
    search_blueprints,
    fetchData: async () => {
      const { search_models, search_blueprints } = get();
      const params = new URLSearchParams();
      console.log('fetchData');
      console.log(search_models, search_blueprints);
      console.log("--------------------------------")
      
      // Only add parameters when they differ from defaults
      if (!search_models || search_blueprints) {
        if (!search_models) params.set('models', 'false');
        if (search_blueprints) params.set('blueprints', 'true');
      }

      const response = await fetch(`/api/blueprints/tags${params.toString() ? '?' + params.toString() : ''}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      const result = await response.json();
      const tagCounts = result.tag_counts;
      get().setData(tagCounts);
    },
    setData: (tagCounts: object) => {
      const data: Record<string, TagNode> = {};

      Object.entries(tagCounts).forEach(([key, count]) => {
        const tags = key.split('|');
        let currentLevel = data;
        let fullPath = '';

        tags.forEach((tag, index) => {
          if (fullPath) {
            fullPath += `|${tag}`;
          } else {
            fullPath = tag;
          }

          if (!currentLevel[tag]) {
            currentLevel[tag] = { children: {}, __name: fullPath };
          }

          if (index === tags.length - 1) {
            currentLevel[tag].__count = count as number;
          } else {
            currentLevel = currentLevel[tag].children!;
          }
        });
      });

      // Aggregate counts for non-leaf nodes
      const aggregateCounts = (node: TagNode) => {
        if (!node) return 0;
        let total = node.__count || 0;
        let subTags = 0;
        Object.values(node.children || {}).forEach((child) => {
          if (typeof child === 'object') {
            subTags++;
            total += aggregateCounts(child);
          }
        });
        node.__totalCount = total;
        node.__subTags = subTags;
        return total;
      };

      Object.values(data).forEach((node) => {
        if (typeof node === 'object') {
          aggregateCounts(node);
        }
      });

      set({ data });
    },
    toggleNode: (key: string) => {
      set((state) => ({
        expandedNodes: {
          ...state.expandedNodes,
          [key]: !state.expandedNodes[key],
        },
      }));
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
    fetchBlueprints: async (params?: { next?: string; previous?: string }) => {
      const { selectedTags, search_models, search_blueprints } = get();
      console.log('fetchBlueprints');
      console.log(search_models, search_blueprints);

      const urlParams = new URLSearchParams();
      
      // Add search type parameters when they differ from defaults
      if (!search_models || search_blueprints) {
        if (!search_models) urlParams.set('models', 'false');
        if (search_blueprints) urlParams.set('blueprints', 'true');
      }

      // Add pagination parameters if provided
      if (params?.next) {
        urlParams.set('next', params.next);
      } else if (params?.previous) {
        urlParams.set('previous', params.previous);
      }
      console.log(urlParams.toString());
      console.log("--------------------------------")
      const response = await fetch(`/api/blueprints/tags${urlParams.toString() ? '?' + urlParams.toString() : ''}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          require: selectedTags.map(tag => ({ tag })),
        }),
      });
      const result = await response.json();
      get().setBlueprints(result.blueprints, result.paging);
      get().setData(result.tag_counts);
    },
    setBlueprints: (blueprints, paging) => {
      set({ blueprints, paging });
    },
  }));
};
