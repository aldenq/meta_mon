// pokedex.server.ts
export const runtime = "nodejs";

import { PokeNodePokemon } from "./pokemon";
import { CacheStore, makeCache } from "./cache";

const K = {
  pokemon: (id: number) => `pokemon:${id}`,
  nameToId: (name: string) => `name:${name.toLowerCase()}`,
  allIds: "pokedex:all_ids",
};

export class ServerPokedex {
  private pokemons: Map<number, PokeNodePokemon> = new Map();
  private store: CacheStore | null = null;
  private sweepIntervalMs = 1000 * 60 * 10; // every 10 min
  private sweepBatchSize = 5; // reload up to 5 expired entries each pass
  private sweeping = false;
  constructor() {
    // void this.init();
  }

  public async init(): Promise<void> {
    this.store = await makeCache();
    await this.hydrateFromIndex(50, 100);
    this.startSweeper();


  }

  /** Get or load a Pokémon (cached or via PokeAPI) */
  public async get(idOrName: number | string): Promise<PokeNodePokemon> {
    if (!this.store) await this.init();

    // Try memory
    if (typeof idOrName === "number" && this.pokemons.has(idOrName))
      return this.pokemons.get(idOrName)!;

    // Try persistent
    const fromPersistent = await this.loadFromPersistent(idOrName);
    if (fromPersistent) {
      console.log("loaded from persistent", idOrName)
      return fromPersistent;
    }

    // Fetch from API
    const p = await PokeNodePokemon.create(idOrName);
    await this.persistPokemon(p);
    this.pokemons.set(p.id!, p);
    return p;
  }

  /** Reload all Pokemon up to count, using get() to handle cache misses */
  public async bulkHydrate(count = 1010, concurrency = 10, delayMs = 100): Promise<void> {
    if (!this.store) await this.init();
    const ids = Array.from({ length: count }, (_, i) => i + 1);

    console.log(`[ServerPokedex] Hydrating ${count} Pokemon...`);
    for (let i = 0; i < ids.length; i += concurrency) {
      const batch = ids.slice(i, i + concurrency);
      await Promise.all(
        batch.map(async (id) => {
          try {
            await this.get(id);
          } catch (e) {
            console.warn(`[ServerPokedex] Failed ${id}`, e);
          }
        })
      );
      if (delayMs) await new Promise(r => setTimeout(r, delayMs));
    }
    console.log(`[ServerPokedex] Hydration complete.`);
  }


  public async hydrateFromIndex(concurrency = 10, delayMs = 100): Promise<void> {
    console.log("[ServerPokedex] Fetching Pokemon index from PokeAPI...");
    const res = await fetch("https://pokeapi.co/api/v2/pokemon?limit=100000&offset=0");
    if (!res.ok) throw new Error(`Failed to fetch index: HTTP ${res.status}`);

    const data = await res.json() as {
      count: number;
      results: { name: string; url: string }[];
    };

    console.log(`[ServerPokedex] Got ${data.results.length} Pokémon entries from index.`);

    // Parse out IDs from the URLs
    const entries = data.results.map((r) => {
      const idMatch = r.url.match(/\/pokemon\/(\d+)\//);
      const id = idMatch ? parseInt(idMatch[1], 10) : null;
      return { name: r.name, id };
    }).filter((e) => e.id !== null) as { name: string; id: number }[];

    // Hydrate with concurrency control
    for (let i = 0; i < entries.length; i += concurrency) {
      const batch = entries.slice(i, i + concurrency);
      await Promise.all(batch.map(async (entry) => {
        try {
          await this.get(entry.id);
        } catch (e) {
          console.warn(`[ServerPokedex] Failed to load ${entry.name} (#${entry.id}):`, e);
        }
      }));
      console.log(`[ServerPokedex] Hydrated ${Math.min(i + concurrency, entries.length)} / ${entries.length}`);
      if (delayMs > 0) await new Promise(r => setTimeout(r, delayMs));
    }

    console.log("[ServerPokedex] Full hydration complete.");
  }


  /** Return a JSON-safe serialized dump of all Pokémon */
  public serializeAll(): string {
    const all = Array.from(this.pokemons.values()).map(p => ({
      id: p.id,
      name: p.name,
      height: p.height,
      weight: p.weight,
      types: p.types,
      abilities: p.abilities,
      baseStats: p.baseStats,
    }));
    return JSON.stringify(all);
  }

  private async loadFromPersistent(idOrName: number | string): Promise<PokeNodePokemon | null> {
    if (!this.store) return null;
    let id: number | null = null;

    if (typeof idOrName === "number") id = idOrName;
    else {
      const rawId = await this.store.get(K.nameToId(idOrName));
      if (rawId) id = Number(rawId);
    }

    if (id == null) return null;
    const raw = await this.store.get(K.pokemon(id));
    if (!raw) return null;

    try {
      const p = Object.assign(new PokeNodePokemon(), JSON.parse(raw));
      this.pokemons.set(p.id!, p);
      return p;
    } catch {
      return null;
    }
  }

  private async persistPokemon(p: PokeNodePokemon): Promise<void> {
    if (!this.store || !p.id) return;
    await this.store.set(K.pokemon(p.id), JSON.stringify(p));
    if (p.name) await this.store.set(K.nameToId(p.name), String(p.id));
    const idsNow = Array.from(this.pokemons.keys());
    await this.store.set(K.allIds, JSON.stringify(idsNow));
  }

  /** Number of currently cached Pokémon */
  public size(): number {
    return this.pokemons.size;
  }

  private startSweeper(): void {
    if (this.sweeping) return;
    this.sweeping = true;

    const tick = async () => {
      try {
        await this.sweepExpired();
      } catch (err) {
        console.warn("[ServerPokedex] Sweep error:", err);
      } finally {
        setTimeout(tick, this.sweepIntervalMs);
      }
    };

    setTimeout(tick, this.sweepIntervalMs);
  }

    /** Sweep for expired Pokémon and refresh them slowly */
  private async sweepExpired(): Promise<void> {
      const now = Date.now();
      const expired = Array.from(this.pokemons.values()).filter(p => p.isExpired());
      if (expired.length === 0) return;
  
      // Shuffle the list to avoid reloading in order
      for (let i = expired.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [expired[i], expired[j]] = [expired[j], expired[i]];
      }
  
      const batch = expired.slice(0, this.sweepBatchSize);
      console.log(`[ServerPokedex] Sweeping ${batch.length} expired Pokémon...`);
  
      await Promise.all(batch.map(async (p) => {
        try {
          await p.reload();
          await this.persistPokemon(p);
          console.log(`[ServerPokedex] Reloaded #${p.id} (${p.name})`);
        } catch (e) {
          console.warn(`[ServerPokedex] Failed to reload #${p.id}:`, e);
        }
      }));
    }


}

export const dexServer = new ServerPokedex();
