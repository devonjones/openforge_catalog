import { useEffect, useRef } from 'react';
import { useBlueprintContext } from '@/contexts/blueprint-context';
import { useTagContext } from '@/contexts/tag-context';

/**
 * Custom hook to handle URL parameters for autoloading tags, search terms, and blueprint selection
 */
export function useUrlParameters() {
  const setSelectedBlueprint = useBlueprintContext((state) => state.setSelectedBlueprint);
  const blueprints = useTagContext((state) => state.blueprints);
  const selectedTags = useTagContext((state) => state.selectedTags);
  const addTag = useTagContext((state) => state.addTag);
  const setSearchTerm = useTagContext((state) => state.setSearchTerm);
  const autoload = useTagContext((state) => state.autoload);
  const hasSetTagState = useRef(false);

  useEffect(() => {
    // Read URL parameters and add tags
    if (typeof window !== 'undefined' && autoload) {
      const params = new URLSearchParams(window.location.search);
      
      // Handle tags
      const tagParams = params.getAll('tag');
      tagParams.forEach(tag => {
        if (!selectedTags.includes(tag)) {
          addTag(tag);
        }
      });

      // Handle search term
      const searchParam = params.get('search');
      if (searchParam) {
        setSearchTerm(searchParam);
      }

      // Handle blueprint selection
      const blueprintId = params.get('blueprint_id');
      if (blueprintId) {
        const blueprint = blueprints.find(b => b.id === blueprintId);
        if (blueprint) {
          setSelectedBlueprint(blueprint);
        }
      }

      // Remove tag parameters from URL after processing
      const newParams = new URLSearchParams();
      if (blueprintId) {
        newParams.set('blueprint_id', blueprintId);
      }
      const newUrl = `${window.location.pathname}${newParams.toString() ? '?' + newParams.toString() : ''}`;
      window.history.replaceState({}, '', newUrl);
    }
  }, [autoload, addTag, blueprints, selectedTags, setSearchTerm, setSelectedBlueprint]);

  return { hasSetTagState };
} 