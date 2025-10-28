'use client';

import React, { useMemo, useState } from 'react';
import { PokeNodePokemon } from '../helpers/pokemon';
import { usePokedex } from './hooks/usePokedex';
import { PokemonGrid } from './pokemonGrid';

function useDebounced<T>(value: T, delay = 250) {
  const [v, setV] = useState(value);
  React.useEffect(() => {
    const id = setTimeout(() => setV(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return v;
}

type Props = {
  /** auto-hydrate count on first mount */
  initialCount?: number;
};

export default function SearchablePokedex({ initialCount = 50 }: Props) {
  const { loaded, all, search, loadMore } = usePokedex({ bound: initialCount, concurrency: 10 });

  const [q, setQ] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [sortKey, setSortKey] = useState<'id' | 'name' | 'total'>('id');

  const dq = useDebounced(q, 200);

  const results = useMemo(() => {
    const base: PokeNodePokemon[] = dq.trim() ? search(dq) : all;

    const filtered =
      typeFilter === 'all'
        ? base
        : base.filter((p) => p.types.map((t) => t.toLowerCase()).includes(typeFilter));

    const sorted = [...filtered].sort((a, b) => {
      if (sortKey === 'id') return (a.id ?? 0) - (b.id ?? 0);
      if (sortKey === 'name') return (a.name ?? '').localeCompare(b.name ?? '');
      // total base stats
      const ta = Object.values(a.baseStats).reduce((s, v) => s + v, 0);
      const tb = Object.values(b.baseStats).reduce((s, v) => s + v, 0);
      return tb - ta;
    });

    return sorted;
  }, [dq, all, typeFilter, sortKey, search]);

  const uniqueTypes = useMemo(() => {
    const s = new Set<string>();
    for (const p of all) for (const t of p.types) s.add(t.toLowerCase());
    return ['all', ...Array.from(s).sort()];
  }, [all]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 to-white p-6">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between mb-6">
          <div className="flex-1">
            <label className="block text-sm text-gray-600 mb-1">Search by name or ID</label>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="e.g., pikachu, 25, char, saur…"
              className="w-full rounded-lg border px-3 py-2 outline-none focus:ring-2 focus:ring-sky-400"
            />
          </div>

          <div className="flex gap-3">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Type</label>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="rounded-lg border px-3 py-2 outline-none focus:ring-2 focus:ring-sky-400 capitalize"
              >
                {uniqueTypes.map((t) => (
                  <option key={t} value={t} className="capitalize">
                    {t}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm text-gray-600 mb-1">Sort</label>
              <select
                value={sortKey}
                onChange={(e) => setSortKey(e.target.value as any)}
                className="rounded-lg border px-3 py-2 outline-none focus:ring-2 focus:ring-sky-400"
              >
                <option value="id">ID</option>
                <option value="name">Name</option>
                <option value="total">Total Stats</option>
              </select>
            </div>

            <button
              onClick={() => loadMore(151)}
              className="self-end rounded-lg bg-sky-600 px-4 py-2 text-white hover:bg-sky-700"
              title="Hydrate up to ID 151"
            >
              Load Gen 1
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between mb-3 text-sm text-gray-600">
          <span>
            {loaded ? `${results.length} shown` : 'Loading…'}{' '}
            <span className="text-gray-400">({all.length} cached)</span>
          </span>
          {dq && <span className="text-gray-500">query: “{dq}”</span>}
        </div>

        <PokemonGrid pokemons={results} emptyMessage={loaded ? 'No matches.' : 'Loading…'} />
      </div>
    </div>
  );
}
