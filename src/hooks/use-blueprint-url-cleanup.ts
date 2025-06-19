import { useEffect } from 'react';
import { Blueprint } from '@/types';

/**
 * Custom hook to handle blueprint URL cleanup and browser navigation
 * @param blueprint - The current blueprint or null
 * @param location - Location object (defaults to window.location)
 * @param history - History object (defaults to window.history)
 */
export function useBlueprintUrlCleanup(
  blueprint: Blueprint | null,
  location: Location = window.location,
  history: History = window.history
) {
  useEffect(() => {
    // Handle URL cleanup and browser navigation
    if (blueprint) {
      // Remove blueprint_id from URL after it's been used
      const params = new URLSearchParams(location.search);
      if (params.has('blueprint_id')) {
        params.delete('blueprint_id');
        const newUrl = location.pathname + (params.toString() ? '?' + params.toString() : '');
        history.replaceState({}, '', newUrl);
      }
    }

    // Handle browser back/forward buttons
    const handlePopState = () => {
      const params = new URLSearchParams(location.search);
      const blueprintId = params.get('blueprint_id');
      if (!blueprintId && blueprint) {
        location.reload();
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [blueprint, location, history]);
} 