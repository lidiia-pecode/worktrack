import { HoursReport, HoursReportRow } from "@/types";
import { HoursReportGroupBy } from "@/types/enums";
import { describeGap } from "@/lib/utils/report-table";

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

type HoursReportTableProps = {
  groupBy: HoursTableGrouping;
  rows: HoursReportRow[];
  totals: HoursReport["totals"];
  periodText: string;
};

export const HoursReportTable = ({
  groupBy,
  rows,
  totals,
  periodText,
}: HoursReportTableProps) => {
  const { one, many } = NAMES[groupBy];
  const hasPlan = totals.plannedMinutes !== null;

  return (
    <ReportTable
      className={hasPlan ? "min-w-3xl" : "min-w-xl"}
      label={`${one}s, ${periodText}`}
      name={{
        label: one,
        sortValue: (row) => describeRow(groupBy, row).name ?? "",
        render: (row) => describeRow(groupBy, row),
      }}
      columns={
        hasPlan ? [LOGGED, BILLABLE, ...PLAN_COLUMNS] : [LOGGED, BILLABLE]
      }
      rows={rows}
      rowKey={(row) => row.id ?? row.name ?? "internal"}
      totals={{
        label: `All ${many}`,
        detail: `${rows.length} ${rows.length === 1 ? one.toLowerCase() : many}`,
        row: { id: null, name: null, detail: null, ...totals },
      }}
    />
  );
};
