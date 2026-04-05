const APP_LOCALE = "en-IN";

export function formatShortTime(value: string) {
  return new Date(value).toLocaleTimeString(APP_LOCALE, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatShortDate(value: string) {
  return new Date(value).toLocaleDateString(APP_LOCALE, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatDateTime(value: string) {
  return new Date(value).toLocaleString(APP_LOCALE, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatRelativeTime(value: string) {
  const then = new Date(value).getTime();
  const diffMs = then - Date.now();
  const diffMinutes = Math.round(diffMs / 60000);

  if (Math.abs(diffMinutes) < 1) return "just now";
  if (Math.abs(diffMinutes) < 60) return fromNow(diffMinutes, "minute");

  const diffHours = Math.round(diffMinutes / 60);
  if (Math.abs(diffHours) < 24) return fromNow(diffHours, "hour");

  const diffDays = Math.round(diffHours / 24);
  if (Math.abs(diffDays) < 7) return fromNow(diffDays, "day");

  return formatShortDate(value);
}

function fromNow(value: number, unit: Intl.RelativeTimeFormatUnit) {
  return new Intl.RelativeTimeFormat(APP_LOCALE, { numeric: "auto" }).format(value, unit);
}

export function normalizeExternalUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  if (trimmed.startsWith("@")) {
    return `https://instagram.com/${trimmed.slice(1)}`;
  }

  return `https://${trimmed}`;
}
