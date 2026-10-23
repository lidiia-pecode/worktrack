import { ReactNode } from "react";

import { cn } from "@/lib/utils/cn";

// The name, the bar and the figures; in a narrow list (an `@container`) the
// name sits above the bar and the figures.
const COLUMNS =
  "grid grid-cols-[minmax(0,1fr)_10rem] gap-x-4 @sm:grid-cols-[minmax(8rem,1fr)_minmax(0,1.2fr)_10rem]";

type ReportRowProps = {
  name: string;
  detail?: string | null;
  /** A short note after the detail, such as days off. */
  note?: string;
  bar: ReactNode;
  figure: ReactNode;
  subFigure?: ReactNode;
  /** Marks the row as named in Needs attention, saying why on hover. */
  flag?: string;
  /** Makes the name a button that opens the row's panel. */
  onOpen?: () => void;
};

/** The one mark on Reports: somebody or something named in Needs attention. */
export const AttentionDot = ({ title }: { title: string }) => (
  <span
    className="inline-block size-2 shrink-0 rounded-full bg-warning"
    title={title}
    role="img"
    aria-label={title}
  />
);

/** One row of People, Projects or a panel: the name, its bar and its figures. */
export const ReportRow = ({
  name,
  detail,
  note,
  bar,
  figure,
  subFigure,
  flag,
  onOpen,
}: ReportRowProps) => (
  <li
    className={cn(
      COLUMNS,
      "items-center gap-y-2 border-t border-border/60 py-3",
    )}
  >
    <div className="col-span-2 min-w-0 @sm:col-span-1">
      <div className="flex items-center gap-2">
        {onOpen ? (
          <button
            type="button"
            onClick={onOpen}
            title={name}
            className="line-clamp-2 max-w-full rounded-sm text-left text-sm font-medium transition-colors hover:text-brand focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            {name}
          </button>
        ) : (
          <p title={name} className="line-clamp-2 text-sm font-medium">
            {name}
          </p>
        )}
        {flag && <AttentionDot title={flag} />}
      </div>
      {(detail || note) && (
        <p className="text-xs text-muted-foreground">
          {[detail, note].filter(Boolean).join(" · ")}
        </p>
      )}
    </div>
    <div className="min-w-0">{bar}</div>
    <div className="text-right tabular-nums">
      <p className="text-sm font-medium whitespace-nowrap">{figure}</p>
      {subFigure && (
        <p className="text-xs text-muted-foreground">{subFigure}</p>
      )}
    </div>
  </li>
);
