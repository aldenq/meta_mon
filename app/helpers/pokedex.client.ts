// pokedex.client.ts
import Fuse from "fuse.js";
import { PokeNodePokemon } from "./pokemon";

export class ClientPokedex {
  private pokemons: Map<number, PokeNodePokemon> = new Map();
  private nameIndex: Map<string, PokeNodePokemon> = new Map();

  private fuse: Fuse<PokeNodePokemon> | null = null;
  private fuseData: PokeNodePokemon[] = [];

  /** Request one Pokémon from server and cache it locally */
  public async get(idOrName: number | string): Promise<PokeNodePokemon> {
    const key =
      typeof idOrName === "number"
        ? `id=${idOrName}`
        : `name=${encodeURIComponent(idOrName)}`;

    const res = await fetch(`/api/pokemon?${key}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const p = Object.assign(new PokeNodePokemon(), await res.json());
    this.pokemons.set(p.id!, p);
    if (p.name) this.nameIndex.set(p.name.toLowerCase(), p);

    this.refreshFuseIndex();
    return p;
  }

  /** Load all Pokémon from serialized dataset on the server */
  public async loadAll(): Promise<void> {
    const res = await fetch("/api/pokedex.json");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const all: any[] = await res.json();
    for (const p of all) {
      const poke = Object.assign(new PokeNodePokemon(), p);
      this.pokemons.set(poke.id!, poke);
      if (poke.name) this.nameIndex.set(poke.name.toLowerCase(), poke);
    }

    this.refreshFuseIndex();
  }

  /** Returns all cached Pokémon */
  public all(): PokeNodePokemon[] {
    return Array.from(this.pokemons.values());
  }

  /** Retrieve a cached Pokémon if it exists locally */
  public getCached(idOrName: number | string): PokeNodePokemon | null {
    if (typeof idOrName === "number") return this.pokemons.get(idOrName) ?? null;
    return this.nameIndex.get(idOrName.toLowerCase()) ?? null;
  }

  /** Number of currently cached Pokémon */
  public size(): number {
    return this.pokemons.size;
  }

  /** Rebuild the Fuse.js fuzzy-search index */
  private refreshFuseIndex(): void {
    this.fuseData = this.all();
    this.fuse = new Fuse(this.fuseData, {
      keys: [
        { name: "name", weight: 0.8 },
        { name: "id", weight: 0.2 },
        // you could add more like "types" or "abilities" if useful
      ],
      threshold: 0.4,
      includeScore: true,
    });
  }

  /** Perform fuzzy search on Pokémon names/IDs */
  public search(query: string): PokeNodePokemon[] {
    if (!this.fuse) this.refreshFuseIndex();
    if (!this.fuse) return [];
    const results = this.fuse.search(query);
    return results.map((r) => r.item);
  }
}

export const dexClient = new ClientPokedex();
