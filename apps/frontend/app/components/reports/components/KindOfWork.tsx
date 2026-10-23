"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

import { HoursReportGroupBy } from "@/types/enums";
import { useActivityCategoriesAllPagesQuery } from "@/hooks/useActivityCategories";
import { useHoursReport } from "@/hooks/useHoursReport";
import { cn } from "@/lib/utils/cn";
import { formatDuration } from "@/lib/utils/date";
import {
  CategoryShare,
  kindOfWork,
  OTHER_CATEGORIES,
} from "@/lib/utils/report-charts";
import { DateRange } from "@/lib/utils/report-period";

import { ErrorState } from "../../shared/ErrorState";
import { LoadingState } from "../../shared/LoadingState";

// Whole class names, so Tailwind finds them; null is the grey of "Other" and "No category".
const FILLS: Record<number, string> = {
  1: "bg-category-1",
  2: "bg-category-2",
  3: "bg-category-3",
  4: "bg-category-4",
  5: "bg-category-5",
};

const fillOf = (slot: number | null) =>
  slot === null ? "bg-category-other" : FILLS[slot];

const ROW_CLASS =
  "grid grid-cols-[0.75rem_minmax(0,1fr)_auto_2.5rem] items-center gap-3 border-t border-border/60 py-2.5 text-sm";

const Figures = ({ minutes, share }: CategoryShare) => (
  <>
    <span className="font-medium tabular-nums">{formatDuration(minutes)}</span>
    <span className="text-right text-xs text-muted-foreground tabular-nums">
      {share}%
    </span>
  </>
);

/**
 * Logged time by activity category: one bar of shares and the five largest
 * named with their hours, the rest in an "Other" that opens. It loads only
 * when shown.
 */
export const KindOfWork = ({ range }: { range: DateRange }) => {
  const [isOtherOpen, setIsOtherOpen] = useState(false);
  const activities = useHoursReport({
    ...range,
    groupBy: HoursReportGroupBy.ACTIVITY,
  });
  const categories = useActivityCategoriesAllPagesQuery();

  if (activities.isLoading || categories.isLoading) {
    return <LoadingState size="compact" title="Loading the kind of work…" />;
  }
  if (activities.isError || categories.isError || !activities.report) {
    return (
      <ErrorState
        size="compact"
        title="We couldn't load the kind of work"
        onRetry={() => {
          void activities.refetch();
          void categories.refetch();
        }}
      />
    );
  }

  const shares = kindOfWork(
    activities.report.rows,
    categories.items.map((category) => category.name),
  );

  if (shares.length === 0) {
    return (
      <p className="mt-4 text-sm text-muted-foreground">
        No time logged this month.
      </p>
    );
  }

  return (
    <div
      aria-busy={activities.isPlaceholderData}
      className={cn(
        activities.isPlaceholderData && "opacity-60 transition-opacity",
      )}
    >
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
        {shares.map((category) =>
          category.name === OTHER_CATEGORIES && category.includes ? (
            <li key={category.name}>
              <div className={ROW_CLASS}>
                <span
                  className={cn("size-2.5 rounded-full", fillOf(null))}
                  aria-hidden
                />
                <button
                  type="button"
                  aria-expanded={isOtherOpen}
                  onClick={() => setIsOtherOpen(!isOtherOpen)}
                  className="flex min-w-0 items-center gap-1.5 rounded-sm text-left focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                >
                  Other
                  <span className="text-xs text-muted-foreground">
                    {category.includes.length} categories
                  </span>
                  <ChevronDown
                    className={cn(
                      "size-3.5 shrink-0 transition-transform",
                      isOtherOpen && "rotate-180",
                    )}
                    aria-hidden
                  />
                </button>
                <Figures {...category} />
              </div>
              {isOtherOpen && (
                <ul className="pl-6">
                  {category.includes.map((inner) => (
                    <li key={inner.name} className={ROW_CLASS}>
                      <span />
                      <span className="truncate text-muted-foreground">
                        {inner.name}
                      </span>
                      <Figures {...inner} />
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ) : (
            <li key={category.slot ?? category.name} className={ROW_CLASS}>
              <span
                className={cn("size-2.5 rounded-full", fillOf(category.slot))}
                aria-hidden
              />
              <span className="truncate">{category.name}</span>
              <Figures {...category} />
            </li>
          ),
        )}
      </ul>
    </div>
  );
};
