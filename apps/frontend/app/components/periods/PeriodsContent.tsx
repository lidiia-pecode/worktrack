"use client";

import { useState } from "react";

import {
  useReportingPeriodHistory,
  useReportingPeriodMutations,
} from "@/hooks/useReportingPeriods";
import { Button } from "@/components/ui/button";
import { formatMonthLabel } from "@/lib/utils/date";

import { ConfirmModal } from "../shared/ConfirmModal";
import { ErrorState } from "../shared/ErrorState";
import { LoadingState } from "../shared/LoadingState";
import { PeriodRow } from "./components/PeriodRow";

export const PeriodsContent = () => {
  const { months, isLoading, isError, refetch, loadOlder, isLoadingOlder } =
    useReportingPeriodHistory();
  const { reopen, close } = useReportingPeriodMutations();
  const [monthToReopen, setMonthToReopen] = useState<string | null>(null);

  if (isLoading) {
    return (
      <LoadingState
        title="Loading periods"
        description="Fetching which months are open and which are locked."
      />
    );
  }

  if (isError) {
    return (
      <ErrorState
        description="We couldn't load the reporting periods."
        onRetry={refetch}
      />
    );
  }

  const confirmReopen = () => {
    if (!monthToReopen) return;

    reopen.mutate(monthToReopen, { onSettled: () => setMonthToReopen(null) });
  };

  return (
    <>
      <ul className="max-w-3xl divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        {months.map((period) => (
          <PeriodRow
            key={period.month}
            period={period}
            onReopen={setMonthToReopen}
            onClose={(month) => close.mutate(month)}
            isClosing={close.isPending && close.variables === period.month}
          />
        ))}
      </ul>

      <div className="mt-6 flex max-w-3xl justify-center">
        <Button
          type="button"
          variant="outline"
          onClick={() => loadOlder()}
          disabled={isLoadingOlder}
          className="min-w-28"
        >
          {isLoadingOlder ? "Loading..." : "Show older"}
        </Button>
      </div>

      <ConfirmModal
        isOpen={Boolean(monthToReopen)}
        title={
          monthToReopen ? `Reopen ${formatMonthLabel(monthToReopen)}?` : ""
        }
        message="Time logs, absences, capacity changes and plans in this month become editable again for everyone who could edit them before. It stays open until you close it."
        confirmText="Reopen"
        onConfirm={confirmReopen}
        onClose={() => setMonthToReopen(null)}
        loading={reopen.isPending}
      />
    </>
  );
};
