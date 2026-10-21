import { ReactNode } from "react";

type ReportRowProps = {
  name: string;
  detail?: string | null;
  /** A short note after the detail, such as days off. */
  note?: string;
  bar: ReactNode;
  figure: ReactNode;
  subFigure: ReactNode;
};

/**
 * One row of the Team or Projects card: the name, its bar and its figures.
 * On a phone the name sits above the bar and the figures.
 */
export const ReportRow = ({
  name,
  detail,
  note,
  bar,
  figure,
  subFigure,
}: ReportRowProps) => (
  <li className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 border-t border-border/60 py-3 sm:grid-cols-[minmax(10rem,1.2fr)_minmax(0,1fr)_8rem]">
    <div className="col-span-2 min-w-0 sm:col-span-1">
      <p className="truncate text-sm font-medium">{name}</p>
      {(detail || note) && (
        <p className="text-xs text-muted-foreground">
          {[detail, note].filter(Boolean).join(" · ")}
        </p>
      )}
    </div>
    <div className="min-w-0">{bar}</div>
    <div className="text-right tabular-nums">
      <p className="text-sm font-medium whitespace-nowrap">{figure}</p>
      <p className="text-xs whitespace-nowrap text-muted-foreground">
        {subFigure}
      </p>
    </div>
  </li>
);
