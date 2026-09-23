import { PlannedVsActualReport, PlannedVsActualRow } from "@/types";
import { formatSignedDuration } from "@/lib/utils/date";
import { cn } from "@/lib/utils/cn";

import { HEADER_CELL_CLASS, Minutes } from "./ReportCells";

type PlannedVsActualTableProps = {
  rows: PlannedVsActualRow[];
  totals: PlannedVsActualReport["totals"];
};

// Deliberately neutral: a plan is guidance, never a target (D3), so a
// difference is shown as a fact and not coloured as good or bad.
const Difference = ({
  plannedMinutes,
  loggedMinutes,
}: {
  plannedMinutes: number;
  loggedMinutes: number;
}) => (
  <span className="text-muted-foreground">
    {formatSignedDuration(loggedMinutes - plannedMinutes)}
  </span>
);

export const PlannedVsActualTable = ({
  rows,
  totals,
}: PlannedVsActualTableProps) => (
  <div className="overflow-x-auto">
    <table className="w-full min-w-xl border-collapse text-sm">
      <thead>
        <tr className="border-b border-border bg-muted/10">
          <th scope="col" className={cn(HEADER_CELL_CLASS, "text-left")}>
            Person
          </th>
          <th scope="col" className={cn(HEADER_CELL_CLASS, "w-32 text-right")}>
            Planned
          </th>
          <th scope="col" className={cn(HEADER_CELL_CLASS, "w-32 text-right")}>
            Logged
          </th>
          <th scope="col" className={cn(HEADER_CELL_CLASS, "w-32 text-right")}>
            Difference
          </th>
        </tr>
      </thead>

      <tbody>
        {rows.map((row) => (
          <tr
            key={row.userId}
            className="border-b border-border last:border-b-0"
          >
            <th scope="row" className="p-3 text-left font-normal">
              <span className="block font-medium text-foreground">
                {row.name}
              </span>

              {row.position && (
                <span className="block text-xs text-muted-foreground">
                  {row.position}
                </span>
              )}
            </th>

            <td className="p-3 text-right tabular-nums">
              <Minutes value={row.plannedMinutes} />
            </td>
            <td className="p-3 text-right tabular-nums">
              <Minutes value={row.loggedMinutes} strong />
            </td>
            <td className="p-3 text-right tabular-nums">
              <Difference {...row} />
            </td>
          </tr>
        ))}
      </tbody>

      <tfoot>
        <tr className="border-t-2 border-border bg-muted/10">
          <th scope="row" className="p-3 text-left font-semibold">
            Total
          </th>
          <td className="p-3 text-right font-semibold tabular-nums">
            <Minutes value={totals.plannedMinutes} strong />
          </td>
          <td className="p-3 text-right font-semibold tabular-nums">
            <Minutes value={totals.loggedMinutes} strong />
          </td>
          <td className="p-3 text-right tabular-nums">
            <Difference {...totals} />
          </td>
        </tr>
      </tfoot>
    </table>
  </div>
);
