export function readStoredStringList(key: string) {
  if (typeof window === 'undefined') {
    return [] as string[];
  }

  const raw = window.localStorage.getItem(key);
  if (!raw) {
    return [] as string[];
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed)
      ? parsed.filter((value): value is string => typeof value === 'string')
      : [];
  } catch {
    return [];
  }
}

export function writeStoredStringList(key: string, values: string[]) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(key, JSON.stringify(values));
}

export function pushStoredStringList(
  values: string[],
  nextValue: string,
  limit = 6,
) {
  const normalized = nextValue.trim();
  if (!normalized) {
    return values;
  }

  return [normalized, ...values.filter((value) => value !== normalized)].slice(
    0,
    limit,
  );
}
