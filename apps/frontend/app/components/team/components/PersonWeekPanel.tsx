"use client";

import { useId, useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { useAssignableActivities } from "@/hooks/useAssignableActivities";
import { usePlanningEntries } from "@/hooks/usePlanning";
import { useTimelogs } from "@/hooks/useTimelogs";
import { Absence, PlanningEntry, TeamSummaryRow, TimeLog } from "@/types";
import { formatDuration, isWeekend, toISODate } from "@/lib/utils/date";
import { fullName, isDeactivatedUser } from "@/lib/utils/user";
import { groupTimelogsByDate } from "@/lib/utils/timelog";

import { Avatar } from "../../shared/Avatar";
import { CloseButton } from "../../shared/buttons/CloseButton";
import { ErrorState } from "../../shared/ErrorState";
import { LoadingState } from "../../shared/LoadingState";
import { SidePanel } from "../../shared/SidePanel";
import { NonWorkDayConfirm } from "../../shared/week/NonWorkDayConfirm";
import { TimeLogFormModal } from "../../timesheet/components/TimeLogFormModal";
import { lastEntryChoiceKey } from "../../timesheet/helpers/last-entry-choice";
import { UserTimeDayGroup } from "./UserTimeDayGroup";

type FormState = {
  date: string;
  timelog?: TimeLog;
};

type PersonWeekPanelProps = {
  /** The grid row the panel explains: the person and their week's figures. */
  row: TeamSummaryRow;
  viewerId: string;
  weekDates: Date[];
  weekLabel: string;
  todayIso: string;
  canWrite: boolean;
  isLocked: (date: string) => boolean;
  isEditable: (date: string) => boolean;
  /** The grid's project filter, so the panel shows the same hours as the row. */
  projectId?: string;
  absencesByDate: Record<string, Absence>;
  onClose: () => void;
};

/**
 * One person's week beside the Team time grid: their entries day by day, with
 * absences and plans where nothing is logged. A deactivated person is shown
 * read-only, which the API enforces too.
 */
export const PersonWeekPanel = ({
  row,
  viewerId,
  weekDates,
  weekLabel,
  todayIso,
  canWrite,
  isLocked,
  isEditable,
  projectId,
  absencesByDate,
  onClose,
}: PersonWeekPanelProps) => {
  const { user } = row;
  const titleId = useId();
  const [formState, setFormState] = useState<FormState | null>(null);
  const [nonWorkDayDate, setNonWorkDayDate] = useState<Date | null>(null);

  const isDeactivated = isDeactivatedUser(user);
  const canEdit = canWrite && !isDeactivated;

  const dateFrom = toISODate(weekDates[0]);
  const dateTo = toISODate(weekDates[6]);

  const {
    items: timelogs,
    actions,
    isLoading: isLoadingLogs,
    isError: isLogsError,
    refetch: refetchLogs,
  } = useTimelogs({ userId: user.id, dateFrom, dateTo, projectId });

  // Only needed to fill the form, so a read-only panel does not ask for it.
  const {
    items: pickerItems,
    isLoading: isLoadingPicker,
    isError: isPickerError,
    refetch: refetchPicker,
  } = useAssignableActivities(user.id, canEdit);

  // Context for an empty day; a failed load leaves the days without it.
  const { items: plannedEntries } = usePlanningEntries({
    userId: user.id,
    dateFrom,
    dateTo,
  });

  const timelogsByDate = useMemo(
    () => groupTimelogsByDate(timelogs),
    [timelogs],
  );

  const plannedByDate = useMemo(() => {
    const byDate: Record<string, PlanningEntry[]> = {};

    plannedEntries.forEach((entry) => {
      (byDate[entry.date] ??= []).push(entry);
    });

    return byDate;
  }, [plannedEntries]);

  const totalMinutes = timelogs.reduce((sum, log) => sum + log.minutes, 0);

  const hasError = isLogsError || isPickerError;
  const isLoading = isLoadingLogs || isLoadingPicker;

  const retry = () => {
    void refetchLogs();
    void refetchPicker();
  };

  const openCreate = (date: Date) => {
    if (isWeekend(date)) {
      setNonWorkDayDate(date);
      return;
    }

    setFormState({ date: toISODate(date) });
  };

  const confirmNonWorkDay = () => {
    if (!nonWorkDayDate) return;

    setFormState({ date: toISODate(nonWorkDayDate) });
    setNonWorkDayDate(null);
  };

  const closeForm = () => setFormState(null);

  return (
    <SidePanel titleId={titleId} focusKey={user.id} onClose={onClose}>
      <div className="flex h-14 shrink-0 items-center gap-3 border-b border-border px-4">
        <Avatar user={user} size="md" />

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h2
              id={titleId}
              className="truncate text-sm font-semibold text-foreground"
            >
              {fullName(user)}
            </h2>

            {isDeactivated && (
              <Badge variant="neutral" size="sm">
                Deactivated
              </Badge>
            )}
          </div>

          <p className="truncate text-xs text-muted-foreground">
            {user.position ? `${user.position} · ${weekLabel}` : weekLabel}
          </p>
        </div>

        <CloseButton aria-label="Close panel" onClick={onClose} />
      </div>

      {!isLoading && !hasError && (
        <dl className="grid shrink-0 grid-cols-2 gap-3 border-b border-border bg-muted/10 px-4 py-3">
          <div>
            <dt className="text-2xs uppercase tracking-wider text-muted-foreground">
              {projectId ? "Logged on this project" : "Logged"}
            </dt>
            <dd className="text-base font-semibold tabular-nums text-foreground">
              {formatDuration(totalMinutes)}
            </dd>
          </div>

          {!projectId && (
            <div>
              <dt className="text-2xs uppercase tracking-wider text-muted-foreground">
                Expected
              </dt>
              <dd className="text-base font-semibold tabular-nums text-foreground">
                {formatDuration(row.expectedMinutes)}
              </dd>
            </div>
          )}
        </dl>
      )}

      <div className="flex-1 overflow-y-auto">
        {isLoading && (
          <LoadingState
            className="min-h-60"
            title="Loading entries"
            description={`Fetching what ${user.firstName} logged this week.`}
          />
        )}

        {!isLoading && hasError && (
          <ErrorState
            className="min-h-60"
            title="We couldn't load these entries"
            description="This person's week is unavailable right now."
            onRetry={retry}
          />
        )}

        {!isLoading &&
          !hasError &&
          weekDates.map((date) => {
            const iso = toISODate(date);
            const absence = absencesByDate[iso];
            const canWriteDay = canEdit && isEditable(iso);

            return (
              <UserTimeDayGroup
                key={iso}
                date={date}
                isToday={iso === todayIso}
                isLocked={isLocked(iso)}
                timelogs={timelogsByDate[iso] ?? []}
                absence={absence}
                plannedEntries={plannedByDate[iso]}
                onAdd={
                  canWriteDay && !absence ? () => openCreate(date) : undefined
                }
                onEdit={
                  canWriteDay
                    ? (timelog) => setFormState({ date: timelog.date, timelog })
                    : undefined
                }
              />
            );
          })}
      </div>

      {!isLoading && !hasError && (
        <div className="flex shrink-0 items-center justify-between gap-3 border-t border-border px-4 py-3 text-sm">
          <span className="text-muted-foreground">
            {projectId ? "Logged on this project" : "Logged this week"}
          </span>

          <span className="font-semibold tabular-nums text-foreground">
            {formatDuration(totalMinutes)}
          </span>
        </div>
      )}

      <NonWorkDayConfirm
        date={nonWorkDayDate}
        onClose={() => setNonWorkDayDate(null)}
        onConfirm={confirmNonWorkDay}
      />

      {formState && (
        <TimeLogFormModal
          open
          onClose={closeForm}
          date={formState.date}
          subjectName={fullName(user)}
          rememberKey={lastEntryChoiceKey(viewerId, user.id)}
          timelog={formState.timelog}
          pickerItems={pickerItems}
          onCreate={(payload) =>
            actions.create.mutateAsync({ ...payload, userId: user.id })
          }
          onUpdate={(id, data) => actions.update.mutateAsync({ id, data })}
          onDelete={(id) => actions.delete.mutateAsync(id)}
          isSaving={actions.create.isPending || actions.update.isPending}
          isDeleting={actions.delete.isPending}
        />
      )}
    </SidePanel>
  );
};
