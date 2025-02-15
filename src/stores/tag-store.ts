import { Clover } from 'lucide-react';
import { create } from 'zustand';

interface TagNode {
  count?: number;
  children?: Record<string, TagNode>;
}

interface StoreState {
  data: Record<string, TagNode>;
  fetchData: () => Promise<void>;
}

const useStore = create<StoreState>((set) => ({
  data: {},
  fetchData: async () => {
    const response = await fetch('/api/blueprints/tags', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    const result = await response.json();
    const tagCounts = result.tag_counts;
    const data: Record<string, TagNode> = {};

    Object.entries(tagCounts).forEach(([key, count]) => {
      const tags = key.split('|');
      let currentLevel = data;

      tags.forEach((tag, index) => {
        if (!currentLevel[tag]) {
          currentLevel[tag] = {};
        }

        if (index === tags.length - 1) {
          currentLevel[tag].count = count as number;
        } else {
          currentLevel = currentLevel[tag];
        }
      });
    });

    // Aggregate counts for non-leaf nodes
    const aggregateCounts = (node: TagNode) => {
      if (!node) return 0;
      let total = node.count || 0;
      Object.values(node).forEach((child) => {
        if (typeof child === 'object') {
          total += aggregateCounts(child);
        }
      });
      node.__count = total;
      return total;
    };

    Object.values(data).forEach((node) => {
      if (typeof node === 'object') {
        aggregateCounts(node);
      }
    });
console.log('data', data);
    set({ data });
  },
}));

export default useStore;
