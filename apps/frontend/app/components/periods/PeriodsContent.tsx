"use client";

import { useState } from "react";

import { useCompany } from "@/hooks/auth/useCompany";
import {
  useReportingPeriodHistory,
  useReportingPeriodMutations,
} from "@/hooks/useReportingPeriods";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
} from "@/components/ui/table";
import { cn } from "@/lib/utils/cn";
import { formatMonthLabel } from "@/lib/utils/date";

import { ConfirmModal } from "../shared/ConfirmModal";
import { ErrorState } from "../shared/ErrorState";
import { LoadingState } from "../shared/LoadingState";
import {
  PeriodRow,
  ROW_EDGE_END,
  ROW_EDGE_START,
} from "./components/PeriodRow";

type PeriodAction = "reopen" | "close";

type Confirmation = { action: PeriodAction; month: string };

const CONFIRMATION: Record<
  PeriodAction,
  {
    title: (monthLabel: string) => string;
    message: string;
    confirmText: string;
    variant: "default" | "warning";
  }
> = {
  reopen: {
    title: (monthLabel) => `Reopen ${monthLabel}?`,
    message:
      "Time logs, absences, capacity changes and plans in this month become editable again for everyone who could edit them before. It stays open until you close it.",
    confirmText: "Reopen",
    variant: "warning",
  },
  close: {
    title: (monthLabel) => `Close ${monthLabel}?`,
    message:
      "Time logs, absences, capacity changes and plans in this month become read-only again. You can reopen it later.",
    confirmText: "Close month",
    variant: "default",
  },
};

const HEAD_CELL = "h-10 py-0";

export const PeriodsContent = () => {
  const { company } = useCompany();
  const {
    months,
    hasOlder,
    isLoading,
    isError,
    refetch,
    loadOlder,
    isLoadingOlder,
  } = useReportingPeriodHistory();
  const { reopen, close } = useReportingPeriodMutations();

  // The confirmation keeps its month while it fades out, so dismissing only
  // closes it.
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);

  if (isError) {
    return (
      <ErrorState
        description="We couldn't load the reporting periods."
        onRetry={refetch}
      />
    );
  }

  if (isLoading) {
    return (
      <LoadingState
        title="Loading periods"
        description="Fetching which months are open and which are locked."
      />
    );
  }

  const ask = (action: PeriodAction, month: string) => {
    setConfirmation({ action, month });
    setIsConfirming(true);
  };

  const dismiss = () => setIsConfirming(false);

  const confirm = () => {
    if (!confirmation) return;

    const mutation = confirmation.action === "reopen" ? reopen : close;
    mutation.mutate(confirmation.month, { onSettled: dismiss });
  };

  const copy = confirmation && CONFIRMATION[confirmation.action];

  return (
    <>
      <Card>
        <Table aria-label="Reporting periods" className="min-w-2xl table-fixed">
          <TableHeader>
            <TableHead className={cn(HEAD_CELL, ROW_EDGE_START)}>
              Month
            </TableHead>
            <TableHead className={cn(HEAD_CELL, "w-40")}>Status</TableHead>
            <TableHead className={cn(HEAD_CELL, "w-64")}>
              Last changed
            </TableHead>
            <TableHead className={cn(HEAD_CELL, "w-28", ROW_EDGE_END)}>
              <span className="sr-only">Actions</span>
            </TableHead>
          </TableHeader>

          <TableBody>
            {months.map((period) => (
              <PeriodRow
                key={period.month}
                period={period}
                timezone={company?.timezone}
                onReopen={(month) => ask("reopen", month)}
                onClose={(month) => ask("close", month)}
              />
            ))}
          </TableBody>
        </Table>
      </Card>

      {hasOlder && (
        <div className="mt-6 flex justify-center">
          <Button
            type="button"
            variant="outline"
            onClick={() => loadOlder()}
            isLoading={isLoadingOlder}
            className="min-w-28"
          >
            Show older
          </Button>
        </div>
      )}

      <ConfirmModal
        isOpen={isConfirming}
        title={
          confirmation && copy
            ? copy.title(formatMonthLabel(confirmation.month))
            : undefined
        }
        message={copy?.message}
        confirmText={copy?.confirmText}
        variant={copy?.variant}
        onConfirm={confirm}
        onClose={dismiss}
        loading={reopen.isPending || close.isPending}
      />
    </>
  );
};
