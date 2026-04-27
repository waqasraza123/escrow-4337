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

const snapshotPrefix = 'escrow4337.offlineSnapshot.v1';

function buildStorageKey(cacheKey: string) {
  return `${snapshotPrefix}:${cacheKey}`;
}

function parseStorageKey(storageKey: string) {
  if (!storageKey.startsWith(`${snapshotPrefix}:`)) {
    return null;
  }

  const cacheKey = storageKey.slice(snapshotPrefix.length + 1);
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
