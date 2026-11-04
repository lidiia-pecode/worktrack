import { formatDuration } from "@/lib/utils/date";

type WeekTotalProps = {
  /** "Logged" or "Planned": what the figure is of everyone shown. */
  label: string;
  minutes: number;
  /** What the figure is measured against; left out when nothing fits, as under a project filter. */
  ofMinutes?: number;
};

/** A week grid's total in the toolbar: "Logged 30h / 128h". */
export const WeekTotal = ({ label, minutes, ofMinutes }: WeekTotalProps) => (
  <div className="flex items-center gap-2 text-sm">
    <span>{label}</span>

    <span className="tabular-nums">
      <span className="font-medium text-foreground">
        {formatDuration(minutes)}
      </span>

      {ofMinutes !== undefined && (
        <span className="text-muted-foreground">
          {" "}
          / {formatDuration(ofMinutes)}
        </span>
      )}
    </span>
  </div>
);
