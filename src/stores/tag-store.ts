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

import { create } from 'zustand';
import { TagNode } from '@/types';

interface StoreState {
  data: Record<string, TagNode>;
  expandedNodes: Record<string, boolean>;
  selectedTags: string[];
  fetchData: () => Promise<void>;
  setData: (tagCounts: object) => void;
  toggleNode: (key: string) => void;
  addTag: (tag: string) => void;
  addAllTags: (tags: string[]) => void;
  removeTag: (tag: string) => void;
  clearTags: () => void;
}

const useStore = create<StoreState>((set, get) => ({
  data: {},
  expandedNodes: {},
  selectedTags: [],
  fetchData: async () => {
    const response = await fetch('/api/blueprints/tags', {
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
  },
  addAllTags: (tags: string[]) => {
    set((state) => {
      const uniqueTags = Array.from(new Set([...state.selectedTags, ...tags]));
      return { selectedTags: uniqueTags };
    });
  },
  removeTag: (tag: string) => {
    set((state) => {
      const updatedTags = state.selectedTags.filter((t) => t !== tag);
      return { selectedTags: updatedTags };
    });
  },
  clearTags: () => {
    set({ selectedTags: [] });
  },
}));

export default useStore;
