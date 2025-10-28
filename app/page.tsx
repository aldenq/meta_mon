'use client';

import React from 'react';
import SearchablePokedex from './components/SearchablePokedex';

export default function PokedexPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 to-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <h1 className="text-3xl font-bold mb-6 text-gray-800">Pokédex Explorer</h1>

        {/* Main Pokedex UI */}
        <SearchablePokedex />

        {/* Footer */}
        <footer className="mt-12 text-center text-gray-500 text-sm">
        </footer>
      </div>
    </div>
  );
}
