import type { Trip } from "./types";

const DAY = 86_400_000;
/** Date-only reporting deliberately uses UTC calendar dates, never a local timezone. */
export function dateOnly(value: string): string {
  const candidate = value?.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(candidate ?? "")) return "";
  const epoch = Date.parse(`${candidate}T00:00:00Z`);
  return Number.isFinite(epoch) &&
    new Date(epoch).toISOString().slice(0, 10) === candidate
    ? candidate
    : "";
}
function day(value: string): number {
  const d = dateOnly(value);
  return d ? Date.parse(`${d}T00:00:00Z`) / DAY : NaN;
}
export function formatDate(value: string): string {
  const d = dateOnly(value);
  return d
    ? new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        timeZone: "UTC",
      }).format(new Date(`${d}T12:00:00Z`))
    : "Not recorded";
}
export function daysInclusive(start: string, end: string): number {
  const a = day(start),
    b = day(end);
  return Number.isFinite(a) && Number.isFinite(b) ? Math.max(0, b - a + 1) : 0;
}
/** Union of calendar days: overlapping legs and country-transition days count once. */
export function unionDays(intervals: { start: string; end: string }[]): number {
  const sorted = intervals
    .map((i) => [day(i.start), day(i.end)])
    .filter(([a, b]) => Number.isFinite(a) && Number.isFinite(b) && a <= b)
    .sort((a, b) => a[0] - b[0]);
  let total = 0,
    start = NaN,
    end = NaN;
  for (const [a, b] of sorted) {
    if (!Number.isFinite(start)) {
      start = a;
      end = b;
    } else if (a <= end + 1) end = Math.max(end, b);
    else {
      total += end - start + 1;
      start = a;
      end = b;
    }
  }
  return Number.isFinite(start) ? total + end - start + 1 : 0;
}
/** Actual physical presence only. Open legs end at clock; optional year clips YTD. */
export function actualDays(
  trips: Trip[],
  clock: string,
  year?: number,
): number {
  const today = dateOnly(clock);
  if (!today) return 0;
  const lower = year === undefined ? "0001-01-01" : `${year}-01-01`;
  const upper = year === undefined ? today : [`${year}-12-31`, today].sort()[0];
  return unionDays(
    trips
      .filter((t) => !t.cancelled && t.actualEntry)
      .map((t) => ({
        start: [dateOnly(t.actualEntry!), lower].sort().at(-1)!,
        end: [dateOnly(t.actualExit ?? today), today, upper].sort()[0],
      })),
  );
}
export function plannedDays(trips: Trip[]): number {
  return unionDays(
    trips
      .filter((t) => !t.cancelled)
      .map((t) => ({ start: t.plannedEntry, end: t.plannedExit })),
  );
}
export function returnStatus(
  trip: Trip,
  clock: string,
): "within" | "approaching" | "past" {
  if (trip.cancelled) return "within";
  const approved = day(trip.approvedReturn),
    reference = day(trip.actualExit ?? clock);
  if (!Number.isFinite(approved) || !Number.isFinite(reference))
    return "within";
  if (reference > approved) return "past";
  if (!trip.actualExit && approved - reference <= 3) return "approaching";
  return "within";
}
export function inWindow(value: string, clock: string, days: number): boolean {
  const delta = day(value) - day(clock);
  return Number.isFinite(delta) && delta >= 0 && delta <= days;
}
