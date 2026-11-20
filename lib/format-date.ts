/**
 * lib/format-date.ts
 *
 * Deterministic, SSR-safe date formatting utilities.
 * All functions use an explicit locale and timeZone so the output is
 * identical on the Node.js server and the browser, preventing React
 * hydration mismatches.
 */

const DATE_FMT = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

const DATETIME_FMT = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "UTC",
});

const DATETIME_IST_FMT = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Asia/Kolkata",
});

const DATE_IST_FMT = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  timeZone: "Asia/Kolkata",
});

function parse(value: string | null | undefined): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** e.g. "20 Nov 2026" (UTC) */
export function formatDate(value: string | null | undefined): string {
  const d = parse(value);
  return d ? DATE_FMT.format(d) : "—";
}

/** e.g. "20 Nov 2026, 04:15" (UTC) */
export function formatDateTime(value: string | null | undefined): string {
  const d = parse(value);
  return d ? DATETIME_FMT.format(d) : "—";
}

/** e.g. "20 Nov 2026, 09:45" (IST) – for IST-facing UI */
export function formatDateTimeIST(value: string | null | undefined): string {
  const d = parse(value);
  return d ? DATETIME_IST_FMT.format(d) : "—";
}

/** e.g. "20 Nov 2026" (IST) – for IST-facing UI */
export function formatDateIST(value: string | null | undefined): string {
  const d = parse(value);
  return d ? DATE_IST_FMT.format(d) : "—";
}
