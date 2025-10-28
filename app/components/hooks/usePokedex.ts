'use client';

import { dexClient } from '@/app/helpers/pokedex.client';
import { PokeNodePokemon } from '@/app/helpers/pokemon';
import { useEffect, useMemo, useRef, useState } from 'react';

export function usePokedex(autoLoad = true) {
    const [loaded, setLoaded] = useState(() => dexClient.size() > 0);
    const [error, setError] = useState<string | null>(null);
  
    useEffect(() => {
      let cancelled = false;
  
      async function hydrate() {
        if (loaded || !autoLoad) return;
        try {
          await dexClient.loadAll();
          if (!cancelled) setLoaded(true);
        } catch (err: any) {
          if (!cancelled) setError(err.message ?? 'Unknown error');
        }
      }
  
      hydrate();
      return () => {
        cancelled = true;
      };
    }, [autoLoad, loaded]);
  
    const all = useMemo(() => dexClient.all(), [loaded]);
    const search = useMemo(
      () => (q: string): PokeNodePokemon[] => dexClient.search(q),
      []
    );
  
    return {
      dexClient,
      loaded,
      all,
      search,
      size: dexClient.size(),
      error,
    };
  }
  