"use client";

import { useState } from "react";

import { useAuth } from "@/hooks/auth/useAuth";
import { useReportingPeriods } from "@/hooks/useReportingPeriods";
import { useTeamDetails, useTeamMembers } from "@/hooks/useTeams";
import { useUserDetails } from "@/hooks/useUsers";
import { useWorkSettings } from "@/hooks/useWorkSettings";
import { laterISODate, todayISODate } from "@/lib/utils/date";
import { firstDayAfterLockedMonths } from "@/lib/utils/reporting-period";
import { UserRole } from "@/types/enums";

import { ImpactDialog } from "../shared/ImpactDialog";
import { DatePicker } from "../shared/inputs";
import { changeDayWords, memberChangeCopy } from "./team-member-changes";
import { currentMemberships } from "./team-memberships";

export interface TeamRemoval {
  teamId: string;
  userId: string;
}

interface TeamMemberRemoveDialogProps {
  /** The dialog is open while this is set. */
  removal: TeamRemoval | null;
  onClose: () => void;
}

/**
 * Removes someone from a team from a day up to today, from the team's panel
 * or the person's: it says whether the team is left without a manager and
 * whether the viewer stops seeing them.
 */
export const TeamMemberRemoveDialog = ({
  removal,
  onClose,
}: TeamMemberRemoveDialogProps) => {
  const { user: viewer } = useAuth();
  const team = useTeamDetails(removal?.teamId ?? null);
  const person = useUserDetails(removal?.userId ?? "");
  const { removeMember } = useTeamMembers(removal?.teamId ?? "");
  const { timezone } = useWorkSettings();
  const { months } = useReportingPeriods();
  const today = todayISODate(timezone);
  const [date, setDate] = useState(today);

  const membership =
    team.data &&
    currentMemberships(team.data).find(
      ({ userId }) => userId === removal?.userId,
    );
  const copy =
    team.data &&
    membership &&
    person.data &&
    memberChangeCopy({ kind: "remove", membership }, team.data, {
      isOwner: viewer?.role === UserRole.OWNER,
      otherTeamsCount: person.data.teams.filter(
        ({ id }) => id !== removal?.teamId,
      ).length,
      day: changeDayWords(date, today),
    });

  const close = () => {
    setDate(today);
    onClose();
  };

  return (
    <ImpactDialog
      isOpen={Boolean(removal)}
      title={copy ? copy.title : "Remove from the team?"}
      description={
        team.isError || person.isError
          ? "Could not check their teams. Close this and try again."
          : (copy?.description ?? "Checking their teams...")
      }
      choice={
        <DatePicker
          label="Leaves the team on"
          value={date}
          onChange={setDate}
          // In an open month, and not before they joined the team.
          minDate={laterISODate(
            firstDayAfterLockedMonths(months),
            membership?.joinedAt ?? null,
          )}
          maxDate={today}
        />
      }
      confirmText="Remove"
      confirmVariant={copy?.confirmVariant ?? "warning"}
      onConfirm={() =>
        membership &&
        removeMember.mutate(
          { membershipId: membership.id, date },
          { onSuccess: close },
        )
      }
      onClose={close}
      loading={removeMember.isPending}
      confirmDisabled={!copy}
    />
  );
};
