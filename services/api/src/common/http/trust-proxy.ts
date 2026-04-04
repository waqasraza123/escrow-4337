export type TrustProxyValue = boolean | number | string;

export function readTrustProxyValue(
  value: string | undefined,
): TrustProxyValue | undefined {
  const candidate = value?.trim();
  if (!candidate) {
    return undefined;
  }

  if (candidate === 'true') {
    return true;
  }

  if (candidate === 'false') {
    return false;
  }

  const parsed = Number.parseInt(candidate, 10);
  if (Number.isInteger(parsed) && String(parsed) === candidate && parsed >= 0) {
    return parsed;
  }

  return candidate;
}
