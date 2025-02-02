import { create } from 'zustand';

interface AppState {
  blueprints: any[];
  nextPaging: string;
  tagCounts: Record<string, number>;
  fetchData: () => Promise<void>;
}

const useStore = create<AppState>((set) => ({
  blueprints: [],
  nextPaging: '',
  tagCounts: {},
  fetchData: async () => {
    try {
      const response = await fetch('http://localhost:5328/api/blueprints/tags', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      set({
        blueprints: data.blueprints,
        nextPaging: data.next_paging,
        tagCounts: data.tag_counts,
      });
    } catch (error) {
      console.error('Failed to fetch data:', error);
    }
  },
}));

export default useStore;
