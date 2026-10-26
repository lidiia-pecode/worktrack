// A day that expects nothing is striped; time past a working day's figure
// sits on solid amber (`globals.css`, DAY STATES).
export const WEEKEND_PATTERN = "bg-stripes-weekend";

/** A weekend with time logged: all of it is extra. */
export const WEEKEND_EXTRA_PATTERN = "bg-stripes-extra";

export const ABSENCE_PATTERN = "bg-stripes-day-off";

export const EXCESS_FILL = "bg-excess";

export const DAY_COLUMN_CLASS =
  "relative h-full border-r border-border last:border-r-0 overflow-hidden transition-colors";
