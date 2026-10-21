import { ReactNode } from "react";

type ReportRowProps = {
  name: string;
  detail?: string | null;
  /** A short note after the detail, such as days off. */
  note?: string;
  bar: ReactNode;
  figure: ReactNode;
  subFigure: ReactNode;
  /** Makes the name a button that opens the row's panel. */
  onOpen?: () => void;
};

/**
 * One row of the Team or Projects card or a panel: the name, its bar and its
 * figures. In a narrow list (an `@container`) the name sits above the bar and
 * the figures.
 */
export const ReportRow = ({
  name,
  detail,
  note,
  bar,
  figure,
  subFigure,
  onOpen,
}: ReportRowProps) => (
  <li className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 border-t border-border/60 py-3 @sm:grid-cols-[minmax(10rem,1.2fr)_minmax(0,1fr)_8rem]">
    <div className="col-span-2 min-w-0 @sm:col-span-1">
      {onOpen ? (
        <button
          type="button"
          onClick={onOpen}
          className="block max-w-full truncate rounded-sm text-left text-sm font-medium transition-colors hover:text-brand focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          {name}
        </button>
      ) : (
        <p className="truncate text-sm font-medium">{name}</p>
      )}
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
