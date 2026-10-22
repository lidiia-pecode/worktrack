import { HoursReportRow } from "@/types";
import { formatDuration } from "@/lib/utils/date";
import { describeAgainstPlan, HourScale } from "@/lib/utils/report-overview";

import { HourBar } from "./HourBar";
import { ReportRow } from "./ReportRow";

type AgainstPlanRowProps = {
  row: HoursReportRow;
  scale: HourScale;
  detail?: string | null;
  onOpen?: () => void;
};

/** Logged time against a plan, on the list's scale; no plan draws no ring. */
export const AgainstPlanRow = ({
  row,
  scale,
  detail,
  onOpen,
}: AgainstPlanRowProps) => {
  const name = row.name ?? "";
  const logged = formatDuration(row.totalMinutes);
  const againstPlan = describeAgainstPlan(row);

  return (
    <ReportRow
      name={name}
      onOpen={onOpen}
      detail={detail}
      bar={
        <HourBar
          scale={scale}
          logged={row.totalMinutes}
          planned={row.plannedMinutes}
          label={`${name}: ${logged} logged, ${againstPlan.replace(" · ", ", ")}`}
        />
      }
      figure={
        <>
          {logged}{" "}
          <span className="font-normal text-muted-foreground">logged</span>
        </>
      }
      subFigure={againstPlan}
    />
  );
};
