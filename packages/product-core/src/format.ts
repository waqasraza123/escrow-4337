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
  value?: string | null,
  fallback = 'Pending',
  leading = 10,
  trailing = 6,
) {
  if (!value) {
    return fallback;
  }

  if (value.length <= leading + trailing + 3) {
    return value;
  }

  return `${value.slice(0, leading)}...${value.slice(-trailing)}`;
}

export function formatAmount(
  value?: string | number | null,
  options: {
    fallback?: string;
    currency?: string;
    locale?: string;
    maximumFractionDigits?: number;
  } = {},
) {
  const {
    fallback = 'Not funded',
    currency = 'USDC',
    locale,
    maximumFractionDigits = 2,
  } = options;

  if (value === null || value === undefined || value === '') {
    return fallback;
  }

  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return `${value} ${currency}`;
  }

  return `${new Intl.NumberFormat(locale, {
    maximumFractionDigits,
  }).format(numeric)} ${currency}`;
}

export function parseDateMs(value?: string | number | Date | null) {
  if (!value) {
    return null;
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }

  const timestamp = value instanceof Date ? value.getTime() : Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : null;
}

export function splitList(value: string, separator = ',') {
  return value
    .split(separator)
    .map((item) => item.trim())
    .filter(Boolean);
}
