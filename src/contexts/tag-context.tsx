'use client'

import React, { createContext, useContext, useRef } from 'react';
import { StoreApi, useStore } from 'zustand';
import { createTagStore, TagStore } from '@/stores/tag-store';
import type { TagNode } from '@/types';

type TagContext = StoreApi<TagStore> | null;

const TagContext = createContext<TagContext>(null);

export function TagProvider({ children }: { children: React.ReactNode }) {
  const storeRef = useRef<TagContext>();
  if (!storeRef.current) {
    storeRef.current = createTagStore();
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