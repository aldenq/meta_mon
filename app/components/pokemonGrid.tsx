'use client';

import React from 'react';
import { PokeNodePokemon } from '../helpers/pokemon';
import { PokemonCard } from './PokemonCard';

type PokemonGridProps = {
  pokemons: PokeNodePokemon[];
  onSelect?: (p: PokeNodePokemon) => void;
  emptyMessage?: string;
};

/**
 * Responsive grid wrapper for a list of PokeNodePokemon instances.
 */
export function PokemonGrid({
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
    >
      {pokemons.map((p, idx) => {
        // Build a stable key: prefer id; fall back to name; else index
        const key = p.id ?? (p.name ? `name-${p.name}` : `idx-${idx}`);
        return (
          <button
            key={key}
            type="button"
            className="text-left rounded-2xl transition hover:-translate-y-0.5 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-sky-400"
            onClick={() => onSelect?.(p)}
          >
            <PokemonCard pokemon={p} />
          </button>
        );
      })}
    </div>
  );
}
