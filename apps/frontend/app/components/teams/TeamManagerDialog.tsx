"use client";

import { ReactNode, useState } from "react";
import { ArrowRight } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Field } from "@/components/ui/field";
import { Switch } from "@/components/ui/switch";
import { useTeamMembers } from "@/hooks/useTeams";
import { useAssignableUsersAllPagesQuery } from "@/hooks/useUsers";
import { ROLE_LABELS } from "@/lib/constants/roles";
import { fullName, initials, isDeactivatedUser } from "@/lib/utils/user";
import { Team } from "@/types/Team";
import { AvatarUser } from "@/types/User";
import { PreviousManager, TeamRole, UserRole, UserStatus } from "@/types/enums";

import { Avatar } from "../shared/Avatar";
import { ImpactDialog } from "../shared/ImpactDialog";
import { EntityPicker } from "../shared/resource/EntityPicker";
import { currentMemberships, managerMembership } from "./team-memberships";

const MANAGERS_IN_NO_TEAM = "Managers in no team";

interface Candidate extends AvatarUser {
  id: string;
  role: UserRole;
  group: string;
}

/** One line of what the change does, such as "Liam Walker → manager". */
const ChangeLine = ({
  person,
  children,
}: {
  person: AvatarUser;
  children: ReactNode;
}) => (
  <li className="flex flex-wrap items-center gap-x-2 gap-y-1">
    <Avatar user={person} size="xs" className="ring-0" />
    <span className="font-medium">{fullName(person)}</span>
    <ArrowRight aria-hidden="true" className="size-3.5 text-muted-foreground" />
    {children}
  </li>
);

interface TeamManagerDialogProps {
  team: Team;
  isOpen: boolean;
  onClose: () => void;
}

/**
 * The one way a team gets its manager, from today: one of its members (an
 * Employee is made a Manager), or a Manager in no team. The current manager
 * stays as a member or leaves.
 */
export const TeamManagerDialog = ({
  team,
  isOpen,
  onClose,
}: TeamManagerDialogProps) => {
  const { changeManager } = useTeamMembers(team.id);
  const managersInNoTeam = useAssignableUsersAllPagesQuery(
    { roles: [UserRole.MANAGER], status: UserStatus.ACTIVE, noTeam: true },
    { enabled: isOpen },
  );
  const [pickedId, setPickedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [keepsCurrent, setKeepsCurrent] = useState(true);

  const current = managerMembership(team)?.user;
  const currentName = current && fullName(current);

  const candidates: Candidate[] = [
    ...currentMemberships(team)
      .filter(
        (membership) =>
          membership.roleInTeam === TeamRole.MEMBER &&
          !isDeactivatedUser(membership.user),
      )
      .map(({ user }) => ({ ...user, group: `In ${team.name}` })),
    ...managersInNoTeam.items.map((user) => ({
      ...user,
      group: MANAGERS_IN_NO_TEAM,
    })),
  ];
  const query = search.trim().toLowerCase();
  const shownCandidates = candidates.filter((candidate) =>
    fullName(candidate).toLowerCase().includes(query),
  );
  const picked = candidates.find((candidate) => candidate.id === pickedId);

  const close = () => {
    setPickedId(null);
    setSearch("");
    setKeepsCurrent(true);
    onClose();
  };

  const confirm = () => {
    if (!picked) return;

    changeManager.mutate(
      {
        userId: picked.id,
        previousManager: current
          ? keepsCurrent
            ? PreviousManager.STAYS_AS_MEMBER
            : PreviousManager.LEAVES
          : undefined,
      },
      { onSuccess: close },
    );
  };

  const description = (() => {
    if (managersInNoTeam.isError) {
      return "Could not load the Managers in no team. Close this and try again.";
    }
    if (!current) {
      return `${team.name} has no manager, so only you see its people's records.`;
    }
    return isDeactivatedUser(current)
      ? `${currentName}, its manager, is deactivated.`
      : `${currentName} leads ${team.name}.`;
  })();

  return (
    <ImpactDialog
      isOpen={isOpen}
      title={
        current
          ? `Change ${team.name}'s manager?`
          : `Give ${team.name} a manager?`
      }
      description={description}
      choice={
        <div className="grid gap-4">
          <Field id="team-new-manager" label="New manager" group>
            <EntityPicker
              items={shownCandidates}
              selectedIds={pickedId ? [pickedId] : []}
              onToggle={(candidate) =>
                setPickedId((id) => (id === candidate.id ? null : candidate.id))
              }
              getId={(candidate) => candidate.id}
              getLabel={fullName}
              getSubtitle={(candidate) => ROLE_LABELS[candidate.role]}
              getAvatarText={initials}
              getGroup={(candidate) => candidate.group}
              emptyMessage="Nobody can lead it yet. Add a member to the team, or give someone in no team the Manager role."
              searchPlaceholder="Search people"
              onSearchChange={setSearch}
              isLoading={managersInNoTeam.isLoading}
            />
          </Field>

          {current && (
            <label className="flex cursor-pointer items-center justify-between gap-4 text-sm font-medium text-foreground">
              Keep {currentName} in the team as a member
              <Switch
                checked={keepsCurrent}
                onChange={(event) => setKeepsCurrent(event.target.checked)}
                disabled={changeManager.isPending}
              />
            </label>
          )}

          {picked && (
            <div className="rounded-lg bg-muted/30 px-3 py-2.5 text-sm">
              <p className="text-xs font-medium text-muted-foreground">
                From today
              </p>
              <ul className="mt-1.5 grid gap-1.5">
                <ChangeLine person={picked}>
                  manager
                  {picked.role === UserRole.EMPLOYEE && (
                    <Badge variant="neutral">Gets the Manager role</Badge>
                  )}
                </ChangeLine>
                {current && (
                  <ChangeLine person={current}>
                    {keepsCurrent
                      ? "member"
                      : "leaves the team; their past days stay with it"}
                  </ChangeLine>
                )}
              </ul>
            </div>
          )}
        </div>
      }
      confirmText={current ? "Change manager" : "Add manager"}
      onConfirm={confirm}
      onClose={close}
      loading={changeManager.isPending}
      confirmDisabled={!picked}
    />
  );
};
