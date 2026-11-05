"use client";

import { useState } from "react";

import { useReportingPeriods } from "@/hooks/useReportingPeriods";
import { useTeamMembers, useTeamOptions } from "@/hooks/useTeams";
import { useUserDetails } from "@/hooks/useUsers";
import { useWorkSettings } from "@/hooks/useWorkSettings";
import {
  isoDateInTimeZone,
  laterISODate,
  todayISODate,
} from "@/lib/utils/date";
import { firstDayAfterLockedMonths } from "@/lib/utils/reporting-period";
import { fullName } from "@/lib/utils/user";
import { UserTeamMembership } from "@/types";
import { TeamRole } from "@/types/enums";

import { FormSelect } from "../shared/FormSelect";
import { ImpactDialog } from "../shared/ImpactDialog";
import { DatePicker } from "../shared/inputs";
import { changeDayWords } from "../teams/team-member-changes";

interface UserChangeTeamDialogProps {
  /** The dialog is open while this is set. */
  user: { id: string; firstName: string; lastName: string } | null;
  /** The team they are a member of, which a move leaves. */
  currentTeam: UserTeamMembership | null;
  onClose: () => void;
}

/**
 * Moves a person to another team as its member, or puts someone without a
 * team on one, from a day up to today. A person is a member of one team at a
 * time, so the move ends the old membership the day the new one starts.
 */
export const UserChangeTeamDialog = ({
  user,
  currentTeam,
  onClose,
}: UserChangeTeamDialogProps) => {
  const { options: teamOptions, isLoading, isError } = useTeamOptions();
  const details = useUserDetails(user?.id ?? "");
  const { timezone } = useWorkSettings();
  const { months } = useReportingPeriods();
  const today = todayISODate(timezone);
  const [selectedTeamId, setSelectedTeamId] = useState("");
  // Unset until picked, so the default is today when the dialog is used.
  const [pickedDate, setPickedDate] = useState<string | null>(null);
  const date = pickedDate ?? today;

  // In an open month, and not before they joined the company or the team they leave.
  const joinedCompanyOn = details.data
    ? isoDateInTimeZone(new Date(details.data.createdAt), timezone)
    : null;
  const earliestDay = laterISODate(
    laterISODate(firstDayAfterLockedMonths(months), joinedCompanyOn),
    currentTeam?.joinedAt ?? null,
  );
  const day = changeDayWords(date, today);

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
    setPickedDate(null);
    onClose();
  };

  const confirm = () => {
    if (!user || !changesTeam) return;

    addMember.mutate(
      {
        userId: user.id,
        roleInTeam: TeamRole.MEMBER,
        leaveCurrentTeam: Boolean(currentTeam),
        date,
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
      ? `${name} leaves ${currentTeam.name} and joins ${selectedTeam!.label} ${day.on}. Their time and absences ${day.before} stay with ${currentTeam.name}. ${day.from}, their time, absences and plans belong to ${selectedTeam!.label}.`
      : `${name} joins ${selectedTeam!.label} as a member ${day.on}.`;
  })();

  return (
    <ImpactDialog
      isOpen={Boolean(user)}
      title={currentTeam ? `Change ${name}'s team?` : `Add ${name} to a team?`}
      description={description}
      choice={
        <div className="grid gap-4">
          <FormSelect
            label="Team"
            value={selectedTeamId}
            options={options}
            placeholder="Choose a team"
            onValueChange={setSelectedTeamId}
            disabled={isLoading || !details.data || addMember.isPending}
          />
          <DatePicker
            label={currentTeam ? "Moves on" : "Joins on"}
            value={date}
            onChange={setPickedDate}
            minDate={earliestDay}
            maxDate={today}
          />
        </div>
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
