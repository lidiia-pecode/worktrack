import { ReactNode } from "react";

import { UtilisationFigures, UtilisationRow } from "@/types";
import { formatDuration } from "@/lib/utils/date";
import { cn } from "@/lib/utils/cn";

import { HEADER_CELL_CLASS, Minutes, Percent } from "./ReportCells";

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
    <td className="p-3 text-right tabular-nums">
      <Available figures={figures} />
    </td>
    <td className="p-3 text-right tabular-nums">
      <Minutes value={figures.loggedMinutes} strong />
    </td>
    {FIGURE_COLUMNS.map((column) => (
      <td key={column.label} className="p-3 text-right tabular-nums">
        {column.render(figures)}
      </td>
    ))}
  </>
);

export const UtilisationTable = ({ rows, totals }: UtilisationTableProps) => (
  <div className="overflow-x-auto">
    <table className="w-full min-w-4xl border-collapse text-sm">
      <thead>
        <tr className="border-b border-border bg-muted/10">
          <th scope="col" className={cn(HEADER_CELL_CLASS, "text-left")}>
            Person
          </th>
          <th scope="col" className={cn(HEADER_CELL_CLASS, "w-28 text-right")}>
            <span className="block">Available</span>
            <span className="block font-normal normal-case tracking-normal">
              finished days only
            </span>
          </th>
          <th scope="col" className={cn(HEADER_CELL_CLASS, "w-28 text-right")}>
            <span className="block">Logged</span>
            <span className="block font-normal normal-case tracking-normal">
              finished days only
            </span>
          </th>
          {FIGURE_COLUMNS.map((column) => (
            <th
              key={column.label}
              scope="col"
              className={cn(HEADER_CELL_CLASS, "w-32 text-right")}
            >
              <span className="block">{column.label}</span>
              <span className="block font-normal normal-case tracking-normal">
                {column.against}
              </span>
            </th>
          ))}
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
            <FigureCells figures={row} />
          </tr>
        ))}
      </tbody>

      <tfoot>
        <tr className="border-t-2 border-border bg-muted/10">
          <th scope="row" className="p-3 text-left font-semibold">
            Total
          </th>
          <FigureCells figures={totals} />
        </tr>
      </tfoot>
    </table>
  </div>
);
