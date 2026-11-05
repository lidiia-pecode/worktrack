"use client";

import { useState } from "react";

import { useReportingPeriods } from "@/hooks/useReportingPeriods";
import { useUserDetails, useUserStatusMutations } from "@/hooks/useUsers";
import { useWorkSettings } from "@/hooks/useWorkSettings";
import {
  formatDayMonthLabel,
  formatDayMonthYearLabel,
  laterISODate,
  shiftISODate,
  todayISODate,
} from "@/lib/utils/date";
import { firstDayAfterLockedMonths } from "@/lib/utils/reporting-period";
import { byCount } from "@/lib/utils/text";
import { fullName } from "@/lib/utils/user";
import { User } from "@/types";
import { ProjectStatus } from "@/types/enums";

import { linkedEntities } from "../entity-panel/EntityLink";
import { ImpactDialog } from "../shared/ImpactDialog";
import { DatePicker } from "../shared/inputs";

interface UserReactivateDialogProps {
  /** The dialog is open while this is set. */
  user: User | null;
  onClose: () => void;
}

/** The days between leaving and coming back, which stay closed. */
const missedDaysText = (lastWorkingDay: string, firstDayBack: string) => {
  const firstMissed = shiftISODate(lastWorkingDay, 1);
  const lastMissed = shiftISODate(firstDayBack, -1);

  if (firstMissed > lastMissed) {
    return "They're back the day after their last working day, so no days are missed.";
  }
  if (firstMissed === lastMissed) {
    return `Nothing is expected of them on ${formatDayMonthLabel(firstMissed)}.`;
  }
  return `Nothing is expected of them from ${formatDayMonthLabel(firstMissed)} to ${formatDayMonthLabel(lastMissed)}.`;
};

/** Reactivating someone from their first day back; the dialog names what they come back to. */
export const UserReactivateDialog = ({
  user,
  onClose,
}: UserReactivateDialogProps) => {
  const { reactivate } = useUserStatusMutations();
  const details = useUserDetails(user?.id ?? "");
  const { timezone } = useWorkSettings();
  const { months } = useReportingPeriods();
  const today = todayISODate(timezone);
  // Unset until picked, so the default is today when the dialog is used.
  const [pickedDay, setPickedDay] = useState<string | null>(null);
  const firstDayBack = pickedDay ?? today;

  const lastWorkingDay = user?.lastWorkingDay ?? null;
  // The first day back comes after the last working day, so not before tomorrow.
  const leftToday = lastWorkingDay === today;
  // After their last working day, and in an open month.
  const firstOpenDay = firstDayAfterLockedMonths(months);
  const dayAfterLeaving = lastWorkingDay
    ? shiftISODate(lastWorkingDay, 1)
    : null;
  const earliestDay = laterISODate(dayAfterLeaving, firstOpenDay);

  const teams = details.data?.teams ?? [];
  const activeProjects = (details.data?.projects ?? []).filter(
    (project) => project.status === ProjectStatus.ACTIVE,
  );

  const close = () => {
    setPickedDay(null);
    onClose();
  };

  const confirm = () => {
    if (!user) return;

    reactivate.mutate({ id: user.id, firstDayBack }, { onSuccess: close });
  };

  return (
    <ImpactDialog
      isOpen={Boolean(user)}
      title={user ? `Reactivate ${fullName(user)}?` : ""}
      description={
        details.isError
          ? "Could not check their teams and projects. Close this and try again."
          : "They'll be able to sign in again once reactivated."
      }
      affected={[
        {
          label: byCount(
            teams.length,
            "Back in their team",
            "Back in their teams",
          ),
          entities: linkedEntities("team", teams),
        },
        {
          label: "Back on their projects",
          entities: linkedEntities("project", activeProjects),
        },
      ]}
      blocker={
        leftToday &&
        `Their last working day is today, so they can be reactivated from tomorrow, ${formatDayMonthLabel(shiftISODate(today, 1))}.`
      }
      choice={
        <div className="grid gap-2">
          <DatePicker
            label="First day back"
            value={firstDayBack}
            onChange={setPickedDay}
            minDate={earliestDay}
            maxDate={today}
            description={
              lastWorkingDay
                ? `Last working day was ${formatDayMonthYearLabel(lastWorkingDay)}.`
                : undefined
            }
          />
          {lastWorkingDay && (
            <p className="text-sm text-muted-foreground">
              {missedDaysText(lastWorkingDay, firstDayBack)}
            </p>
          )}
        </div>
      }
      confirmText="Reactivate"
      confirmVariant="success"
      onConfirm={confirm}
      onClose={close}
      loading={reactivate.isPending}
      confirmDisabled={!details.data}
    />
  );
};
