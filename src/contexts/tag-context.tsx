'use client'

import React, { createContext, useContext, useMemo } from 'react';
import { StoreApi, useStore } from 'zustand';
import { createTagStore, TagStore } from '@/stores/tag-store';

type TagContext = StoreApi<TagStore> | null;

const TagContext = createContext<TagContext>(null);

export function TagProvider({
  children,
  autoload = false,
  search_models = true,
  search_blueprints = false
}: {
  children: React.ReactNode;
  autoload?: boolean;
  search_models?: boolean;
  search_blueprints?: boolean;
}) {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const store = useMemo(() => createTagStore(autoload, search_models, search_blueprints), []);

  return (
    <TagContext.Provider value={store}>
      {children}
    </TagContext.Provider>
  );
}

export function useTagContext<T>(selector: (state: TagStore) => T) {
  const store = useContext(TagContext);
  if (!store) {
    throw new Error('useTagContext must be used within a TagProvider');
  }
  return useStore(store, selector);
}
