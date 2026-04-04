export function readPositiveInteger(
  value: string | undefined,
  fallback: number,
) {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

export function readRequiredUrl(
  value: string | undefined,
  envName: string,
  fallback: string | null,
) {
  const candidate = value?.trim() || fallback;
  if (!candidate) {
    throw new Error(`${envName} must be set`);
  }

  try {
    return new URL(candidate).toString().replace(/\/+$/, '');
  } catch {
    throw new Error(`${envName} must be a valid URL`);
  }
}
