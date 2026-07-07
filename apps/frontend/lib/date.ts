/**
 * Backend expects dates as plain "YYYY-MM-DD" strings (IsDateWithoutTimeString).
 * `new Date().toISOString()` uses UTC and can silently roll over to the wrong day
 * for users west of UTC in the evening — so we format from local time instead.
 */
export function toISODate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function todayISODate(): string {
  return toISODate(new Date());
}

export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export function formatLogDate(isoDate: string): string {
  const today = todayISODate();
  if (isoDate === today) return "Today";

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  if (isoDate === toISODate(yesterday)) return "Yesterday";

  const [year, month, day] = isoDate.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString(undefined, { day: "numeric", month: "short" });
}
