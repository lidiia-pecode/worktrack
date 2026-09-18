"use client";

import { useMemo, useState } from "react";

import { useAssignableActivities } from "@/hooks/useAssignableActivities";
import { useTimelogs } from "@/hooks/useTimelogs";
import { TeamSummaryUser, TimeLog } from "@/types";
import { formatDuration, toISODate } from "@/lib/utils/date";
import { fullName } from "@/lib/utils/user";

import { Avatar } from "../../shared/Avatar";
import { ErrorState } from "../../shared/ErrorState";
import { LoadingState } from "../../shared/LoadingState";
import { ResourceFormModal } from "../../shared/resourse/ResourceFormModal";
import { TimeLogFormModal } from "../../timesheet/components/TimeLogFormModal";
import { UserTimeDayGroup } from "./UserTimeDayGroup";

// Matches the timesheet: a week never comes close to it, so it never paginates.
const RANGE_PAGE_SIZE = 500;

type FormState = {
  date: string;
  timelog?: TimeLog;
};

type UserTimeDetailPanelProps = {
  user: TeamSummaryUser;
  weekDates: Date[];
  weekLabel: string;
  todayIso: string;
  canWrite: boolean;
  onClose: () => void;
};

/**
 * One person's entries for the week behind their row in the team grid. The
 * grid answers how much; this answers what the time went on, and lets an owner
 * or manager correct it.
 */
export const UserTimeDetailPanel = ({
  user,
  weekDates,
  weekLabel,
  todayIso,
  canWrite,
  onClose,
}: UserTimeDetailPanelProps) => {
  const [formState, setFormState] = useState<FormState | null>(null);

  const {
    items: timelogs,
    actions,
    isLoading: isLoadingLogs,
    isError: isLogsError,
    refetch: refetchLogs,
  } = useTimelogs(1, {
    userId: user.id,
    dateFrom: toISODate(weekDates[0]),
    dateTo: toISODate(weekDates[6]),
    pageSize: RANGE_PAGE_SIZE,
  });

  // Only needed to fill the form, so a read-only panel does not ask for it.
  const {
    items: pickerItems,
    isLoading: isLoadingPicker,
    isError: isPickerError,
    refetch: refetchPicker,
  } = useAssignableActivities(user.id, canWrite);

  const timelogsByDate = useMemo(() => {
    const map: Record<string, TimeLog[]> = {};

    timelogs.forEach((log) => {
      (map[log.date] ??= []).push(log);
    });

    return map;
  }, [timelogs]);

  const totalMinutes = timelogs.reduce((sum, log) => sum + log.minutes, 0);

  const hasError = isLogsError || isPickerError;
  const isLoading = isLoadingLogs || isLoadingPicker;

  const retry = () => {
    void refetchLogs();
    void refetchPicker();
  };

  const closeForm = () => setFormState(null);

  return (
    <>
      <ResourceFormModal
        open
        onClose={onClose}
        size="lg"
        bodyPadding={false}
        title={fullName(user)}
        description={
          user.position ? `${user.position} · ${weekLabel}` : weekLabel
        }
        icon={<Avatar user={user} size="md" className="ring-0" />}
        footer={
          !hasError &&
          !isLoading && (
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="text-muted-foreground">Logged this week</span>

              <span className="font-semibold tabular-nums text-foreground">
                {formatDuration(totalMinutes)}
              </span>
            </div>
          )
        }
      >
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

        {!isLoading && !hasError && (
          <div>
            {weekDates.map((date) => {
              const iso = toISODate(date);

              return (
                <UserTimeDayGroup
                  key={iso}
                  date={date}
                  isToday={iso === todayIso}
                  timelogs={timelogsByDate[iso] ?? []}
                  onAdd={
                    canWrite ? (day) => setFormState({ date: day }) : undefined
                  }
                  onEdit={
                    canWrite
                      ? (timelog) =>
                          setFormState({ date: timelog.date, timelog })
                      : undefined
                  }
                />
              );
            })}
          </div>
        )}
      </ResourceFormModal>

      {formState && (
        <TimeLogFormModal
          open
          onClose={closeForm}
          date={formState.date}
          subjectName={fullName(user)}
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
    </>
  );
};
