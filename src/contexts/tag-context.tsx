'use client'

import React, { createContext, useContext, useRef } from 'react';
import { StoreApi, useStore } from 'zustand';
import { createTagStore, TagStore } from '@/stores/tag-store';

type TagContext = StoreApi<TagStore> | null;

const TagContext = createContext<TagContext>(null);

export function TagProvider({ children, autoload = false }: { children: React.ReactNode; autoload?: boolean }) {
  const storeRef = useRef<TagContext>();
  if (!storeRef.current) {
    storeRef.current = createTagStore(autoload);
  }

  return (
    <TagContext.Provider value={storeRef.current}>
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