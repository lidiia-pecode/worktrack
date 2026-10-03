import { PlannedVsActualReport, PlannedVsActualRow } from "@/types";
import { formatSignedDuration } from "@/lib/utils/date";
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
  <Table className="min-w-xl">
    <TableHeader>
      <TableHead>Person</TableHead>
      <TableHead numeric className="w-32">
        Planned
      </TableHead>
      <TableHead numeric className="w-32">
        Logged
      </TableHead>
      <TableHead numeric className="w-32">
        Difference
      </TableHead>
    </TableHeader>

    <TableBody>
      {rows.map((row) => (
        <TableRow key={row.userId}>
          <TableRowHeader detail={row.position}>{row.name}</TableRowHeader>

          <TableCell numeric>
            <Minutes value={row.plannedMinutes} />
          </TableCell>
          <TableCell numeric>
            <Minutes value={row.loggedMinutes} strong />
          </TableCell>
          <TableCell numeric>
            <Difference {...row} />
          </TableCell>
        </TableRow>
      ))}
    </TableBody>

    <TableFooter>
      <TableRowHeader className="font-semibold">Total</TableRowHeader>
      <TableCell numeric className="font-semibold">
        <Minutes value={totals.plannedMinutes} strong />
      </TableCell>
      <TableCell numeric className="font-semibold">
        <Minutes value={totals.loggedMinutes} strong />
      </TableCell>
      <TableCell numeric>
        <Difference {...totals} />
      </TableCell>
    </TableFooter>
  </Table>
);
