"use client";

import { useState } from "react";

import {
  useReportingPeriodMutations,
  useReportingPeriods,
} from "@/hooks/useReportingPeriods";
import { formatMonthLabel } from "@/lib/utils/date";

import { ConfirmModal } from "../shared/ConfirmModal";
import { ErrorState } from "../shared/ErrorState";
import { LoadingState } from "../shared/LoadingState";
import { PeriodRow } from "./components/PeriodRow";

export const PeriodsContent = () => {
  const { months, isLoading, isError, refetch } = useReportingPeriods();
  const { reopen, close } = useReportingPeriodMutations();
  const [reopening, setReopening] = useState<string | null>(null);

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
    if (!reopening) return;

    reopen.mutate(reopening, { onSettled: () => setReopening(null) });
  };

  return (
    <>
      <ul className="max-w-3xl divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        {months.map((period) => (
          <PeriodRow
            key={period.month}
            period={period}
            onReopen={setReopening}
            onClose={(month) => close.mutate(month)}
            isClosing={close.isPending && close.variables === period.month}
          />
        ))}
      </ul>

      <ConfirmModal
        isOpen={Boolean(reopening)}
        title={reopening ? `Reopen ${formatMonthLabel(reopening)}?` : ""}
        message="Time logs, absences, capacity changes and plans in this month become editable again for everyone who could edit them before. It stays open until you close it."
        confirmText="Reopen"
        onConfirm={confirmReopen}
        onClose={() => setReopening(null)}
        loading={reopen.isPending}
      />
    </>
  );
};
