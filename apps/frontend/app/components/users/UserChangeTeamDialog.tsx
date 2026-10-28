"use client";

import { useState } from "react";
import { toast } from "sonner";

import { useTeamMembers, useTeamOptions } from "@/hooks/useTeams";
import { useWorkSettings } from "@/hooks/useWorkSettings";
import { getErrorMessage } from "@/lib/api";
import { todayISODate } from "@/lib/utils/date";
import { fullName } from "@/lib/utils/user";
import { UserDetails } from "@/types";
import { TeamRole } from "@/types/enums";

import { FormSelect } from "../shared/FormSelect";
import { ImpactDialog } from "../shared/ImpactDialog";

interface UserChangeTeamDialogProps {
  /** The dialog is open while this is set. */
  user: UserDetails | null;
  onClose: () => void;
}

/**
 * Moves a person to another team as its member, or puts someone without a
 * team on one. A person is a member of one team at a time, so the move ends
 * the old membership the day the new one starts.
 */
export const UserChangeTeamDialog = ({
  user,
  onClose,
}: UserChangeTeamDialogProps) => {
  const { timezone } = useWorkSettings();
  const { options, isLoading, isError } = useTeamOptions();
  const [chosenTeamId, setChosenTeamId] = useState<string | null>(null);

  const currentTeam =
    user?.teams.find((team) => team.roleInTeam === TeamRole.MEMBER) ?? null;
  const selectedTeamId = chosenTeamId ?? currentTeam?.id ?? "";
  const selectedTeam = options.find(
    (option) => option.value === selectedTeamId,
  );
  const changesTeam =
    Boolean(selectedTeam) && selectedTeamId !== currentTeam?.id;

  const { addMember } = useTeamMembers(selectedTeamId);
  const name = user ? fullName(user) : "";

  const close = () => {
    setChosenTeamId(null);
    onClose();
  };

  const confirm = () => {
    if (!user || !changesTeam) return;

    addMember.mutate(
      {
        userId: user.id,
        roleInTeam: TeamRole.MEMBER,
        joinedAt: todayISODate(timezone),
        leaveCurrentTeam: Boolean(currentTeam),
      },
      {
        onSuccess: close,
        onError: (error) => toast.error(getErrorMessage(error)),
      },
    );
  };

  const description = (() => {
    if (isError) return "Could not load the teams. Close this and try again.";
    if (!changesTeam) {
      return currentTeam
        ? `${name} is a member of ${currentTeam.name}. Choose the team they move to.`
        : `${name} is in no team, so only the owner sees them. Choose the team they join.`;
    }
    return currentTeam
      ? `${name} leaves ${currentTeam.name} today and joins ${selectedTeam!.label} as a member. Their time, absences and plans stay as they are.`
      : `${name} joins ${selectedTeam!.label} as a member today.`;
  })();

  return (
    <ImpactDialog
      isOpen={Boolean(user)}
      title={currentTeam ? `Change ${name}'s team` : `Add ${name} to a team`}
      description={description}
      choice={
        <FormSelect
          label="Team"
          value={selectedTeamId}
          options={options}
          placeholder="Choose a team"
          onValueChange={setChosenTeamId}
          disabled={isLoading || addMember.isPending}
        />
      }
      confirmText={currentTeam ? "Move" : "Add"}
      confirmVariant={currentTeam ? "warning" : "primary"}
      onConfirm={confirm}
      onClose={close}
      loading={addMember.isPending}
      confirmDisabled={!changesTeam}
    />
  );
};
