import { formatDistanceToNow } from 'date-fns';

/**
 * API datetimes are stored in UTC. Backend sends ISO strings with a Z suffix.
 * Legacy rows without Z are treated as UTC, not local time.
 */
export function parseApiUtcDate(iso: string): Date {
  const raw = (iso ?? '').trim();
  if (!raw) return new Date(NaN);

  if (/[zZ]$/.test(raw) || /[+-]\d{2}:\d{2}$/.test(raw)) {
    return new Date(raw);
  }

  const normalized = raw.includes('T') ? raw : raw.replace(' ', 'T');
  return new Date(`${normalized}Z`);
}

/** Local date and time, e.g. "4 Jun 2026, 4:15 pm" */
export function formatDateTime(iso: string): string {
  const d = parseApiUtcDate(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(d);
}

/** Relative time, e.g. "5 minutes ago" */
export function formatRelativeTime(iso: string): string {
  const d = parseApiUtcDate(iso);
  if (Number.isNaN(d.getTime())) return '';
  return formatDistanceToNow(d, { addSuffix: true });
}

/** Date + relative for transaction lists */
export function formatTransactionWhen(iso: string): string {
  const absolute = formatDateTime(iso);
  const relative = formatRelativeTime(iso);
  if (!relative) return absolute;
  return `${absolute} · ${relative}`;
}
