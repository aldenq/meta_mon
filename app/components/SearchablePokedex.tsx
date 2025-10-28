'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { PokeNodePokemon } from '../helpers/pokemon';
import { usePokedex } from './hooks/usePokedex';
import { PokemonGrid } from './pokemonGrid';

function useDebounced<T>(value: T, delay = 250) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setV(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return v;
}

export default function SearchablePokedex() {
  const { loaded, all, search } = usePokedex(true);

  const [q, setQ] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [sortKey, setSortKey] = useState<'id' | 'name' | 'total'>('id');

  // Fast debounce for local Fuse search
  const dqLocal = useDebounced(q, 200);
  // Slow debounce for advanced server search (1.2s)
  const dqAdvanced = useDebounced(q, 1200);

  // ---------- Local (Fuse) base results before filters/sort ----------
  const localBase: PokeNodePokemon[] = useMemo(
    () => (dqLocal.trim() ? search(dqLocal) : all),
    [dqLocal, all, search]
  );

  // ---------- Advanced search states ----------
  const [advResults, setAdvResults] = useState<PokeNodePokemon[]>([]);
  const [advLoading, setAdvLoading] = useState(false);
  const [advUsed, setAdvUsed] = useState(false);
  const [advError, setAdvError] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const lastAdvQueryRef = useRef<string>('');
  const lastAdvTsRef = useRef<number>(0);

  // Tunables
  const minCharsForAdvanced = 3;        // don't hit server for super-short queries
  const advancedCooldownMs = 5000;      // at least 5s between server calls

  // Kick advanced only after the long debounce,
  // and only if local results are empty, query is long enough,
  // the query changed, and cooldown elapsed.
  useEffect(() => {
    // Reset UI indicators anytime the base query changes
    setAdvResults([]);
    setAdvError(null);
    setAdvUsed(false);
    setAdvLoading(false);

    const qStr = dqAdvanced.trim();
    if (!qStr) return;
    if (qStr.length < minCharsForAdvanced) return;
    if (localBase.length > 0) return;

    const now = Date.now();
    if (lastAdvQueryRef.current === qStr && now - lastAdvTsRef.current < advancedCooldownMs) {
      // same query within cooldown window — skip
      return;
    }

    // Request setup
    lastAdvQueryRef.current = qStr;
    lastAdvTsRef.current = now;

    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;

    setAdvLoading(true);
    setAdvUsed(true);

    fetch(`/api/search?q=${encodeURIComponent(qStr)}`, { signal: ac.signal })
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<{ candidates: string[] }>;
      })
      .then(({ candidates }) => {
        // Map server candidates back to local dex with fuzzy search
        const mapped = candidates
          .map((cand) => search(cand)[0] ?? null)
          .filter((p): p is PokeNodePokemon => !!p);

        setAdvResults(uniqueById(mapped));
      })
      .catch((err) => {
        if (ac.signal.aborted) return;
        setAdvError(err instanceof Error ? err.message : 'Advanced search failed');
      })
      .finally(() => {
        if (!ac.signal.aborted) setAdvLoading(false);
      });

    return () => {
      ac.abort();
    };
  }, [dqAdvanced, localBase.length, search]);

  // Decide which base list we’ll display (local first, else advanced)
  const effectiveBase = localBase.length > 0 ? localBase : advResults;

  // ---------- Filters + Sorting ----------
  const results = useMemo(() => {
    const filtered =
      typeFilter === 'all'
        ? effectiveBase
        : effectiveBase.filter((p) =>
            p.types.map((t) => t.toLowerCase()).includes(typeFilter)
          );

    const sorted = [...filtered].sort((a, b) => {
      if (sortKey === 'id') return (a.id ?? 0) - (b.id ?? 0);
      if (sortKey === 'name') return (a.name ?? '').localeCompare(b.name ?? '');
      const ta = Object.values(a.baseStats).reduce((s, v) => s + v, 0);
      const tb = Object.values(b.baseStats).reduce((s, v) => s + v, 0);
      return tb - ta; // high → low total stats
    });

    return sorted;
  }, [effectiveBase, typeFilter, sortKey]);

  const uniqueTypes = useMemo(() => {
    const s = new Set<string>();
    for (const p of all) for (const t of p.types) s.add(t.toLowerCase());
    return ['all', ...Array.from(s).sort()];
  }, [all]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 to-white p-6">
      <div className="mx-auto max-w-7xl">
        {/* Controls */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between mb-6">
          <div className="flex-1">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="e.g., pikachu, 25, char, saur…"
              className="w-full rounded-lg border border-gray-300 bg-white text-gray-900 px-3 py-2 outline-none focus:ring-2 focus:ring-sky-400"
            />
           
          </div>

          <div className="flex gap-3">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Type</label>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="rounded-lg border border-gray-300 bg-white text-gray-900 px-3 py-2 outline-none focus:ring-2 focus:ring-sky-400 capitalize"
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
                className="w-full rounded-lg border border-gray-300 bg-white text-gray-900 px-3 py-2 outline-none focus:ring-2 focus:ring-sky-400"
              >
                <option value="id">ID</option>
                <option value="name">Name</option>
                <option value="total">Total Stats</option>
              </select>
            </div>
          </div>
        </div>

        {/* Status row */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3 text-sm text-gray-600">
          <span>
            {loaded ? `${results.length} shown` : 'Loading…'}{' '}
            <span className="text-gray-400">({all.length} cached)</span>
          </span>

          {/* Advanced search indicators */}
          {!!dqLocal.trim() && localBase.length === 0 && (
            <div className="text-xs">
              {advLoading && (
                <span className="inline-block rounded bg-amber-100 text-amber-800 px-2 py-1">
                  No local matches. Waiting… (advanced will run shortly)
                </span>
              )}
              {!advLoading && advUsed && advResults.length > 0 && (
                <span className="inline-block rounded bg-emerald-100 text-emerald-800 px-2 py-1">
                  Showing advanced results
                </span>
              )}
              {!advLoading && advUsed && advResults.length === 0 && (
                <span className="inline-block rounded bg-rose-100 text-rose-800 px-2 py-1">
                  No matches from advanced search
                </span>
              )}
              {advError && (
                <span className="inline-block rounded bg-rose-100 text-rose-800 px-2 py-1">
                  Advanced search error: {advError}
                </span>
              )}
            </div>
          )}
        </div>

        <PokemonGrid
          pokemons={results}
          emptyMessage={
            loaded
              ? dqLocal.trim()
                ? advLoading
                  ? 'Searching server…'
                  : 'No matches.'
                : 'No Pokémon to display.'
              : 'Loading…'
          }
        />
      </div>
    </div>
  );
}

// ---- helpers ----
function uniqueById(list: PokeNodePokemon[]): PokeNodePokemon[] {
  const seen = new Set<number | null>();
  const out: PokeNodePokemon[] = [];
  for (const p of list) {
    const id = p.id ?? null;
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(p);
  }
  return out;
}
