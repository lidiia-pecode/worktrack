import { HoursReport, HoursReportQuery, HoursReportRow } from "@/types";
import { HoursReportGroupBy } from "@/types/enums";
import { useHoursReport } from "@/hooks/useHoursReport";
import { DateRange } from "@/lib/utils/report-period";
import { describeGap } from "@/lib/utils/report-table";

import { TableCell, TableRow, TableRowHeader } from "@/components/ui/table";

import { BillableSplit, GapLabel, Minutes } from "./ReportCells";
import { ReportColumn, ReportTable } from "./ReportTable";

/** The groupings a Reports tab shows; people have their own report. */
export type HoursTableGrouping =
  | HoursReportGroupBy.PROJECT
  | HoursReportGroupBy.CLIENT
  | HoursReportGroupBy.ACTIVITY;

const NAMES: Record<HoursTableGrouping, { one: string; many: string }> = {
  [HoursReportGroupBy.PROJECT]: { one: "Project", many: "projects" },
  [HoursReportGroupBy.CLIENT]: { one: "Client", many: "clients" },
  [HoursReportGroupBy.ACTIVITY]: { one: "Activity", many: "activities" },
};

// Projects have no client when the work is internal, so say so rather than
// leaving the detail blank.
const describeRow = (groupBy: HoursTableGrouping, row: HoursReportRow) => {
  if (groupBy === HoursReportGroupBy.CLIENT) {
    return { name: row.name ?? "Internal work" };
  }

  if (groupBy === HoursReportGroupBy.PROJECT) {
    return { name: row.name, detail: row.detail ?? "Internal" };
  }

  return { name: row.name, detail: row.detail };
};

const LOGGED: ReportColumn<HoursReportRow> = {
  key: "logged",
  label: "Logged",
  numeric: true,
  className: "w-28",
  sortValue: (row) => row.totalMinutes,
  render: (row) => <Minutes value={row.totalMinutes} strong />,
};

const BILLABLE: ReportColumn<HoursReportRow> = {
  key: "billable",
  label: "Billable",
  numeric: true,
  className: "w-48",
  sortValue: (row) => row.billableMinutes,
  render: (row) => (
    <BillableSplit
      billableMinutes={row.billableMinutes}
      totalMinutes={row.totalMinutes}
    />
  ),
};

// Only rows grouped by project or client carry a plan.
const PLAN_COLUMNS: ReportColumn<HoursReportRow>[] = [
  {
    key: "planned",
    label: "Planned",
    numeric: true,
    className: "w-28",
    sortValue: (row) => row.plannedMinutes ?? 0,
    render: (row) => <Minutes value={row.plannedMinutes ?? 0} />,
  },
  {
    key: "plan-gap",
    label: "Against plan",
    className: "w-52",
    sortValue: (row) => row.totalMinutes - (row.plannedMinutes ?? 0),
    render: (row) => (
      <GapLabel
        gap={describeGap(row.totalMinutes, row.plannedMinutes ?? 0, "planned")}
      />
    ),
  },
];

type PeopleFilter = Pick<
  HoursReportQuery,
  "projectId" | "client" | "withoutClient"
>;

/** The people behind a project or client row; activities don't open. */
const peopleFilterFor = (
  groupBy: HoursTableGrouping,
  row: HoursReportRow,
): PeopleFilter | null => {
  if (groupBy === HoursReportGroupBy.PROJECT) return { projectId: row.id! };
  if (groupBy === HoursReportGroupBy.CLIENT) {
    return row.name ? { client: row.name } : { withoutClient: true };
  }
  return null;
};

const PeopleRows = ({
  range,
  filter,
  columns,
}: {
  range: DateRange;
  filter: PeopleFilter;
  columns: ReportColumn<HoursReportRow>[];
}) => {
  const { report, isLoading, isError } = useHoursReport({
    ...range,
    groupBy: HoursReportGroupBy.PERSON,
    ...filter,
  });

  const note = isLoading
    ? "Loading the people…"
    : isError
      ? "We couldn't load the people for this row."
      : report?.rows.length === 0
        ? "Nobody logged or planned time here."
        : null;

  if (note || !report) {
    return (
      <TableRow className="bg-muted/5">
        <TableCell
          colSpan={columns.length + 1}
          className="pl-12 text-xs text-muted-foreground"
          role="status"
        >
          {note}
        </TableCell>
      </TableRow>
    );
  }

  return report.rows.map((person) => (
    <TableRow key={person.id} className="bg-muted/5">
      <TableRowHeader
        detail={person.detail}
        className="pl-12 text-sm font-normal"
      >
        {person.name}
      </TableRowHeader>
      {columns.map((column) => (
        <TableCell key={column.key} numeric={column.numeric}>
          {column.render(person)}
        </TableCell>
      ))}
    </TableRow>
  ));
};

type HoursReportTableProps = {
  groupBy: HoursTableGrouping;
  rows: HoursReportRow[];
  totals: HoursReport["totals"];
  /** The period the rows cover, for the people a row opens to. */
  range: DateRange;
  periodText: string;
};

export const HoursReportTable = ({
  groupBy,
  rows,
  totals,
  range,
  periodText,
}: HoursReportTableProps) => {
  const { one, many } = NAMES[groupBy];
  const hasPlan = totals.plannedMinutes !== null;
  const columns = hasPlan
    ? [LOGGED, BILLABLE, ...PLAN_COLUMNS]
    : [LOGGED, BILLABLE];

  return (
    <ReportTable
      className={hasPlan ? "min-w-3xl" : "min-w-xl"}
      label={`${one}s, ${periodText}`}
      name={{
        label: one,
        sortValue: (row) => describeRow(groupBy, row).name ?? "",
        render: (row) => describeRow(groupBy, row),
      }}
      columns={columns}
      rows={rows}
      rowKey={(row) => row.id ?? row.name ?? "internal"}
      totals={{
        label: `All ${many}`,
        detail: `${rows.length} ${rows.length === 1 ? one.toLowerCase() : many}`,
        row: { id: null, name: null, detail: null, ...totals },
      }}
      opening={
        groupBy === HoursReportGroupBy.ACTIVITY
          ? undefined
          : {
              describe: (row) =>
                `people on ${describeRow(groupBy, row).name ?? ""}`,
              renderRows: (row) => (
                <PeopleRows
                  range={range}
                  filter={peopleFilterFor(groupBy, row)!}
                  columns={columns}
                />
              ),
            }
      }
    />
  );
};
