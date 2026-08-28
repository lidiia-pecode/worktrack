"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Archive, ArchiveRestore, ArrowLeft, UsersRound } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/auth/useAuth";
import { useTeams, useTeamMembers } from "@/hooks/useTeams";
import { useUsers } from "@/hooks/useUsers";

import { Team } from "@/types/Team";
import { TeamRole, TeamStatus, UserRole } from "@/types/enums";
import { fullName, initials } from "@/lib/utils/user";

import { ResourceFormModal } from "../shared/resourse/ResourceFormModal";
import { EntityPicker } from "../shared/resourse/EntityPicker";
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

export function TeamModal({
  open,
  onClose,
  team,
  isOnboarding = false,
}: TeamModalProps) {
  const router = useRouter();
  const { user } = useAuth();

  const [view, setView] = useState<View>("form");
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [isAddingMembers, setIsAddingMembers] = useState(false);
  const [assignRoleOverride, setAssignRoleOverride] = useState<TeamRole | null>(
    null,
  );

  const {
    actions: { create, update, archive, unarchive },
  } = useTeams();

  const { addMember } = useTeamMembers(team?.id ?? "");

  const { items: allUsers = [], isLoading: isUsersLoading } = useUsers();

  const isEditMode = Boolean(team);
  const isArchived = team?.status === TeamStatus.ARCHIVED;
  const isPicking = view === "members";

  const isSubmitting = create.isPending || update.isPending;
  const isArchiving = archive.isPending || unarchive.isPending;

  const isOwner = user?.role === UserRole.OWNER;
  const isManager = user?.role === UserRole.MANAGER;

  const defaultTeamRole = isOwner ? TeamRole.MANAGER : TeamRole.MEMBER;

  const assignRole = assignRoleOverride ?? defaultTeamRole;

  const activeMemberUserIds = (team?.memberships ?? [])
    .filter((membership) => !membership.leftAt)
    .map((membership) => membership.userId);

  const availableUsers = allUsers.filter((candidate) => {
    if (activeMemberUserIds.includes(candidate.id)) {
      return false;
    }

    /**
     * Manager can ONLY add employees.
     */
    if (isManager) {
      return candidate.role === UserRole.EMPLOYEE;
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
          onSuccess: onClose,
        },
      );

      return;
    }

    create.mutate(data, {
      onSuccess: () => {
        onClose();

        if (isOnboarding) {
          router.push("/");
        }
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
    if (isManager) {
      return;
    }

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
      const joinedAt = new Date().toISOString().slice(0, 10);

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

      if (isOnboarding) {
        onClose();
        router.push("/");
      }
    } finally {
      setIsAddingMembers(false);
    }
  };

  const handleArchiveToggle = () => {
    if (!team) {
      return;
    }

    if (isArchived) {
      unarchive.mutate(team.id);
      return;
    }

    archive.mutate(team.id);
  };

  const handleCloseModal = () => {
    setSelectedUserIds([]);
    setAssignRoleOverride(null);
    setView("form");
    onClose();
  };

  const pickerEmptyMessage =
    assignRole === TeamRole.MANAGER
      ? "No users with the manager role found."
      : "No employees available.";

  return (
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
          : isEditMode
            ? "Update team details and manage who's on it."
            : "Create a team to organize people and manage access."
      }
      icon={isPicking ? undefined : <UsersRound className="size-5" />}
      footer={
        isPicking ? (
          <div className="flex items-center justify-between gap-3">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleCloseMembersPicker}
              className="gap-1.5"
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
          </div>
        ) : (
          <div className="flex w-full items-center justify-between gap-3">
            {isEditMode ? (
              <Button
                type="button"
                variant={isArchived ? "success" : "destructive"}
                size="sm"
                className="gap-1.5"
                onClick={handleArchiveToggle}
                isLoading={isArchiving}
              >
                {isArchived ? (
                  <ArchiveRestore className="size-4" />
                ) : (
                  <Archive className="size-4" />
                )}

                {isArchived ? "Unarchive" : "Archive"}
              </Button>
            ) : (
              <span />
            )}

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleCloseModal}
              >
                Cancel
              </Button>

              <Button
                type="submit"
                form={FORM_ID}
                size="sm"
                isLoading={isSubmitting}
              >
                {isEditMode ? "Save changes" : "Create team"}
              </Button>
            </div>
          </div>
        )
      }
    >
      {isPicking ? (
        <div className="space-y-4 px-6 py-5">
          <div className="space-y-2">
            <p className="text-sm font-medium">Add as</p>

            <div className="flex gap-2">
              {isOwner && (
                <>
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
                </>
              )}

              {isManager && (
                <Button type="button" size="sm" variant="primary" aria-pressed>
                  Member
                </Button>
              )}
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
            emptyMessage={pickerEmptyMessage}
            searchPlaceholder="Search people..."
          />
        </div>
      ) : (
        <div className="space-y-6">
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

          {isEditMode && team && (
            <div className="border-t border-border pt-6">
              <TeamMembersSection
                team={team}
                onOpenAddMembers={handleOpenMembersPicker}
              />
            </div>
          )}
        </div>
      )}
    </ResourceFormModal>
  );
}
