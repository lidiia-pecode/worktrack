"use client";

import { useState } from "react";
import { useQueries } from "@tanstack/react-query";

import { teamDetailsQuery } from "@/hooks/useTeams";
import {
  useDeactivationImpact,
  useUserDetails,
  useUserStatusMutations,
} from "@/hooks/useUsers";
import { useReportingPeriods } from "@/hooks/useReportingPeriods";
import { useWorkSettings } from "@/hooks/useWorkSettings";
import { ABSENCE_TYPE_LABELS } from "@/lib/utils/absence";
import {
  formatDayMonthLabel,
  formatDayMonthYearLabel,
  formatDayRangeLabel,
  formatDuration,
  isoDateInTimeZone,
  laterISODate,
  shiftISODate,
  todayISODate,
} from "@/lib/utils/date";
import { firstDayAfterLockedMonths } from "@/lib/utils/reporting-period";
import { countLabel } from "@/lib/utils/text";
import { fullName } from "@/lib/utils/user";
import { DeactivationImpact, User } from "@/types";
import { TeamRole } from "@/types/enums";
import { cn } from "@/lib/utils/cn";

import { linkedEntities } from "../entity-panel/EntityLink";
import { ErrorState } from "../shared/ErrorState";
import { ImpactDialog } from "../shared/ImpactDialog";
import { LoadingState } from "../shared/LoadingState";
import { DatePicker } from "../shared/inputs";
import { activeManagers } from "../teams/team-memberships";

/** Both lists share one label column, so their values line up. */
const DETAIL_LIST = "grid grid-cols-[6rem_1fr] gap-x-4 gap-y-1 text-sm";

interface UserDeactivateDialogProps {
  /** The dialog is open while this is set. */
  user: User | null;
  onClose: () => void;
}

/** Everything recorded after the last working day, which deactivating deletes. */
const DeletedAfter = ({
  impact,
  lastWorkingDay,
}: {
  impact: DeactivationImpact;
  lastWorkingDay: string;
}) => {
  const { time, absences, plans } = impact;

  if (time.entryCount === 0 && absences.length === 0 && plans.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Nothing is recorded after this day.
      </p>
    );
  }

  return (
    <div className="grid gap-3">
      <div>
        <p className="text-xs text-muted-foreground">
          Deleted after {formatDayMonthYearLabel(lastWorkingDay)}
        </p>
        <dl className={cn("mt-1", DETAIL_LIST)}>
          {time.firstDate && time.lastDate && (
            <>
              <dt className="text-foreground">Time:</dt>
              <dd>
                {formatDuration(time.minutes)} in{" "}
                {countLabel(time.entryCount, "entry", "entries")},{" "}
                <span className="whitespace-nowrap">
                  {formatDayRangeLabel(time.firstDate, time.lastDate)}
                </span>
              </dd>
            </>
          )}
          {absences.length > 0 && (
            <>
              <dt className="text-foreground">Absences:</dt>
              <dd className="grid gap-1">
                {absences.map((absence) => (
                  <span key={absence.id}>
                    {ABSENCE_TYPE_LABELS[absence.type]},{" "}
                    <span className="whitespace-nowrap">
                      {formatDayRangeLabel(absence.startDate, absence.endDate)}
                    </span>
                    {absence.isCut &&
                      `, shortened to end on ${formatDayMonthLabel(lastWorkingDay)}`}
                  </span>
                ))}
              </dd>
            </>
          )}
          {plans.length > 0 && (
            <>
              <dt className="text-foreground">Plans:</dt>
              <dd className="grid gap-1">
                {plans.map((plan) => (
                  <span key={plan.projectId}>
                    {plan.projectName}:{" "}
                    {countLabel(plan.planCount, "plan", "plans")},{" "}
                    <span className="whitespace-nowrap">
                      {formatDayRangeLabel(plan.firstDate, plan.lastDate)}
                    </span>
                  </span>
                ))}
              </dd>
            </>
          )}
        </dl>
      </div>

      <p className="rounded-lg bg-warning-subtle px-3 py-2 text-sm text-warning-text">
        This can&apos;t be undone. Reactivating this person won&apos;t restore
        any deleted items.
      </p>
    </div>
  );
};

/**
 * Deactivates someone after their last working day. The dialog names what is
 * deleted after it and the teams it leaves without an active manager.
 */
export const UserDeactivateDialog = ({
  user,
  onClose,
}: UserDeactivateDialogProps) => {
  const { deactivate } = useUserStatusMutations();
  const details = useUserDetails(user?.id ?? "");
  const { timezone } = useWorkSettings();
  const { months } = useReportingPeriods();
  const today = todayISODate(timezone);
  const [lastWorkingDay, setLastWorkingDay] = useState(today);
  const impact = useDeactivationImpact(user?.id ?? "", lastWorkingDay);

  // Not before they joined, and the day after it in an open month.
  const joinedOn = user
    ? isoDateInTimeZone(new Date(user.createdAt), timezone)
    : null;
  const firstOpenDay = firstDayAfterLockedMonths(months);
  const earliestDay = laterISODate(
    joinedOn,
    firstOpenDay ? shiftISODate(firstOpenDay, -1) : null,
  );

  const managedTeams = (details.data?.teams ?? []).filter(
    (team) => team.roleInTeam === TeamRole.MANAGER,
  );
  // A team keeps an active manager only if someone else also manages it.
  const managedTeamDetails = useQueries({
    queries: managedTeams.map((team) => teamDetailsQuery(team.id)),
  });
  const teamsLeftWithoutManager = managedTeams.filter((_, index) => {
    const team = managedTeamDetails[index]?.data;
    return team && activeManagers(team).every(({ id }) => id === user?.id);
  });

  const isReady =
    Boolean(details.data) &&
    managedTeamDetails.every((query) => query.data !== undefined) &&
    Boolean(impact.data);

  const close = () => {
    setLastWorkingDay(today);
    onClose();
  };

  const confirm = () => {
    if (!user) return;

    deactivate.mutate({ id: user.id, lastWorkingDay }, { onSuccess: close });
  };

  const deletedAfter = (() => {
    if (impact.isError) {
      return (
        <ErrorState
          size="compact"
          title="Could not check what is recorded after this day"
          onRetry={() => impact.refetch()}
        />
      );
    }
    if (!impact.data) return <LoadingState size="compact" />;

    return (
      <DeletedAfter impact={impact.data} lastWorkingDay={lastWorkingDay} />
    );
  })();

  return (
    <ImpactDialog
      isOpen={Boolean(user)}
      title={user ? `Deactivate ${fullName(user)}?` : ""}
      description={
        details.isError || managedTeamDetails.some((query) => query.isError)
          ? "Could not check which teams they manage. Close this and try again."
          : "They stay in their team and on their projects."
      }
      affected={[
        {
          label: "Left without an active manager",
          entities: linkedEntities("team", teamsLeftWithoutManager),
        },
      ]}
      choice={
        <div className="grid gap-4">
          <DatePicker
            label="Last working day"
            value={lastWorkingDay}
            onChange={setLastWorkingDay}
            minDate={earliestDay}
            maxDate={today}
          />
          <dl className={DETAIL_LIST}>
            <dt className="text-foreground">Signed out:</dt>
            <dd>Now, with no access from then on</dd>
            <dt className="text-foreground">Expected until:</dt>
            <dd>
              {formatDayMonthLabel(lastWorkingDay)}, which you or their manager
              can still complete
            </dd>
          </dl>
          {deletedAfter}
        </div>
      }
      confirmText="Deactivate"
      confirmVariant="warning"
      onConfirm={confirm}
      onClose={close}
      loading={deactivate.isPending}
      confirmDisabled={!isReady}
    />
  );
};
