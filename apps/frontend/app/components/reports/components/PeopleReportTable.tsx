import { PeopleReport, PeopleReportRow } from "@/types";
import { describeGap } from "@/lib/utils/report-table";

import { BillableSplit, Days, GapLabel, Minutes } from "./ReportCells";
import { ReportColumn, ReportTable } from "./ReportTable";

// People are compared with what was expected of them, not with the plan: a
// plan is guidance (D3), expected hours are their capacity minus time off.
const COLUMNS: ReportColumn<PeopleReportRow>[] = [
  {
    key: "logged",
    label: "Logged",
    numeric: true,
    className: "w-28",
    sortValue: (row) => row.loggedMinutes,
    render: (row) => <Minutes value={row.loggedMinutes} strong />,
  },
  {
    key: "billable",
    label: "Billable",
    numeric: true,
    className: "w-48",
    sortValue: (row) => row.billableMinutes,
    render: (row) => (
      <BillableSplit
        billableMinutes={row.billableMinutes}
        totalMinutes={row.loggedMinutes}
      />
    ),
  },
  {
    key: "expected",
    label: "Expected",
    numeric: true,
    className: "w-28",
    sortValue: (row) => row.expectedMinutes,
    render: (row) => <Minutes value={row.expectedMinutes} />,
  },
  {
    key: "expected-gap",
    label: "Against expected",
    className: "w-56",
    sortValue: (row) => row.loggedMinutes - row.expectedMinutes,
    render: (row) => (
      <GapLabel
        gap={describeGap(row.loggedMinutes, row.expectedMinutes, "expected")}
      />
    ),
  },
  {
    key: "time-off",
    label: "Time off",
    numeric: true,
    className: "w-24",
    sortValue: (row) => row.timeOffDays,
    render: (row) => <Days value={row.timeOffDays} />,
  },
];

type PeopleReportTableProps = {
  rows: PeopleReportRow[];
  totals: PeopleReport["totals"];
  periodText: string;
};

export const PeopleReportTable = ({
  rows,
  totals,
  periodText,
}: PeopleReportTableProps) => (
  <ReportTable
    className="min-w-4xl"
    label={`People, ${periodText}`}
    name={{
      label: "Person",
      sortValue: (row) => row.name,
      render: (row) => ({ name: row.name, detail: row.position }),
    }}
    columns={COLUMNS}
    rows={rows}
    rowKey={(row) => row.userId}
    totals={{
      label: "Everyone",
      detail: `${rows.length} ${rows.length === 1 ? "person" : "people"}`,
      row: { userId: "", name: "", position: null, ...totals },
    }}
  />
);
