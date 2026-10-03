import { ReactNode } from "react";

import { UtilisationFigures, UtilisationRow } from "@/types";
import { formatDuration } from "@/lib/utils/date";
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

import { Minutes, Percent } from "./ReportCells";

type UtilisationTableProps = {
  rows: UtilisationRow[];
  totals: UtilisationFigures;
};

const Figure = ({
  share,
  detail,
}: {
  share: number | null;
  detail?: string;
}) => (
  <>
    <Percent value={share} />
    {detail && share !== null && (
      <span className="block text-xs text-muted-foreground">{detail}</span>
    )}
  </>
);

// Each figure says what it is measured against, so a low number is read as a
// fact about the time, not a verdict on the person.
const FIGURE_COLUMNS: {
  label: string;
  against: string;
  render: (figures: UtilisationFigures) => ReactNode;
}[] = [
  {
    label: "Billable utilisation",
    against: "billable ÷ available",
    render: (f) => (
      <Figure
        share={f.billableUtilisation}
        detail={`${formatDuration(f.billableMinutes)} billable`}
      />
    ),
  },
  {
    label: "Client share",
    against: "client work ÷ logged",
    render: (f) => (
      <Figure
        share={f.clientShare}
        detail={`${formatDuration(f.clientMinutes)} client`}
      />
    ),
  },
  {
    label: "Non-billable client share",
    against: "unpaid client work ÷ client work",
    render: (f) => (
      <Figure
        share={f.nonBillableClientShare}
        detail={`${formatDuration(f.nonBillableClientMinutes)} unpaid`}
      />
    ),
  },
  {
    label: "Logging completeness",
    against: "logged ÷ expected",
    render: (f) => <Figure share={f.loggingCompleteness} />,
  },
];

const Available = ({ figures }: { figures: UtilisationFigures }) => (
  <>
    <Minutes value={figures.availableMinutes} />
    {figures.absenceMinutes > 0 && (
      <span className="block text-xs text-muted-foreground">
        {formatDuration(figures.absenceMinutes)} off
      </span>
    )}
  </>
);

const FigureCells = ({ figures }: { figures: UtilisationFigures }) => (
  <>
    <TableCell numeric>
      <Available figures={figures} />
    </TableCell>
    <TableCell numeric>
      <Minutes value={figures.loggedMinutes} strong />
    </TableCell>
    {FIGURE_COLUMNS.map((column) => (
      <TableCell key={column.label} numeric>
        {column.render(figures)}
      </TableCell>
    ))}
  </>
);

export const UtilisationTable = ({ rows, totals }: UtilisationTableProps) => (
  <Table className="min-w-4xl">
    <TableHeader>
      <TableHead>Person</TableHead>
      <TableHead numeric detail="finished days only" className="w-28">
        Available
      </TableHead>
      <TableHead numeric detail="finished days only" className="w-28">
        Logged
      </TableHead>
      {FIGURE_COLUMNS.map((column) => (
        <TableHead
          key={column.label}
          numeric
          detail={column.against}
          className="w-32"
        >
          {column.label}
        </TableHead>
      ))}
    </TableHeader>

    <TableBody>
      {rows.map((row) => (
        <TableRow key={row.userId}>
          <TableRowHeader detail={row.position}>{row.name}</TableRowHeader>
          <FigureCells figures={row} />
        </TableRow>
      ))}
    </TableBody>

    <TableFooter>
      <TableRowHeader className="font-semibold">Total</TableRowHeader>
      <FigureCells figures={totals} />
    </TableFooter>
  </Table>
);
