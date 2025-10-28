'use client';

import React from 'react';
import Image from 'next/image';
import { PokeNodePokemon } from '../helpers/pokemon';

interface PokemonCardProps {
  pokemon: PokeNodePokemon;
}

/**
 * Displays a detailed Pokémon card using data from PokeNodePokemon.
 */
export function PokemonCard({ pokemon }: PokemonCardProps) {
  if (!pokemon) return null;

  return (
    <div className="max-w-sm mx-auto my-6 p-6 bg-gradient-to-b from-sky-50 to-white rounded-2xl shadow-lg border border-sky-100">
      <div className="text-center mb-4">
        {pokemon.id && (
          <Image
            src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${pokemon.id}.png`}
            alt={pokemon.name || 'pokemon'}
            width={200}
            height={200}
            className="mx-auto drop-shadow-md"
          />
        )}
        <h2 className="text-2xl font-bold capitalize mt-2 text-gray-800">
          {pokemon.name}
        </h2>
        <p className="text-gray-500 text-sm">#{pokemon.id}</p>
      </div>

      <div className="flex justify-center gap-2 mb-4">
        {pokemon.types.map((type) => (
          <span
            key={type}
            className={`px-3 py-1 rounded-full text-white text-sm capitalize ${
              typeColors[type as keyof typeof typeColors] || 'bg-gray-500'
            }`}
          >
            {type}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm text-gray-700 mb-4">
        <div>
          <strong>Height:</strong> {pokemon.height! / 10} m
        </div>
        <div>
          <strong>Weight:</strong> {pokemon.weight! / 10} kg
        </div>
        <div className="col-span-2">
          <strong>Abilities:</strong>{' '}
          {pokemon.abilities.map((a) => (
            <span
              key={a}
              className="inline-block bg-sky-100 text-sky-700 px-2 py-0.5 rounded text-xs mr-1 capitalize"
            >
              {a}
            </span>
          ))}
        </div>
      </div>

      <div className="mb-2">
        <strong>Base Stats</strong>
        <div className="mt-2 space-y-1">
          {Object.entries(pokemon.baseStats).map(([stat, val]) => (
            <div key={stat} className="flex justify-between items-center text-sm">
              <span className="capitalize text-gray-600">{stat}</span>
              <div className="flex-1 mx-2 bg-gray-200 h-2 rounded overflow-hidden">
                <div
                  className="bg-sky-500 h-full rounded"
                  style={{ width: `${(val / 255) * 100}%` }}
                ></div>
              </div>
              <span className="w-8 text-right text-gray-700">{val}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const typeColors = {
  normal: 'bg-gray-400',
  fire: 'bg-red-500',
  water: 'bg-blue-500',
  grass: 'bg-green-500',
  electric: 'bg-yellow-400',
  ice: 'bg-cyan-400',
  fighting: 'bg-orange-700',
  poison: 'bg-purple-500',
  ground: 'bg-amber-600',
  flying: 'bg-sky-400',
  psychic: 'bg-pink-500',
  bug: 'bg-lime-500',
  rock: 'bg-stone-500',
  ghost: 'bg-indigo-600',
  dragon: 'bg-indigo-700',
  dark: 'bg-gray-800',
  steel: 'bg-gray-500',
  fairy: 'bg-rose-400',
};
