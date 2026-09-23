"use client";

import { useMemo } from "react";

import { useReportingPeriods } from "@/hooks/useReportingPeriods";
import { formatMonthLabel } from "@/lib/utils/date";
import { HoursReportGroupBy } from "@/types/enums";

import { FilterBar } from "../../shared/FilterBar";
import { FormSelect } from "../../shared/FormSelect";
import { DateInput } from "../../shared/inputs";

export const CUSTOM_RANGE = "custom";

export type DateRange = { dateFrom: string; dateTo: string };

const GROUP_BY_OPTIONS = [
  { value: HoursReportGroupBy.CLIENT, label: "Client" },
  { value: HoursReportGroupBy.PROJECT, label: "Project" },
  { value: HoursReportGroupBy.ACTIVITY, label: "Activity" },
  { value: HoursReportGroupBy.PERSON, label: "Person" },
];

type ReportFiltersProps = {
  /** A YYYY-MM month key, or CUSTOM_RANGE. */
  period: string;
  customRange: DateRange;
  rangeError?: string;
  onPeriodChange: (period: string) => void;
  onCustomRangeChange: (range: DateRange) => void;
  groupBy: HoursReportGroupBy;
  onGroupByChange: (groupBy: HoursReportGroupBy) => void;
  /** Only the hours report is grouped. */
  showGroupBy: boolean;
};

export const ReportFilters = ({
  period,
  customRange,
  rangeError,
  onPeriodChange,
  onCustomRangeChange,
  groupBy,
  onGroupByChange,
  showGroupBy,
}: ReportFiltersProps) => {
  const { months } = useReportingPeriods();

  const periodOptions = useMemo(
    () => [
      ...months.map((month) => ({
        value: month.month,
        label: formatMonthLabel(month.month),
      })),
      { value: CUSTOM_RANGE, label: "Custom range" },
    ],
    [months],
  );

  return (
    <FilterBar className="px-3 py-3">
      <FormSelect
        label="Period"
        className="sm:w-56"
        value={period}
        options={periodOptions}
        onValueChange={onPeriodChange}
      />

      {period === CUSTOM_RANGE && (
        <>
          <DateInput
            label="From"
            className="sm:w-44"
            value={customRange.dateFrom}
            onChange={(event) =>
              onCustomRangeChange({
                ...customRange,
                dateFrom: event.target.value,
              })
            }
          />

          <DateInput
            label="To"
            className="sm:w-44"
            value={customRange.dateTo}
            error={rangeError}
            onChange={(event) =>
              onCustomRangeChange({
                ...customRange,
                dateTo: event.target.value,
              })
            }
          />
        </>
      )}

      {showGroupBy && (
        <FormSelect
          label="Group by"
          className="sm:w-44"
          value={groupBy}
          options={GROUP_BY_OPTIONS}
          onValueChange={(value) =>
            onGroupByChange(value as HoursReportGroupBy)
          }
        />
      )}
    </FilterBar>
  );
};
