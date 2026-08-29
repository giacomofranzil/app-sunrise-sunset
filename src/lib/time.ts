/**
 * Helpers for working with an arbitrary IANA time zone (the one belonging to the
 * selected location) rather than the browser's own zone.
 */

const DAY_MS = 86_400_000;

const offsetFormatterCache = new Map<string, Intl.DateTimeFormat>();

function offsetFormatter(timeZone: string): Intl.DateTimeFormat {
  let formatter = offsetFormatterCache.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    offsetFormatterCache.set(timeZone, formatter);
  }
  return formatter;
}

/** Milliseconds that the zone is ahead of UTC at the given instant. */
export function zoneOffsetMs(timeZone: string, instant: Date): number {
  const parts = offsetFormatter(timeZone).formatToParts(instant);
  const lookup = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value ?? "0");

  const asUtc = Date.UTC(
    lookup("year"),
    lookup("month") - 1,
    lookup("day"),
    lookup("hour"),
    lookup("minute"),
    lookup("second"),
  );
  return asUtc - Math.floor(instant.getTime() / 1000) * 1000;
}

/** `YYYY-MM-DD` for the given instant as seen in the zone. */
export function zoneDateKey(timeZone: string, instant: Date): string {
  const parts = offsetFormatter(timeZone).formatToParts(instant);
  const lookup = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";
  return `${lookup("year")}-${lookup("month")}-${lookup("day")}`;
}

/**
 * The UTC instant closest to 12:00 local time on `dateKey` in `timeZone`.
 *
 * Used as the reference point for solar calculations so events land on the
 * intended calendar date. The offset is resolved twice because the first guess
 * can fall on the wrong side of a DST transition.
 */
export function localNoonUtc(dateKey: string, timeZone: string): Date {
  const [year, month, day] = dateKey.split("-").map(Number);
  const naiveNoon = Date.UTC(year, month - 1, day, 12);
  const firstGuess = naiveNoon - zoneOffsetMs(timeZone, new Date(naiveNoon));
  const refined =
    naiveNoon - zoneOffsetMs(timeZone, new Date(firstGuess));
  return new Date(refined);
}

export function shiftDateKey(
  dateKey: string,
  days: number,
  timeZone: string,
): string {
  const shifted = new Date(localNoonUtc(dateKey, timeZone).getTime() + days * DAY_MS);
  return zoneDateKey(timeZone, shifted);
}

export function formatClock(
  instant: Date | null,
  timeZone: string,
  options: { seconds?: boolean } = {},
): string {
  if (!instant) return "—";
  return new Intl.DateTimeFormat(undefined, {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    ...(options.seconds ? { second: "2-digit" as const } : {}),
  }).format(instant);
}

export function formatLongDate(dateKey: string, timeZone: string): string {
  return new Intl.DateTimeFormat(undefined, {
    timeZone,
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(localNoonUtc(dateKey, timeZone));
}

export function formatDuration(ms: number | null): string {
  if (ms === null) return "—";
  const totalMinutes = Math.round(ms / 60_000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}h ${String(minutes).padStart(2, "0")}m`;
}

/** Signed minute difference, rendered as e.g. `+2m 14s`. */
export function formatSignedDuration(ms: number): string {
  const sign = ms < 0 ? "−" : "+";
  const totalSeconds = Math.round(Math.abs(ms) / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes === 0) return `${sign}${seconds}s`;
  return `${sign}${minutes}m ${String(seconds).padStart(2, "0")}s`;
}

export function zoneAbbreviation(timeZone: string, instant: Date): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    timeZoneName: "shortOffset",
  }).formatToParts(instant);
  return parts.find((part) => part.type === "timeZoneName")?.value ?? timeZone;
}
