const isServer = typeof window === "undefined";

export interface CacheStore {
    init(): Promise<void>;
    get(key: string): Promise<string | null>;
    set(key: string, value: string): Promise<void>;
    del(key: string): Promise<void>;
    keys(prefix?: string): Promise<string[]>;
  }
const CacheImpl = (await import("./cache.server")).ServerSQLiteCache;

  //   /* -------------------------- Factory helper --------------------------- */
export async function makeCache() {
    const store = new CacheImpl();
    await store.init();
    return store;
  }
  