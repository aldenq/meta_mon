import Fuse from "fuse.js";
import { PokeNodePokemon } from "./pokemon";

export class GlobalPokedex {
  /** Internal cache of all loaded Pokémon */
  private pokemons: Map<number, PokeNodePokemon> = new Map();
  /** Also map by name for convenience */
  private nameIndex: Map<string, PokeNodePokemon> = new Map();

  /** Fuse.js instance for fuzzy search */
  private fuse: Fuse<PokeNodePokemon> | null = null;
  /** Cached data array used by Fuse */
  private fuseData: PokeNodePokemon[] = [];

  /** 
   * Load (and cache) a Pokémon by its id or name. 
   * If already loaded, returns the existing instance. 
   */
  public async load(idOrName: number | string): Promise<PokeNodePokemon> {
    const existing =
      typeof idOrName === "number"
        ? this.pokemons.get(idOrName)
        : this.nameIndex.get(idOrName.toLowerCase());

    if (existing) return existing;

    const pokemon = await PokeNodePokemon.create(idOrName);
    if (pokemon.id != null) {
      this.pokemons.set(pokemon.id, pokemon);
    }
    if (pokemon.name) {
      this.nameIndex.set(pokemon.name.toLowerCase(), pokemon);
    }

    this.refreshFuseIndex();
    return pokemon;
  }

  /**
   * Retrieve a Pokémon from cache by id or name, if loaded.
   */
  public get(idOrName: number | string): PokeNodePokemon | null {
    if (typeof idOrName === "number") {
      return this.pokemons.get(idOrName) ?? null;
    } else {
      return this.nameIndex.get(idOrName.toLowerCase()) ?? null;
    }
  }

  /**
   * Force reload (rehydrate) a Pokémon from the API and update cache.
   */
  public async reload(idOrName: number | string): Promise<PokeNodePokemon> {
    const pokemon = await PokeNodePokemon.create(idOrName);
    if (pokemon.id != null) {
      this.pokemons.set(pokemon.id, pokemon);
    }
    if (pokemon.name) {
      this.nameIndex.set(pokemon.name.toLowerCase(), pokemon);
    }

    this.refreshFuseIndex();
    return pokemon;
  }

  /**
   * Hydrate the pokedex with a list of ids or names.
   */
  public async hydrate(list: Array<number | string>): Promise<void> {
    await Promise.all(list.map(id => this.load(id)));
    this.refreshFuseIndex();
  }

  /**
   * Automatically hydrate the pokedex with Pokémon IDs 1..bound.
   */
  public async autoHydrate(bound: number, concurrency: number = 10): Promise<void> {
    const ids = Array.from({ length: bound }, (_, i) => i + 1);
    for (let i = 0; i < ids.length; i += concurrency) {
      const batch = ids.slice(i, i + concurrency);
      await Promise.all(batch.map(id => this.load(id)));
      await new Promise(r => setTimeout(r, 100));
      console.log("loaded in", i);
    }
    this.refreshFuseIndex();
  }

  /**
   * Returns all currently loaded Pokémon as an array.
   */
  public all(): PokeNodePokemon[] {
    return Array.from(this.pokemons.values());
  }

  /**
   * Clears all loaded Pokémon from the cache.
   */
  public clear(): void {
    this.pokemons.clear();
    this.nameIndex.clear();
    this.fuse = null;
    this.fuseData = [];
  }

  /**
   * Number of Pokémon currently cached.
   */
  public size(): number {
    return this.pokemons.size;
  }

  /**
   * Rebuild the Fuse.js index with current data.
   */
  private refreshFuseIndex(): void {
    this.fuseData = this.all();
    this.fuse = new Fuse(this.fuseData, {
      keys: [
        { name: "name", weight: 0.8 },
        { name: "id", weight: 0.2 },
      ],
      threshold: 0.4, // lower = stricter matching
      includeScore: true,
    });
  }

  /**
   * Perform fuzzy search on Pokémon name or ID.
   * Returns ranked matches (highest confidence first).
   */
  public search(query: string): PokeNodePokemon[] {
    if (!this.fuse) this.refreshFuseIndex();

    if (!this.fuse) return [];
    const results = this.fuse.search(query);
    return results.map(r => r.item);
  }


  /**
   * Convert the Pokedex into a JSON-safe object for transport.
   */
  public serialize(): string {
    const data = this.all().map(p => ({
      id: p.id,
      name: p.name,
      height: p.height,
      weight: p.weight,
      types: p.types,
      abilities: p.abilities,
      baseStats: p.baseStats,
    }));

    return JSON.stringify(data);
  }

  /**
   * Rebuild the Pokedex from serialized JSON data.
   */
  public static deserialize(json: string): GlobalPokedex {
    const raw: any[] = JSON.parse(json);
    const dex = new GlobalPokedex();

    for (const p of raw) {
      const poke = Object.assign(new PokeNodePokemon(), p);
      if (poke.id != null) dex.pokemons.set(poke.id, poke);
      if (poke.name) dex.nameIndex.set(poke.name.toLowerCase(), poke);
    }

    dex.refreshFuseIndex();
    return dex;
  }
  
}

export const dex = new GlobalPokedex();
const isServer = typeof window === "undefined";

if (isServer) {
  console.log("i am the server1");

  // Server: fully hydrate the dex once at startup
  const FULL_RANGE = 1327; // or 898, depending on your needs
  dex.autoHydrate(FULL_RANGE, 1)
    .then(() => console.log(`[Server] Hydrated ${dex.size()} Pokémon.`))
    .catch((err) => console.error("Hydration failed:", err));
} else {
  // Client: lazy async fetch from API, not PokeAPI
  (async () => {
    try {
      const res = await fetch("/api/pokedex.json");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.text();
      const hydrated = GlobalPokedex.deserialize(json);
      // Copy into singleton
      Object.assign(dex, hydrated);
      console.log(`[Client] Loaded cached Pokédex with ${dex.size()} Pokémon.`);
    } catch (err) {
      console.warn("Client Pokédex load failed:", err);
    }
  })();
}