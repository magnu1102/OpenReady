import type {
  AnalysisResult,
  Repository,
  RepositoryReadmeState,
  RepositoryTreeState,
} from "@/types";

// Bumped to 3 in Phase 13: AnalysisResult gained the required `hiddenGem`
// field, so v2 snapshots are dropped on first read and repopulated on refresh.
export const ANALYSIS_CACHE_SCHEMA_VERSION = 3;
export const ANALYSIS_CACHE_RETENTION_LIMIT = 5;
export const ANALYSIS_CACHE_STALE_MS = 24 * 60 * 60 * 1000;

const STORE_PATH = "openready-cache.json";
const STORE_KEY = "analysis-cache";
const LOCAL_STORAGE_KEY = "openready-analysis-cache";

export interface AnalysisCacheSnapshot {
  schemaVersion: typeof ANALYSIS_CACHE_SCHEMA_VERSION;
  username: string;
  repositories: Repository[];
  readmes: Record<string, RepositoryReadmeState>;
  trees: Record<string, RepositoryTreeState>;
  analyses: AnalysisResult[];
  fetchedAt: string;
  savedAt: string;
}

export interface AnalysisCacheMetadata {
  username: string;
  repositoryCount: number;
  fetchedAt: string;
  savedAt: string;
  isStale: boolean;
}

interface AnalysisCacheFile {
  schemaVersion: typeof ANALYSIS_CACHE_SCHEMA_VERSION;
  snapshots: AnalysisCacheSnapshot[];
}

interface CacheStorage {
  read: () => Promise<AnalysisCacheFile>;
  write: (cache: AnalysisCacheFile) => Promise<void>;
  clear: () => Promise<void>;
}

interface TauriStoreLike {
  get<T>(key: string): Promise<T | undefined>;
  set(key: string, value: unknown): Promise<void>;
  delete(key: string): Promise<boolean>;
  save(): Promise<void>;
}

interface CreateSnapshotInput {
  username: string;
  repositories: Repository[];
  readmes: Record<string, RepositoryReadmeState>;
  trees: Record<string, RepositoryTreeState>;
  analyses: AnalysisResult[];
  fetchedAt?: string;
  savedAt?: string;
}

const emptyCache: AnalysisCacheFile = {
  schemaVersion: ANALYSIS_CACHE_SCHEMA_VERSION,
  snapshots: [],
};

export function createAnalysisCacheSnapshot(input: CreateSnapshotInput): AnalysisCacheSnapshot {
  const now = new Date().toISOString();
  return {
    schemaVersion: ANALYSIS_CACHE_SCHEMA_VERSION,
    username: normalizeUsername(input.username),
    repositories: input.repositories,
    readmes: input.readmes,
    trees: input.trees,
    analyses: input.analyses,
    fetchedAt: input.fetchedAt ?? now,
    savedAt: input.savedAt ?? now,
  };
}

export async function saveAnalysisSnapshot(snapshot: AnalysisCacheSnapshot): Promise<void> {
  const storage = await getStorage();
  const cache = await storage.read();
  const normalizedUsername = normalizeUsername(snapshot.username);
  const updatedSnapshot: AnalysisCacheSnapshot = {
    ...snapshot,
    username: normalizedUsername,
    schemaVersion: ANALYSIS_CACHE_SCHEMA_VERSION,
    savedAt: snapshot.savedAt || new Date().toISOString(),
  };
  const nextSnapshots = [
    updatedSnapshot,
    ...cache.snapshots.filter(
      (cached) => normalizeUsername(cached.username) !== normalizedUsername,
    ),
  ]
    .sort((a, b) => Date.parse(b.savedAt) - Date.parse(a.savedAt))
    .slice(0, ANALYSIS_CACHE_RETENTION_LIMIT);

  await storage.write({
    schemaVersion: ANALYSIS_CACHE_SCHEMA_VERSION,
    snapshots: nextSnapshots,
  });
}

export async function getCachedAnalysis(username: string): Promise<AnalysisCacheSnapshot | null> {
  const normalizedUsername = normalizeUsername(username);
  if (!normalizedUsername) return null;

  const cache = await (await getStorage()).read();
  return (
    cache.snapshots.find(
      (snapshot) => normalizeUsername(snapshot.username) === normalizedUsername,
    ) ?? null
  );
}

export async function listCachedAnalyses(now = new Date()): Promise<AnalysisCacheMetadata[]> {
  const cache = await (await getStorage()).read();
  return cache.snapshots.map((snapshot) => snapshotToMetadata(snapshot, now));
}

export async function clearAnalysisCache(): Promise<void> {
  await (await getStorage()).clear();
}

export function isAnalysisSnapshotStale(
  snapshot: AnalysisCacheSnapshot,
  now = new Date(),
): boolean {
  const fetchedAt = Date.parse(snapshot.fetchedAt);
  if (Number.isNaN(fetchedAt)) return true;
  return now.getTime() - fetchedAt > ANALYSIS_CACHE_STALE_MS;
}

export function snapshotToMetadata(
  snapshot: AnalysisCacheSnapshot,
  now = new Date(),
): AnalysisCacheMetadata {
  return {
    username: snapshot.username,
    repositoryCount: snapshot.repositories.length,
    fetchedAt: snapshot.fetchedAt,
    savedAt: snapshot.savedAt,
    isStale: isAnalysisSnapshotStale(snapshot, now),
  };
}

function normalizeUsername(username: string): string {
  return username.trim().toLowerCase();
}

let storagePromise: Promise<CacheStorage> | null = null;

async function getStorage(): Promise<CacheStorage> {
  storagePromise ??= createStorage();
  return storagePromise;
}

async function createStorage(): Promise<CacheStorage> {
  if (isTauriRuntime()) {
    try {
      const { load } = await import("@tauri-apps/plugin-store");
      const store = (await load(STORE_PATH, {
        defaults: { [STORE_KEY]: emptyCache },
      })) as TauriStoreLike;
      return createTauriStorage(store);
    } catch {
      return createLocalStorage();
    }
  }

  return createLocalStorage();
}

function createTauriStorage(store: TauriStoreLike): CacheStorage {
  return {
    read: async () => normalizeCacheFile(await store.get<unknown>(STORE_KEY)),
    write: async (cache) => {
      await store.set(STORE_KEY, cache);
      await store.save();
    },
    clear: async () => {
      await store.delete(STORE_KEY);
      await store.save();
    },
  };
}

function createLocalStorage(): CacheStorage {
  return {
    read: async () => {
      if (typeof window === "undefined") return emptyCache;
      const raw = window.localStorage.getItem(LOCAL_STORAGE_KEY);
      if (!raw) return emptyCache;
      try {
        return normalizeCacheFile(JSON.parse(raw) as unknown);
      } catch {
        return emptyCache;
      }
    },
    write: async (cache) => {
      if (typeof window === "undefined") return;
      window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(cache));
    },
    clear: async () => {
      if (typeof window === "undefined") return;
      window.localStorage.removeItem(LOCAL_STORAGE_KEY);
    },
  };
}

function normalizeCacheFile(value: unknown): AnalysisCacheFile {
  if (!isObject(value)) return emptyCache;
  if (value.schemaVersion !== ANALYSIS_CACHE_SCHEMA_VERSION) return emptyCache;
  if (!Array.isArray(value.snapshots)) return emptyCache;

  return {
    schemaVersion: ANALYSIS_CACHE_SCHEMA_VERSION,
    snapshots: value.snapshots.filter(isAnalysisCacheSnapshot),
  };
}

function isAnalysisCacheSnapshot(value: unknown): value is AnalysisCacheSnapshot {
  if (!isObject(value)) return false;
  return (
    value.schemaVersion === ANALYSIS_CACHE_SCHEMA_VERSION &&
    typeof value.username === "string" &&
    Array.isArray(value.repositories) &&
    isObject(value.readmes) &&
    isObject(value.trees) &&
    Array.isArray(value.analyses) &&
    typeof value.fetchedAt === "string" &&
    typeof value.savedAt === "string"
  );
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isTauriRuntime(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}
