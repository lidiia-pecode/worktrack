"use client";

import { useState } from "react";
import { Archive, ArchiveRestore, ArrowLeft, UsersRound } from "lucide-react";

import { Button } from "@/components/ui/button";

import { useTeams, useTeamMembers } from "@/hooks/useTeams";
import { useUsers } from "@/hooks/useUsers";
import { Team } from "@/types/Team";
import { TeamRole, TeamStatus } from "@/types/enums";
import { fullName, initials } from "@/lib/utils/user";

import { ResourceFormModal } from "../shared/resourse/ResourceFormModal";
import { EntityPicker } from "../shared/resourse/EntityPicker";
import { TeamForm, TeamFormData } from "./TeamForm";
import { TeamMembersSection } from "./TeamMembersSection";

interface TeamModalProps {
  open: boolean;
  onClose: () => void;
  team?: Team;
}

type View = "form" | "members";

const FORM_ID = "team-details-form";

export function TeamModal({ open, onClose, team }: TeamModalProps) {
  const [view, setView] = useState<View>("form");
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [isAddingMembers, setIsAddingMembers] = useState(false);

  const {
    actions: { create, update, archive, unarchive },
  } = useTeams();

  const { addMember } = useTeamMembers(team?.id ?? "");
  const { items: allUsers = [], isLoading: isUsersLoading } = useUsers();

  const isEditMode = Boolean(team);
  const isArchived = team?.status === TeamStatus.ARCHIVED;
  const isSubmitting = create.isPending || update.isPending;
  const isPicking = view === "members";

  const handleSubmit = (data: TeamFormData) => {
    if (team) {
      update.mutate({ id: team.id, data }, { onSuccess: onClose });
      return;
    }

    create.mutate(data, { onSuccess: onClose });
  };

  const handleToggleUser = (userId: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId],
    );
  };

  const handleApplyMembers = async () => {
    setIsAddingMembers(true);
    try {
      await Promise.all(
        selectedUserIds.map((userId) =>
          addMember.mutateAsync({
            userId,
            roleInTeam: TeamRole.MEMBER,
            joinedAt: new Date().toISOString().slice(0, 10),
          }),
        ),
      );
      setSelectedUserIds([]);
      setView("form");
    } finally {
      setIsAddingMembers(false);
    }
  };

  const handleCloseModal = () => {
    setSelectedUserIds([]);
    setView("form");
    onClose();
  };

  const activeMemberUserIds = (team?.memberships ?? [])
    .filter((m) => !m.leftAt && !!m.user)
    .map((m) => m.userId);

  const availableUsers = allUsers.filter(
    (u) => !activeMemberUserIds.includes(u.id),
  );

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
              onClick={() => {
                setSelectedUserIds([]);
                setView("form");
              }}
              className="gap-1.5"
            >
              <ArrowLeft className="size-4" />
              Back
            </Button>

            <Button
              type="button"
              size="sm"
              onClick={handleApplyMembers}
              isLoading={isAddingMembers}
            >
              Apply
              {selectedUserIds.length > 0 ? ` (${selectedUserIds.length})` : ""}
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
                onClick={() =>
                  isArchived
                    ? unarchive.mutate(team!.id)
                    : archive.mutate(team!.id)
                }
                isLoading={archive.isPending || unarchive.isPending}
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
        <div className="px-6 py-5">
          <EntityPicker
            items={availableUsers}
            selectedIds={selectedUserIds}
            onToggle={handleToggleUser}
            getId={(user) => user.id}
            getLabel={fullName}
            getSubtitle={(user) => user.email}
            getAvatarText={initials}
            isLoading={isUsersLoading}
            emptyMessage="No available users found."
            searchPlaceholder="Search people..."
          />
        </div>
      ) : (
        <div className="space-y-6">
          <TeamForm
            formId={FORM_ID}
            mode={isEditMode ? "edit" : "create"}
            defaultValues={team ? { name: team.name } : undefined}
            onSubmit={handleSubmit}
            isSubmitting={isSubmitting}
          />

          {isEditMode && (
            <div className="border-t border-border pt-6">
              <TeamMembersSection
                team={team!}
                onOpenAddMembers={() => setView("members")}
              />
            </div>
          )}
        </div>
      )}
    </ResourceFormModal>
  );
}
