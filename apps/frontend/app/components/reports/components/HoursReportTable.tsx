import { HoursReportRow, HoursSplit } from "@/types";
import { HoursReportGroupBy } from "@/types/enums";
import { formatDuration } from "@/lib/utils/date";
import { cn } from "@/lib/utils/cn";

type HoursReportTableProps = {
  groupBy: HoursReportGroupBy;
  rows: HoursReportRow[];
  totals: HoursSplit;
};

const NAME_COLUMN_LABEL: Record<HoursReportGroupBy, string> = {
  [HoursReportGroupBy.CLIENT]: "Client",
  [HoursReportGroupBy.PROJECT]: "Project",
  [HoursReportGroupBy.ACTIVITY]: "Activity",
  [HoursReportGroupBy.PERSON]: "Person",
};

const SPLIT_COLUMNS: { key: keyof HoursSplit; label: string }[] = [
  { key: "billableMinutes", label: "Billable" },
  { key: "nonBillableMinutes", label: "Non-billable" },
  { key: "internalMinutes", label: "Internal" },
  { key: "totalMinutes", label: "Total" },
];

const HEADER_CELL_CLASS =
  "p-3 text-[10px] font-medium uppercase tracking-wider text-muted-foreground";

// Projects have no client when the work is internal, so say so rather than
// leaving the detail blank.
const describeRow = (groupBy: HoursReportGroupBy, row: HoursReportRow) => {
  if (groupBy === HoursReportGroupBy.CLIENT) {
    return { name: row.name ?? "Internal work", detail: null };
  }

  if (groupBy === HoursReportGroupBy.PROJECT) {
    return { name: row.name, detail: row.detail ?? "Internal" };
  }

  return { name: row.name, detail: row.detail };
};

const Minutes = ({ value, strong }: { value: number; strong?: boolean }) =>
  value > 0 ? (
    <span className={cn(strong && "font-semibold text-foreground")}>
      {formatDuration(value)}
    </span>
  ) : (
    <span className="text-muted-foreground/60">-</span>
  );

export const HoursReportTable = ({
  groupBy,
  rows,
  totals,
}: HoursReportTableProps) => (
  <div className="overflow-x-auto">
    <table className="w-full min-w-2xl border-collapse text-sm">
      <thead>
        <tr className="border-b border-border bg-muted/10">
          <th scope="col" className={cn(HEADER_CELL_CLASS, "text-left")}>
            {NAME_COLUMN_LABEL[groupBy]}
          </th>

          {SPLIT_COLUMNS.map((column) => (
            <th
              key={column.key}
              scope="col"
              className={cn(HEADER_CELL_CLASS, "w-32 text-right")}
            >
              {column.label}
            </th>
          ))}
        </tr>
      </thead>

      <tbody>
        {rows.map((row) => {
          const { name, detail } = describeRow(groupBy, row);

          return (
            <tr
              key={row.id ?? row.name ?? "internal"}
              className="border-b border-border last:border-b-0"
            >
              <th scope="row" className="p-3 text-left font-normal">
                <span className="block font-medium text-foreground">
                  {name}
                </span>

                {detail && (
                  <span className="block text-xs text-muted-foreground">
                    {detail}
                  </span>
                )}
              </th>

              {SPLIT_COLUMNS.map((column) => (
                <td key={column.key} className="p-3 text-right tabular-nums">
                  <Minutes
                    value={row[column.key]}
                    strong={column.key === "totalMinutes"}
                  />
                </td>
              ))}
            </tr>
          );
        })}
      </tbody>

      <tfoot>
        <tr className="border-t-2 border-border bg-muted/10">
          <th scope="row" className="p-3 text-left font-semibold">
            Total
          </th>

          {SPLIT_COLUMNS.map((column) => (
            <td
              key={column.key}
              className="p-3 text-right font-semibold tabular-nums"
            >
              <Minutes value={totals[column.key]} strong />
            </td>
          ))}
        </tr>
      </tfoot>
    </table>
  </div>
);
