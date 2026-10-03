"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { GETTING_STARTED_PATH } from "@/lib/constants";
import { Archive, ArchiveRestore, ArrowLeft, UsersRound } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/auth/useAuth";
import {
  useTeamArchiveImpact,
  useTeamDetails,
  useTeamMembers,
  useTeamsMutations,
} from "@/hooks/useTeams";
import { useAssignableUsersInfiniteQuery } from "@/hooks/useUsers";
import { useWorkSettings } from "@/hooks/useWorkSettings";
import { todayISODate } from "@/lib/utils/date";

import { Team, TeamArchiveImpact, TeamUser } from "@/types/Team";
import { TeamRole, TeamStatus, UserRole, UserStatus } from "@/types/enums";
import { fullName, initials } from "@/lib/utils/user";

import { ConfirmModal } from "../shared/ConfirmModal";
import { ResourceFormModal } from "../shared/resource/ResourceFormModal";
import { EntityPicker } from "../shared/resource/EntityPicker";
import { TeamForm, TeamFormData } from "./TeamForm";
import { TeamMembersSection } from "./TeamMembersSection";

interface TeamModalProps {
  open: boolean;
  onClose: () => void;
  team?: Team;
  isOnboarding?: boolean;
}

type View = "form" | "members";

const FORM_ID = "team-details-form";

const namesOf = (users: TeamUser[]) =>
  new Intl.ListFormat("en", { type: "conjunction" }).format(
    users.map(fullName),
  );

const archiveImpactMessage = (impact?: TeamArchiveImpact) => {
  if (!impact) return "Checking who this affects...";

  const { managers, peopleLeftWithoutTeam } = impact;
  const effects = [
    managers.length > 0 &&
      `${namesOf(managers)} will no longer manage this team.`,
    peopleLeftWithoutTeam.length > 0 &&
      `${namesOf(peopleLeftWithoutTeam)} will be left without a team, for you to place in another one.`,
    managers.length === 0 &&
      peopleLeftWithoutTeam.length === 0 &&
      "Nobody will be left without a team.",
  ].filter(Boolean);

  return [
    ...effects,
    "Time, absences and plans stay as they are. Restoring the team later brings it back with no members.",
  ].join(" ");
};

export const TeamModal = ({
  open,
  onClose,
  team: teamProp,
  isOnboarding = false,
}: TeamModalProps) => {
  const router = useRouter();
  const { user } = useAuth();
  const { timezone } = useWorkSettings();

  const [view, setView] = useState<View>("form");
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [isAddingMembers, setIsAddingMembers] = useState(false);
  const [assignRoleOverride, setAssignRoleOverride] = useState<TeamRole | null>(
    null,
  );
  const [isConfirmingArchive, setIsConfirmingArchive] = useState(false);
  // A new team stays open on its members, so the owner can add them straight away.
  const [createdTeam, setCreatedTeam] = useState<Team | null>(null);
  const [hasCompletedStep, setHasCompletedStep] = useState(false);

  const { data: createdTeamDetails } = useTeamDetails(createdTeam?.id ?? null);
  const team = teamProp ?? createdTeamDetails ?? createdTeam ?? undefined;

  const { create, update, archive, unarchive } = useTeamsMutations();

  const { addMember } = useTeamMembers(team?.id ?? "");

  const isOwner = user?.role === UserRole.OWNER;

  // Only an owner adds members, so nobody else needs the company-wide list.
  const {
    items: allUsers,
    isLoading: isUsersLoading,
    pagination,
  } = useAssignableUsersInfiniteQuery(
    { status: UserStatus.ACTIVE },
    { enabled: isOwner },
  );

  const isEditMode = Boolean(team);
  const isArchived = team?.status === TeamStatus.ARCHIVED;
  const isPicking = view === "members";
  const canEdit = isOwner && !isArchived;

  const archiveImpact = useTeamArchiveImpact(
    team?.id ?? "",
    isConfirmingArchive,
  );

  const isSubmitting = create.isPending || update.isPending;
  const isArchiving = archive.isPending || unarchive.isPending;

  const assignRole = assignRoleOverride ?? TeamRole.MANAGER;

  const activeMemberUserIds = (team?.memberships ?? [])
    .filter((membership) => !membership.leftAt)
    .map((membership) => membership.userId);

  const availableUsers = allUsers.filter((candidate) => {
    if (activeMemberUserIds.includes(candidate.id)) {
      return false;
    }

    if (assignRole === TeamRole.MANAGER) {
      return candidate.role === UserRole.MANAGER;
    }

    return candidate.role === UserRole.EMPLOYEE;
  });

  const handleSubmit = (data: TeamFormData) => {
    if (team) {
      update.mutate(
        {
          id: team.id,
          data,
        },
        {
          onSuccess: handleCloseModal,
        },
      );

      return;
    }

    create.mutate(data, {
      onSuccess: (created) => {
        setCreatedTeam(created);
        setHasCompletedStep(true);
      },
    });
  };

  const handleToggleUser = (userId: string) => {
    setSelectedUserIds((current) =>
      current.includes(userId)
        ? current.filter((id) => id !== userId)
        : [...current, userId],
    );
  };

  const handleChangeAssignRole = (role: TeamRole) => {
    if (role === assignRole) {
      return;
    }

    setAssignRoleOverride(role);
    setSelectedUserIds([]);
  };

  const handleOpenMembersPicker = () => {
    setAssignRoleOverride(null);
    setSelectedUserIds([]);
    setView("members");
  };

  const handleCloseMembersPicker = () => {
    setAssignRoleOverride(null);
    setSelectedUserIds([]);
    setView("form");
  };

  const handleApplyMembers = async () => {
    if (!team || selectedUserIds.length === 0) {
      return;
    }

    setIsAddingMembers(true);

    try {
      const joinedAt = todayISODate(timezone);

      await Promise.all(
        selectedUserIds.map((userId) =>
          addMember.mutateAsync({
            userId,
            roleInTeam: assignRole,
            joinedAt,
          }),
        ),
      );

      setSelectedUserIds([]);
      setAssignRoleOverride(null);
      setView("form");
      setHasCompletedStep(true);
    } finally {
      setIsAddingMembers(false);
    }
  };

  const handleArchiveToggle = () => {
    if (!team) {
      return;
    }

    if (isArchived) {
      unarchive.mutate(team.id, { onSuccess: handleCloseModal });
      return;
    }

    setIsConfirmingArchive(true);
  };

  const confirmArchive = () => {
    if (!team || !archiveImpact.data) return;

    archive.mutate(team.id, {
      onSuccess: () => {
        setIsConfirmingArchive(false);
        handleCloseModal();
      },
    });
  };

  const handleCloseModal = () => {
    setSelectedUserIds([]);
    setAssignRoleOverride(null);
    setView("form");
    setCreatedTeam(null);
    setHasCompletedStep(false);
    onClose();

    // Back to the checklist only once something was set up here.
    if (isOnboarding && hasCompletedStep) {
      router.push(GETTING_STARTED_PATH);
    }
  };

  const pickerEmptyMessage =
    assignRole === TeamRole.MANAGER
      ? "No users with the manager role found."
      : "No employees available.";

  return (
    <>
      <ResourceFormModal
        open={open}
        onClose={handleCloseModal}
        size="lg"
        bodyPadding={!isPicking}
        title={
          isPicking ? "Add members" : isEditMode ? team!.name : "Create team"
        }
        description={
          isPicking
            ? "Select people to add to this team."
            : isArchived
              ? "This team is archived and can no longer be changed."
              : createdTeam
                ? "Team created. Add the people who are on it, now or later."
                : isEditMode
                  ? isOwner
                    ? "Update team details and manage who's on it."
                    : "See who is on this team and remove anyone who has left."
                  : "Create a team to organize people and manage access."
        }
        icon={isPicking ? undefined : <UsersRound className="size-5" />}
        footer={
          isPicking ? (
            <>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleCloseMembersPicker}
                className="mr-auto gap-1.5"
                disabled={isAddingMembers}
              >
                <ArrowLeft className="size-4" />
                Back
              </Button>

              <Button
                type="button"
                size="sm"
                onClick={handleApplyMembers}
                isLoading={isAddingMembers}
                disabled={selectedUserIds.length === 0}
              >
                Apply
                {selectedUserIds.length > 0 && ` (${selectedUserIds.length})`}
              </Button>
            </>
          ) : (
            <>
              {isEditMode && isOwner && (
                <Button
                  type="button"
                  variant={isArchived ? "success" : "destructive"}
                  size="sm"
                  className="mr-auto gap-1.5"
                  onClick={handleArchiveToggle}
                  isLoading={isArchiving}
                >
                  {isArchived ? (
                    <ArchiveRestore className="size-4" />
                  ) : (
                    <Archive className="size-4" />
                  )}

                  {isArchived ? "Restore" : "Archive"}
                </Button>
              )}

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCloseModal}
                disabled={isSubmitting}
              >
                {createdTeam ? "Done" : canEdit ? "Cancel" : "Close"}
              </Button>

              {canEdit && (
                <Button
                  type="submit"
                  form={FORM_ID}
                  size="sm"
                  isLoading={isSubmitting}
                >
                  {isEditMode ? "Save changes" : "Create team"}
                </Button>
              )}
            </>
          )
        }
      >
        {isPicking ? (
          <div className="space-y-4 px-6 py-5">
            <div className="space-y-2">
              <p className="text-sm font-medium">Add as</p>

              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={
                    assignRole === TeamRole.MANAGER ? "primary" : "outline"
                  }
                  aria-pressed={assignRole === TeamRole.MANAGER}
                  onClick={() => handleChangeAssignRole(TeamRole.MANAGER)}
                >
                  Manager
                </Button>

                <Button
                  type="button"
                  size="sm"
                  variant={
                    assignRole === TeamRole.MEMBER ? "primary" : "outline"
                  }
                  aria-pressed={assignRole === TeamRole.MEMBER}
                  onClick={() => handleChangeAssignRole(TeamRole.MEMBER)}
                >
                  Member
                </Button>
              </div>
            </div>

            <EntityPicker
              items={availableUsers}
              selectedIds={selectedUserIds}
              onToggle={handleToggleUser}
              getId={(candidate) => candidate.id}
              getLabel={fullName}
              getSubtitle={(candidate) => candidate.email}
              getAvatarText={initials}
              isLoading={isUsersLoading}
              hasNextPage={pagination.hasNextPage}
              isFetchingNextPage={pagination.isFetchingNextPage}
              onFetchNextPage={pagination.fetchNextPage}
              emptyMessage={pickerEmptyMessage}
              searchPlaceholder="Search people..."
            />
          </div>
        ) : (
          <div className="space-y-6">
            {canEdit && (
              <TeamForm
                formId={FORM_ID}
                mode={isEditMode ? "edit" : "create"}
                defaultValues={
                  team
                    ? {
                        name: team.name,
                      }
                    : undefined
                }
                onSubmit={handleSubmit}
                isSubmitting={isSubmitting}
              />
            )}

            {isEditMode && team && (
              <div
                className={canEdit ? "border-t border-border pt-6" : undefined}
              >
                <TeamMembersSection
                  team={team}
                  onOpenAddMembers={handleOpenMembersPicker}
                />
              </div>
            )}
          </div>
        )}
      </ResourceFormModal>

      <ConfirmModal
        isOpen={isConfirmingArchive}
        title={team ? `Archive ${team.name}?` : ""}
        message={
          archiveImpact.isError
            ? "Could not check who this affects. Close this and try again."
            : archiveImpactMessage(archiveImpact.data)
        }
        confirmText="Archive"
        variant="danger"
        onConfirm={confirmArchive}
        onClose={() => setIsConfirmingArchive(false)}
        loading={archive.isPending}
        confirmDisabled={!archiveImpact.data}
      />
    </>
  );
};
