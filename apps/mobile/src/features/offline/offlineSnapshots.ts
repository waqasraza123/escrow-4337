import AsyncStorage from '@react-native-async-storage/async-storage';

export type OfflineSnapshotResource =
  | 'jobs'
  | 'project-room'
  | 'marketplace-job-reviews'
  | 'marketplace-talent'
  | 'marketplace-opportunities'
  | 'marketplace-analytics'
  | 'marketplace-applications'
  | 'marketplace-client-opportunities'
  | 'marketplace-notifications'
  | 'marketplace-profile'
  | 'marketplace-opportunity';

export type OfflineSnapshotEnvelope<TData> = {
  version: 1;
  cachedAt: number;
  data: TData;
};

export type OfflineSnapshotMetadata = {
  cacheKey: string;
  cachedAt: number | null;
  estimatedBytes: number;
  resource: string;
  resourceIds: string[];
  userId: string;
};

export type OfflineSnapshotSummary = {
  accountScopedCount: number;
  estimatedBytes: number;
  expiredCount: number;
  latestCachedAt: number | null;
  maxAgeMs: number;
  maxEntriesPerScope: number;
  publicCount: number;
  resourceCounts: Record<string, number>;
  totalCount: number;
};

const snapshotPrefix = 'escrow4337.offlineSnapshot.v1';
export const offlineSnapshotMaxAgeMs = 1000 * 60 * 60 * 24 * 7;
export const offlineSnapshotMaxEntriesPerScope = 80;

type ParsedSnapshotKey = {
  cacheKey: string;
  resource: string;
  resourceIds: string[];
  userId: string;
};

function buildStorageKey(cacheKey: string) {
  return `${snapshotPrefix}:${cacheKey}`;
}

function parseCacheKey(cacheKey: string): ParsedSnapshotKey | null {
  const [resource, userId, ...resourceIds] = cacheKey.split(':');

  if (!resource || !userId) {
    return null;
  }

  return {
    cacheKey,
    resource,
    resourceIds,
    userId,
  };
}

function parseStorageKey(storageKey: string): ParsedSnapshotKey | null {
  if (!storageKey.startsWith(`${snapshotPrefix}:`)) {
    return null;
  }

  const cacheKey = storageKey.slice(snapshotPrefix.length + 1);
  return parseCacheKey(cacheKey);
}

function isSnapshotEnvelope<TData>(value: unknown): value is OfflineSnapshotEnvelope<TData> {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Partial<OfflineSnapshotEnvelope<TData>>;
  return candidate.version === 1 && typeof candidate.cachedAt === 'number' && 'data' in candidate;
}

function parseSnapshot<TData>(raw: string | null): OfflineSnapshotEnvelope<TData> | null {
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    return isSnapshotEnvelope<TData>(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function createOfflineSnapshotCacheKey(
  resource: OfflineSnapshotResource,
  userId: string,
  ...resourceIds: string[]
) {
  return [resource, userId, ...resourceIds].join(':');
}

export async function readOfflineSnapshot<TData>(cacheKey: string) {
  return parseSnapshot<TData>(await AsyncStorage.getItem(buildStorageKey(cacheKey)));
}

export async function writeOfflineSnapshot<TData>(
  cacheKey: string,
  envelope: OfflineSnapshotEnvelope<TData>,
) {
  await AsyncStorage.setItem(buildStorageKey(cacheKey), JSON.stringify(envelope));

  const parsed = parseCacheKey(cacheKey);
  if (parsed) {
    void enforceOfflineSnapshotRetention({ userId: parsed.userId }).catch(() => undefined);
  }
}

export async function listOfflineSnapshotMetadata({
  userId,
}: { userId?: string } = {}): Promise<OfflineSnapshotMetadata[]> {
  const keys = await AsyncStorage.getAllKeys();
  const snapshotKeys = keys.filter((key) => {
    const parsed = parseStorageKey(key);
    if (!parsed) {
      return false;
    }

    return userId ? parsed.userId === userId : true;
  });

  if (!snapshotKeys.length) {
    return [];
  }

  const values = await AsyncStorage.multiGet(snapshotKeys);

  return values
    .map(([storageKey, raw]) => {
      const parsed = parseStorageKey(storageKey);
      if (!parsed) {
        return null;
      }

      return {
        cacheKey: parsed.cacheKey,
        cachedAt: parseSnapshot<unknown>(raw)?.cachedAt ?? null,
        estimatedBytes: raw?.length ?? 0,
        resource: parsed.resource,
        resourceIds: parsed.resourceIds,
        userId: parsed.userId,
      } satisfies OfflineSnapshotMetadata;
    })
    .filter((metadata): metadata is OfflineSnapshotMetadata => Boolean(metadata));
}

export async function getOfflineSnapshotSummary({
  maxAgeMs = offlineSnapshotMaxAgeMs,
  maxEntriesPerScope = offlineSnapshotMaxEntriesPerScope,
  userId,
}: {
  maxAgeMs?: number;
  maxEntriesPerScope?: number;
  userId?: string;
} = {}): Promise<OfflineSnapshotSummary> {
  const metadata = await listOfflineSnapshotMetadata();
  const now = Date.now();
  const latestCachedAt = metadata.reduce<number | null>((latest, snapshot) => {
    if (snapshot.cachedAt === null) {
      return latest;
    }

    return latest === null ? snapshot.cachedAt : Math.max(latest, snapshot.cachedAt);
  }, null);
  const resourceCounts = metadata.reduce<Record<string, number>>((counts, snapshot) => {
    counts[snapshot.resource] = (counts[snapshot.resource] ?? 0) + 1;
    return counts;
  }, {});

  return {
    accountScopedCount: userId
      ? metadata.filter((snapshot) => snapshot.userId === userId).length
      : 0,
    estimatedBytes: metadata.reduce((total, snapshot) => total + snapshot.estimatedBytes, 0),
    expiredCount: metadata.filter(
      (snapshot) =>
        snapshot.cachedAt === null || now - snapshot.cachedAt > Math.max(0, maxAgeMs),
    ).length,
    latestCachedAt,
    maxAgeMs,
    maxEntriesPerScope,
    publicCount: metadata.filter((snapshot) => snapshot.userId === 'public').length,
    resourceCounts,
    totalCount: metadata.length,
  };
}

export async function enforceOfflineSnapshotRetention({
  maxAgeMs = offlineSnapshotMaxAgeMs,
  maxEntriesPerScope = offlineSnapshotMaxEntriesPerScope,
  userId,
}: {
  maxAgeMs?: number;
  maxEntriesPerScope?: number;
  userId?: string;
} = {}) {
  const keys = await AsyncStorage.getAllKeys();
  const snapshotKeys = keys.filter((key) => {
    const parsed = parseStorageKey(key);
    if (!parsed) {
      return false;
    }

    return userId ? parsed.userId === userId : true;
  });

  if (!snapshotKeys.length) {
    return 0;
  }

  const now = Date.now();
  const values = await AsyncStorage.multiGet(snapshotKeys);
  const snapshots = values
    .map(([storageKey, raw]) => {
      const parsed = parseStorageKey(storageKey);
      const snapshot = parseSnapshot<unknown>(raw);

      if (!parsed) {
        return null;
      }

      return {
        cachedAt: snapshot?.cachedAt ?? null,
        storageKey,
      };
    })
    .filter(
      (snapshot): snapshot is { cachedAt: number | null; storageKey: string } =>
        Boolean(snapshot),
    );
  const expiredKeys = snapshots
    .filter(
      (snapshot) =>
        snapshot.cachedAt === null || now - snapshot.cachedAt > Math.max(0, maxAgeMs),
    )
    .map((snapshot) => snapshot.storageKey);
  const expiredKeySet = new Set(expiredKeys);
  const retained = snapshots
    .filter((snapshot) => snapshot.cachedAt !== null && !expiredKeySet.has(snapshot.storageKey))
    .sort((left, right) => (right.cachedAt ?? 0) - (left.cachedAt ?? 0));
  const overflowKeys = retained
    .slice(Math.max(0, maxEntriesPerScope))
    .map((snapshot) => snapshot.storageKey);
  const removalKeys = [...new Set([...expiredKeys, ...overflowKeys])];

  if (removalKeys.length) {
    await AsyncStorage.multiRemove(removalKeys);
  }

  return removalKeys.length;
}

export async function clearOfflineSnapshots({ userId }: { userId?: string } = {}) {
  const keys = await AsyncStorage.getAllKeys();
  const snapshotKeys = keys.filter((key) => {
    const parsed = parseStorageKey(key);
    if (!parsed) {
      return false;
    }

    return userId ? parsed.userId === userId : true;
  });

  if (snapshotKeys.length) {
    await AsyncStorage.multiRemove(snapshotKeys);
  }

  return snapshotKeys.length;
}
