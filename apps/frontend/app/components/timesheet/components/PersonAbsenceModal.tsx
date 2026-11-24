"use client";

import { Absence, User } from "@/types";
import { isAbsenceFrozen } from "@/lib/utils/reporting-period";
import { fullName } from "@/lib/utils/user";
import { useAbsencesMutations } from "@/hooks/useAbsences";

import { AbsenceFormModal } from "./AbsenceFormModal";
import {
  ABSENCE_IN_LOCKED_MONTH,
  LockedAbsenceModal,
  absenceInAnotherTeam,
} from "./LockedAbsenceModal";

type PersonAbsenceModalProps = {
  /** Whose absence it is; an owner or a manager records or opens it. */
  user: Pick<User, "id" | "firstName" | "lastName">;
  /** The day a new absence starts on. */
  date: string;
  absence?: Absence;
  /** Opened from a day: that day only, whole or in part. */
  isSingleDay?: boolean;
  isLocked: (date: string) => boolean;
  onClose: () => void;
};

/**
 * A person's absence as an owner or a manager meets it in a team grid: the
 * form, or the absence to read when a locked month or another team's days
 * keep it from changing.
 */
export const PersonAbsenceModal = ({
  user,
  date,
  absence,
  isSingleDay,
  isLocked,
  onClose,
}: PersonAbsenceModalProps) => {
  const actions = useAbsencesMutations();
  const subjectName = fullName(user);
  // Read only once both its ends are locked, as on the timesheet. Otherwise
  // the API says whether the viewer may change it: some of its days may be
  // another team's, which is the person's and the owner's to change.
  const readOnlyReason =
    absence && isAbsenceFrozen(isLocked, absence.startDate, absence.endDate)
      ? ABSENCE_IN_LOCKED_MONTH
      : absence?.canChange === false
        ? absenceInAnotherTeam(subjectName)
        : undefined;

  if (absence && readOnlyReason) {
    return (
      <LockedAbsenceModal
        absence={absence}
        reason={readOnlyReason}
        subjectName={subjectName}
        onClose={onClose}
      />
    );
  }

  return (
    <AbsenceFormModal
      open
      onClose={onClose}
      userId={user.id}
      subjectName={subjectName}
      date={date}
      isSingleDay={isSingleDay}
      absence={absence}
      isLocked={isLocked}
      onCreate={(payload) =>
        actions.create.mutateAsync({ ...payload, userId: user.id })
      }
      onUpdate={(id, data) => actions.update.mutateAsync({ id, data })}
      onDelete={(id) => actions.delete.mutateAsync(id)}
      isSaving={actions.create.isPending || actions.update.isPending}
      isDeleting={actions.delete.isPending}
    />
  );
};
