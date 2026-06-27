import { createContext, type RouterContextProvider } from "react-router";

const TTL_MS = 60 * 60 * 1000; // 1 hour

interface CacheEntry {
  data: unknown;
  expiresAt: number;
}

export interface AnalyticsCache {
  get<T>(key: string): T | undefined;
  set<T>(key: string, value: T): void;
}

// Module-level store: persists across requests within the same CF Worker isolate
const _store = new Map<string, CacheEntry>();

const _cache: AnalyticsCache = {
  get<T>(key: string): T | undefined {
    const e = _store.get(key);
    if (!e) return undefined;
    if (e.expiresAt < Date.now()) {
      _store.delete(key);
      return undefined;
    }
    return e.data as T;
  },
  set<T>(key: string, value: T): void {
    _store.set(key, { data: value, expiresAt: Date.now() + TTL_MS });
  },
};

// Default value = the module-level cache; no worker setup needed
export const analyticsCacheContext = createContext<AnalyticsCache>(_cache);

export function getAnalyticsCache(context: Readonly<RouterContextProvider>): AnalyticsCache {
  return context.get(analyticsCacheContext);
}
