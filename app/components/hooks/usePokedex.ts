'use client';

import { dex, GlobalPokedex } from '@/app/helpers/pokedex';
import { PokeNodePokemon } from '@/app/helpers/pokemon';
import { useEffect, useMemo, useRef, useState } from 'react';

export function usePokedex(initialAutoHydrate?: { bound: number; concurrency?: number }) {
    const [loaded, setLoaded] = useState(() => dex.size() > 0);
    const [progress, setProgress] = useState(0);
    
    // useEffect(() => {
    //     let cancelled = false;
    //     if (!loaded && initialAutoHydrate) {
    //       const { bound, concurrency = 10 } = initialAutoHydrate;
    //       dex.autoHydrate(bound, concurrency)
    //          .finally(() => !cancelled && setLoaded(true));
    //     }
    //     return () => { cancelled = true; };
    //   }, [loaded, initialAutoHydrate]);
      
  
    const all = useMemo(() => dex.all(), [loaded, progress]);
    const search = (q: string) => dex.search(q);
    // const loadMore = async (toId: number, step = 50) => { /* ... */ };
  
    return { dex, loaded, progress, all, search };
  }
  