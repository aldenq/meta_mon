'use client';

import React from 'react';
import { PokeNodePokemon } from '../helpers/pokemon';
import { PokemonCard } from './PokemonCard';

type PokemonGridProps = {
  pokemons: PokeNodePokemon[];
  onSelect?: (p: PokeNodePokemon) => void;
  emptyMessage?: string;
};


function PokemonGridInner({
  pokemons,
  onSelect,
  emptyMessage = 'No Pokémon found.',
}: PokemonGridProps) {
  if (!pokemons?.length) {
    return (
      <div className="flex items-center justify-center py-16 text-gray-500">
        {emptyMessage}
      </div>
    );
  }

  // Precompute a stable key per item (string) + its index
  const items = React.useMemo(
    () =>
      pokemons.map((p, idx) => ({
        idx,
        key:
          p.id != null
            ? `id-${p.id}`
            : p.name
            ? `name-${p.name}`
            : `idx-${idx}`,
      })),
    [pokemons]
  );

  // One handler for the whole grid; finds nearest button with data-idx
  const handleGridClick = React.useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!onSelect) return;
      const target = e.target as HTMLElement;
      const btn = target.closest<HTMLButtonElement>('button[data-idx]');
      if (!btn) return;
      const i = Number(btn.dataset.idx);
      // Guard against stale indices if the underlying array changed mid-flight
      if (Number.isInteger(i) && i >= 0 && i < pokemons.length) {
        onSelect(pokemons[i]);
      }
    },
    [onSelect, pokemons]
  );

  const interactive = Boolean(onSelect);

  return (
    <div
      className="
        grid gap-6
        grid-cols-1
        sm:grid-cols-2
        lg:grid-cols-3
        xl:grid-cols-4
        2xl:grid-cols-5
      "
      onClick={handleGridClick}
    >
      {items.map(({ key, idx }) => {
        const p = pokemons[idx];
        // If not interactive, don't render a button (lighter DOM & a11y)
        if (!interactive) {
          return (
            <div
              key={key}
              className="rounded-2xl"
            >
              <PokemonCard pokemon={p} />
            </div>
          );
        }
        return (
          <button
            key={key}
            type="button"
            data-idx={idx}
            className="text-left rounded-2xl transition hover:-translate-y-0.5 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-sky-400"
            aria-label={p.name ? `Open details for ${p.name}` : 'Open details'}
          >
            <PokemonCard pokemon={p} />
          </button>
        );
      })}
    </div>
  );
}

// Memoize to skip re-renders when props are referentially stable.
export const PokemonGrid = React.memo(
  PokemonGridInner,
  (prev, next) =>
    prev.pokemons === next.pokemons &&
    prev.onSelect === next.onSelect &&
    prev.emptyMessage === next.emptyMessage
);
