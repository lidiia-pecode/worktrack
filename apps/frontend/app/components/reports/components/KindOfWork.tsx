import { cn } from "@/lib/utils/cn";
import { formatDuration } from "@/lib/utils/date";
import { CategoryShare } from "@/lib/utils/report-charts";

import { Card } from "@/components/ui/card";

// Whole class names, so Tailwind finds them; null is the grey of "Other" and "No category".
const FILLS: Record<number, string> = {
  1: "bg-category-1",
  2: "bg-category-2",
  3: "bg-category-3",
  4: "bg-category-4",
  5: "bg-category-5",
  6: "bg-category-6",
};

const fillOf = (slot: number | null) =>
  slot === null ? "bg-category-other" : FILLS[slot];

/** Logged time by activity category: one bar of shares, and each category named with its hours. */
export const KindOfWork = ({ shares }: { shares: CategoryShare[] }) => (
  <Card as="section" aria-labelledby="report-kind" className="p-5">
    <h2 id="report-kind" className="text-base font-semibold">
      Kind of work
    </h2>
    <p className="mt-0.5 text-sm text-muted-foreground">
      Logged time by activity category
    </p>

    {shares.length === 0 ? (
      <p className="mt-4 text-sm text-muted-foreground">
        No time logged in this period.
      </p>
    ) : (
      <>
        <div
          role="img"
          aria-label={shares
            .map(({ name, share }) => `${name} ${share}%`)
            .join(", ")}
          className="mt-4 flex h-3 gap-[3px]"
        >
          {shares.map(({ name, minutes, slot }) => (
            <span
              key={slot ?? name}
              className={cn(
                "min-w-1 first:rounded-l-full last:rounded-r-full",
                fillOf(slot),
              )}
              style={{ flexGrow: minutes, flexBasis: 0 }}
            />
          ))}
        </div>

        <ul className="mt-3">
          {shares.map(({ name, minutes, share, slot }) => (
            <li
              key={slot ?? name}
              className="grid grid-cols-[0.75rem_minmax(0,1fr)_auto_2.5rem] items-center gap-3 border-t border-border/60 py-2.5 text-sm"
            >
              <span
                className={cn("size-2.5 rounded-sm", fillOf(slot))}
                aria-hidden
              />
              <span className="truncate">{name}</span>
              <span className="font-medium tabular-nums">
                {formatDuration(minutes)}
              </span>
              <span className="text-right text-xs text-muted-foreground tabular-nums">
                {share}%
              </span>
            </li>
          ))}
        </ul>
      </>
    )}
  </Card>
);
