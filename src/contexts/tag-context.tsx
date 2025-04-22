import React, { createContext, useContext, useRef } from 'react';
import { StoreApi, useStore, createStore } from 'zustand';
import type { TagStore } from '@/stores/tag-store';
import type { TagNode } from '@/types';

const TagContext = createContext<StoreApi<TagStore> | null>(null);

export function TagProvider({ children }: { children: React.ReactNode }) {
  const storeRef = useRef<StoreApi<TagStore>>();
  if (!storeRef.current) {
    storeRef.current = createStore<TagStore>((set, get) => ({
      data: {},
      expandedNodes: {},
      selectedTags: [],
      blueprints: [],
      paging: null,
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
        get().setBlueprints(result.blueprints, result.paging);
        get().setData(result.tag_counts);
      },
      setBlueprints: (blueprints, paging) => {
        set({ blueprints, paging });
      },
    }));
  }

  return (
    <TagContext.Provider value={storeRef.current}>
      {children}
    </TagContext.Provider>
  );
}

export function useTagContext<T>(
  selector: (state: TagStore) => T,
): T {
  const store = useContext(TagContext);
  if (!store) {
    throw new Error('useTagContext must be used within a TagProvider');
  }
  return useStore(store, selector);
} 