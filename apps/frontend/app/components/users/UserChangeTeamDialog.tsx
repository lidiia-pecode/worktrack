"use client";

import { useState } from "react";

import { useTeamMembers, useTeamOptions } from "@/hooks/useTeams";
import { useUserDetails } from "@/hooks/useUsers";
import { fullName } from "@/lib/utils/user";
import { UserTeam } from "@/types";
import { TeamRole } from "@/types/enums";

import { FormSelect } from "../shared/FormSelect";
import { ImpactDialog } from "../shared/ImpactDialog";

interface UserChangeTeamDialogProps {
  /** The dialog is open while this is set. */
  user: { id: string; firstName: string; lastName: string } | null;
  /** The team they are a member of, which a move leaves. */
  currentTeam: UserTeam | null;
  onClose: () => void;
}

/**
 * Moves a person to another team as its member, or puts someone without a
 * team on one. A person is a member of one team at a time, so the move ends
 * the old membership the day the new one starts.
 */
export const UserChangeTeamDialog = ({
  user,
  currentTeam,
  onClose,
}: UserChangeTeamDialogProps) => {
  const { options: teamOptions, isLoading, isError } = useTeamOptions();
  const details = useUserDetails(user?.id ?? "");
  const [selectedTeamId, setSelectedTeamId] = useState("");

  // Not a team they are already on, such as one a Manager leads.
  const teamsTheyAreOn = new Set(
    (details.data?.teams ?? []).map((team) => team.id),
  );
  const options = teamOptions.filter(
    (option) =>
      option.value !== currentTeam?.id && !teamsTheyAreOn.has(option.value),
  );
  const selectedTeam = options.find(
    (option) => option.value === selectedTeamId,
  );
  const changesTeam = Boolean(selectedTeam);

  const { addMember } = useTeamMembers(selectedTeamId);
  const name = user ? fullName(user) : "";

  const close = () => {
    setSelectedTeamId("");
    onClose();
  };

  const confirm = () => {
    if (!user || !changesTeam) return;

    addMember.mutate(
      {
        userId: user.id,
        roleInTeam: TeamRole.MEMBER,
        leaveCurrentTeam: Boolean(currentTeam),
      },
      { onSuccess: close },
    );
  };

  const description = (() => {
    if (isError || details.isError) {
      return "Could not load the teams. Close this and try again.";
    }
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
          onValueChange={setSelectedTeamId}
          disabled={isLoading || !details.data || addMember.isPending}
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
