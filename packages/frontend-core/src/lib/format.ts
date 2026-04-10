export function formatTimestamp(
  value?: number | null,
  options: {
    fallback?: string;
    locale?: string;
  } = {},
) {
  const { fallback = 'Not available', locale } = options;

  if (!value) {
    return fallback;
  }

  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
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
