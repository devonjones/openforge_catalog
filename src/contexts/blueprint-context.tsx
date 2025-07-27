'use client'

import React, { createContext, useContext, useRef, useEffect, Suspense } from 'react';
import { StoreApi, useStore } from 'zustand';
import { createBlueprintStore, BlueprintStore } from '@/stores/blueprint-store';
import { useSearchParams } from 'next/navigation';

type BlueprintContext = StoreApi<BlueprintStore> | null;

export const BlueprintContext = createContext<BlueprintContext>(null);

interface BlueprintProviderProps {
  children: React.ReactNode;
  autoload?: boolean;
}

interface BlueprintProviderInnerProps extends BlueprintProviderProps {
  storeRef: React.MutableRefObject<BlueprintContext>;
}

function BlueprintProviderInner({ children, autoload = false, storeRef }: BlueprintProviderInnerProps) {
  const searchParams = useSearchParams();
  const blueprintId = autoload ? searchParams.get('blueprint_id') : null;
  const md5 = autoload ? searchParams.get('md5') : null;

  useEffect(() => {
    if (blueprintId) {
      storeRef.current?.getState().fetchBlueprintById(blueprintId)
        .then(blueprint => {
          storeRef.current?.getState().setSelectedBlueprint(blueprint);
        })
        .catch(error => {
          console.error('Failed to fetch initial blueprint:', error);
        });
    } else if (md5) {
      storeRef.current?.getState().fetchBlueprintByMd5(md5)
        .then(blueprint => {
          storeRef.current?.getState().setSelectedBlueprint(blueprint);
        })
        .catch(error => {
          console.error('Failed to fetch initial blueprint:', error);
        });
    }
  }, [blueprintId, md5, storeRef]);

  return (
    <BlueprintContext.Provider value={storeRef.current}>
      {children}
    </BlueprintContext.Provider>
  );
}

export function BlueprintProvider({ children, autoload = false }: BlueprintProviderProps) {
  const storeRef = useRef<BlueprintContext>(null);

  if (!storeRef.current) {
    storeRef.current = createBlueprintStore();
  }

  if (autoload) {
    return (
      <Suspense fallback={
        <BlueprintContext.Provider value={storeRef.current}>
          {children}
        </BlueprintContext.Provider>
      }>
        <BlueprintProviderInner autoload={autoload} storeRef={storeRef}>
          {children}
        </BlueprintProviderInner>
      </Suspense>
    );
  }

  return (
    <BlueprintContext.Provider value={storeRef.current}>
      {children}
    </BlueprintContext.Provider>
  );
}

export function useBlueprintContext<T>(selector: (state: BlueprintStore) => T) {
  const store = useContext(BlueprintContext);
  if (!store) {
    throw new Error('useBlueprintContext must be used within a BlueprintProvider');
  }
  return useStore(store, selector);
}
