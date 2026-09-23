import { ReactNode } from "react";
import { Clock, FileBarChart } from "lucide-react";

import { EmptyState } from "../../shared/EmptyState";
import { ErrorState } from "../../shared/ErrorState";
import { LoadingState } from "../../shared/LoadingState";

type ReportSectionProps = {
  isLoading: boolean;
  isError: boolean;
  isEmpty: boolean;
  /** The previous range is still showing while the new one loads. */
  isPlaceholderData: boolean;
  isProvisional: boolean;
  emptyTitle: string;
  emptyDescription: string;
  onRetry: () => void;
  children: ReactNode;
};

/** The states every report shares, around the report's own table. */
export const ReportSection = ({
  isLoading,
  isError,
  isEmpty,
  isPlaceholderData,
  isProvisional,
  emptyTitle,
  emptyDescription,
  onRetry,
  children,
}: ReportSectionProps) => {
  if (isLoading) {
    return (
      <LoadingState
        title="Loading the report"
        description="Adding up the time for this range."
      />
    );
  }

  if (isError) {
    return (
      <ErrorState
        title="We couldn't load the report"
        description="The figures for this range are unavailable right now."
        onRetry={onRetry}
      />
    );
  }

  if (isEmpty) {
    return (
      <div className="p-6">
        <EmptyState
          title={emptyTitle}
          description={emptyDescription}
          icon={<FileBarChart />}
        />
      </div>
    );
  }

  return (
    <div
      className={isPlaceholderData ? "opacity-60 transition-opacity" : ""}
      aria-busy={isPlaceholderData}
    >
      {isProvisional && (
        <p className="flex items-center gap-1.5 px-3 py-3 text-xs text-muted-foreground">
          <Clock className="size-3.5 text-warning" aria-hidden />
          Provisional: some days in this range can still be edited, so these
          figures may change.
        </p>
      )}

      {children}
    </div>
  );
};
