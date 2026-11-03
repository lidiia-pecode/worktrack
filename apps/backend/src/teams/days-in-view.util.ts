/** A run of days from `from`, up to the day before `until`; open when null. */
export interface DaySpan {
  from: string;
  until: string | null;
}

/**
 * Days a row holds that the viewer can't touch: outside the team the view is
 * about, or when the person wasn't employed.
 */
export interface ClosedSpell extends DaySpan {
  reason: 'outside-team' | 'inactive';
}

/** Where a row's days start or stop belonging to the view, as a move does. */
export interface TeamMove {
  date: string;
  direction: 'in' | 'out';
}

export interface DateRange {
  from: string;
  to: string;
}

export const isWithinSpan = ({ from, until }: DaySpan, date: string) =>
  date >= from && (until === null || date < until);

/** One span per unbroken run, so a move between two teams in view is no gap. */
const mergeSpans = (spans: DaySpan[]): DaySpan[] => {
  const merged: DaySpan[] = [];

  for (const span of [...spans].sort((a, b) => a.from.localeCompare(b.from))) {
    const last = merged.at(-1);
    if (last && (last.until === null || span.from <= last.until)) {
      if (
        last.until !== null &&
        (span.until === null || span.until > last.until)
      ) {
        last.until = span.until;
      }
      continue;
    }
    merged.push({ ...span });
  }

  return merged;
};

const dayAfter = (date: string): string => {
  const next = new Date(`${date}T00:00:00Z`);
  next.setUTCDate(next.getUTCDate() + 1);
  return next.toISOString().slice(0, 10);
};

/**
 * The days of the range outside the spans in view, as spans. `inView`
 * undefined means every day is in view.
 */
export const daysOutside = (
  range: DateRange,
  inView: DaySpan[] | undefined,
): DaySpan[] => {
  if (!inView) return [];

  const outside: DaySpan[] = [];
  let nextDay = range.from;

  for (const span of mergeSpans(inView)) {
    if (span.until !== null && span.until <= nextDay) continue;
    if (span.from > range.to) break;
    if (span.from > nextDay) outside.push({ from: nextDay, until: span.from });
    if (span.until === null) return outside;
    nextDay = span.until;
  }

  if (nextDay <= range.to)
    outside.push({ from: nextDay, until: dayAfter(range.to) });
  return outside;
};

/** A row's closed days in the range: outside the view first, then inactive. */
export const closedSpellsIn = (
  range: DateRange,
  inView: DaySpan[] | undefined,
  inactive: DaySpan[],
): ClosedSpell[] => [
  ...daysOutside(range, inView).map((span): ClosedSpell => ({
    ...span,
    reason: 'outside-team',
  })),
  ...inactive
    .filter(
      (spell) =>
        spell.from <= range.to &&
        (spell.until === null || spell.until > range.from),
    )
    .map((spell): ClosedSpell => ({ ...spell, reason: 'inactive' })),
];

/** Where the row's days start or stop being in view inside the range. */
export const movesIn = (
  range: DateRange,
  inView: DaySpan[] | undefined,
): TeamMove[] => {
  if (!inView) return [];

  return mergeSpans(inView).flatMap((span): TeamMove[] => [
    ...(span.from > range.from && span.from <= range.to
      ? [{ date: span.from, direction: 'in' as const }]
      : []),
    ...(span.until !== null && span.until > range.from && span.until <= range.to
      ? [{ date: span.until, direction: 'out' as const }]
      : []),
  ]);
};
