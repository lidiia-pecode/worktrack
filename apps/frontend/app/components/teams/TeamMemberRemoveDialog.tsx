"use client";

import { useState } from "react";

import { useAuth } from "@/hooks/auth/useAuth";
import { useReportingPeriods } from "@/hooks/useReportingPeriods";
import { useTeamDetails, useTeamMembers } from "@/hooks/useTeams";
import { useWorkSettings } from "@/hooks/useWorkSettings";
import { laterISODate, todayISODate } from "@/lib/utils/date";
import { firstDayAfterLockedMonths } from "@/lib/utils/reporting-period";
import { UserRole } from "@/types/enums";

import { ImpactDialog } from "../shared/ImpactDialog";
import { DatePicker } from "../shared/inputs";
import { changeDayWords, removalCopy } from "./team-member-changes";
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
 * Removes someone from a team, from the team's panel or the person's: it says
 * whether the team is left without a manager and that the viewer stops seeing
 * what they record next. The owner may date it back; a manager removes from
 * today.
 */
export const TeamMemberRemoveDialog = ({
  removal,
  onClose,
}: TeamMemberRemoveDialogProps) => {
  const { user: viewer } = useAuth();
  const team = useTeamDetails(removal?.teamId ?? null);
  const { removeMember } = useTeamMembers(removal?.teamId ?? "");
  const { timezone } = useWorkSettings();
  const { months } = useReportingPeriods();
  const today = todayISODate(timezone);
  const isOwner = viewer?.role === UserRole.OWNER;
  // Unset until picked, so the default is today when the dialog is used.
  const [pickedDate, setPickedDate] = useState<string | null>(null);
  const date = pickedDate ?? today;

  const membership =
    team.data &&
    currentMemberships(team.data).find(
      ({ userId }) => userId === removal?.userId,
    );
  const copy =
    team.data &&
    membership &&
    removalCopy(membership, team.data, {
      isOwner,
      day: changeDayWords(date, today),
    });

  const close = () => {
    setPickedDate(null);
    onClose();
  };

  return (
    <ImpactDialog
      isOpen={Boolean(removal)}
      title={copy ? copy.title : "Remove from the team?"}
      description={
        team.isError
          ? "Could not load the team. Close this and try again."
          : (copy?.description ?? "Loading the team...")
      }
      choice={
        isOwner && (
          <DatePicker
            label="Leaves the team on"
            value={date}
            onChange={setPickedDate}
            // In an open month, and not before they joined the team.
            minDate={laterISODate(
              firstDayAfterLockedMonths(months),
              membership?.joinedAt ?? null,
            )}
            maxDate={today}
          />
        )
      }
      confirmText="Remove"
      confirmVariant={copy?.confirmVariant ?? "warning"}
      onConfirm={() =>
        membership &&
        removeMember.mutate(
          { membershipId: membership.id, date: isOwner ? date : undefined },
          { onSuccess: close },
        )
      }
      onClose={close}
      loading={removeMember.isPending}
      confirmDisabled={!copy}
    />
  );
};
