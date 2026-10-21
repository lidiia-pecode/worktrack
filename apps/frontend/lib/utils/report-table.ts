import { formatDuration } from "./date";

/** A gap smaller than this reads as on plan or as expected. */
export const ON_TARGET_TOLERANCE_MINUTES = 60;

/** A gap larger than this share of its reference gets a dot beside it. */
export const NOTABLE_GAP_SHARE = 0.1;

export type GapReference = "planned" | "expected";

export interface Gap {
  label: string;
  isNotable: boolean;
}

const ON_TARGET: Record<GapReference, string> = {
  planned: "On plan",
  expected: "As expected",
};

const NOTHING: Record<GapReference, string> = {
  planned: "Nothing planned",
  expected: "Nothing expected",
};

/**
 * Logged time against a plan or expected hours, in words. A gap is a fact,
 * never a verdict (D3), so the words say which way it goes and nothing more.
 */
export const describeGap = (
  loggedMinutes: number,
  referenceMinutes: number,
  reference: GapReference,
): Gap => {
  if (referenceMinutes === 0) {
    return { label: NOTHING[reference], isNotable: false };
  }

  const gap = loggedMinutes - referenceMinutes;
  if (Math.abs(gap) < ON_TARGET_TOLERANCE_MINUTES) {
    return { label: ON_TARGET[reference], isNotable: false };
  }

  const direction = gap > 0 ? "more" : "less";
  return {
    label: `${formatDuration(Math.abs(gap))} ${direction} than ${reference}`,
    isNotable: Math.abs(gap) / referenceMinutes > NOTABLE_GAP_SHARE,
  };
};

export type SortDirection = "asc" | "desc";

export interface SortState {
  column: string;
  direction: SortDirection;
}

/**
 * The sort after a click on a column: a new column starts with the largest
 * number or the first name, the same column turns around.
 */
export const nextSort = (
  current: SortState | null,
  column: string,
  isNumeric: boolean,
): SortState => {
  if (current?.column === column) {
    return {
      column,
      direction: current.direction === "asc" ? "desc" : "asc",
    };
  }

  return { column, direction: isNumeric ? "desc" : "asc" };
};

/** A sorted copy; equal values keep the order the server gave. */
export const sortRows = <T>(
  rows: T[],
  sortValue: (row: T) => number | string,
  direction: SortDirection,
): T[] => {
  const sign = direction === "asc" ? 1 : -1;

  return [...rows].sort((a, b) => {
    const left = sortValue(a);
    const right = sortValue(b);
    const order =
      typeof left === "number" && typeof right === "number"
        ? left - right
        : String(left).localeCompare(String(right));
    return order * sign;
  });
};
