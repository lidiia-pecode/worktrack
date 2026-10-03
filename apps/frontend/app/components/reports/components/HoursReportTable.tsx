import { HoursReportRow, HoursSplit } from "@/types";
import { HoursReportGroupBy } from "@/types/enums";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
  TableRowHeader,
} from "@/components/ui/table";

import { Minutes } from "./ReportCells";

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

export const HoursReportTable = ({
  groupBy,
  rows,
  totals,
}: HoursReportTableProps) => (
  <Table className="min-w-2xl">
    <TableHeader>
      <TableHead>{NAME_COLUMN_LABEL[groupBy]}</TableHead>

      {SPLIT_COLUMNS.map((column) => (
        <TableHead key={column.key} numeric className="w-32">
          {column.label}
        </TableHead>
      ))}
    </TableHeader>

    <TableBody>
      {rows.map((row) => {
        const { name, detail } = describeRow(groupBy, row);

        return (
          <TableRow key={row.id ?? row.name ?? "internal"}>
            <TableRowHeader detail={detail}>{name}</TableRowHeader>

            {SPLIT_COLUMNS.map((column) => (
              <TableCell key={column.key} numeric>
                <Minutes
                  value={row[column.key]}
                  strong={column.key === "totalMinutes"}
                />
              </TableCell>
            ))}
          </TableRow>
        );
      })}
    </TableBody>

    <TableFooter>
      <TableRowHeader className="font-semibold">Total</TableRowHeader>

      {SPLIT_COLUMNS.map((column) => (
        <TableCell key={column.key} numeric className="font-semibold">
          <Minutes value={totals[column.key]} strong />
        </TableCell>
      ))}
    </TableFooter>
  </Table>
);
