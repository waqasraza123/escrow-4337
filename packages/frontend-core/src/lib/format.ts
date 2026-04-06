export function formatTimestamp(
  value?: number | null,
  fallback = 'Not available',
) {
  if (!value) {
    return fallback;
  }

  return new Date(value).toLocaleString();
}

export function previewHash(
  value?: string,
  fallback = 'Pending',
  leading = 10,
  trailing = 6,
) {
  if (!value) {
    return fallback;
  }

  return `${value.slice(0, leading)}...${value.slice(-trailing)}`;
}
