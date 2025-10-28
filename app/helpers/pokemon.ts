import { PokemonClient, NamedAPIResource, Pokemon } from 'pokenode-ts';

export class PokeNodePokemon {
  private static client = new PokemonClient();

  /** The API id (or index) of the Pokémon */
  public id: number | null = null;
  /** The name (string) of the Pokémon */
  public name: string | null = null;
  /** The height (in decimetres) */
  public height: number | null = null;
  /** The weight (in hectograms) */
  public weight: number | null = null;
  /** A list of types (type names) */
  public types: string[] = [];
  /** A list of abilities (ability names) */
  public abilities: string[] = [];
  /** A list of base stats: name → value */
  public baseStats: Record<string, number> = {};




  private last_access: number = Date.now(); // timestamp in ms
  private TTL: number = 0;
  private dirty:boolean  = true;

  public constructor() {}
 
  /**
   * Factory to create an instance and load all the data from the API by id or name.
   */
  public static async create(idOrName: number | string): Promise<PokeNodePokemon> {
    const instance = new PokeNodePokemon();
    const data: Pokemon = await PokeNodePokemon.client.getPokemonByName(idOrName.toString());
    instance.id = data.id;
    instance.name = data.name;
    instance.height = data.height;
    instance.weight = data.weight;

    // types
    instance.types = data.types.map(t => t.type.name);

    // abilities
    instance.abilities = data.abilities.map(a => a.ability.name);

    // base stats
    for (const stat of data.stats) {
      instance.baseStats[stat.stat.name] = stat.base_stat;
    }
    instance.randomizeTTL()
    return instance;
    
  }

  /**
   * Update this instance by fetching fresh data from the API (based on current id or name).
   */
  public async reload(): Promise<void> {
    if (this.id == null && this.name == null) {
      throw new Error('Cannot reload because id and name are both null');
    }
    const idOrName = this.id != null ? this.id : this.name!;
    const data: Pokemon = await PokeNodePokemon.client.getPokemonByName(idOrName.toString());

    // update fields
    this.id = data.id;
    this.name = data.name;
    this.height = data.height;
    this.weight = data.weight;
    this.types = data.types.map(t => t.type.name);
    this.abilities = data.abilities.map(a => a.ability.name);

    this.baseStats = {};
    for (const stat of data.stats) {
      this.baseStats[stat.stat.name] = stat.base_stat;
    }
    this.dirty=true;
    this.randomizeTTL()
  }

  
  public getPrimaryType(): string | null {
    return this.types.length > 0 ? this.types[0] : null;
  }


  public randomizeTTL(): void {
    const min = 1000 * 60 * 60 * 12; // 12 hours
    const max = 1000 * 60 * 60 * 24*7; // 7 days (assumption is that updates are very slow)
    this.TTL = Math.random() * (max - min) + min;
    this.last_access = Date.now();
  }


  public getTotalBaseStats(): number {
    return Object.values(this.baseStats).reduce((sum, val) => sum + val, 0);
  }


  public isExpired(): boolean {
    return Date.now() - this.last_access > this.TTL;
  }

  public toJSON(): Record<string, any> {
    return {
      id: this.id,
      name: this.name,
      height: this.height,
      weight: this.weight,
      types: this.types,
      abilities: this.abilities,
      baseStats: this.baseStats,
      last_access: this.last_access,
      TTL: this.TTL,
      dirty: this.dirty,
    };
  }
}



