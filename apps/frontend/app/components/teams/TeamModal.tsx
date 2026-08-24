"use client";

import { Archive, ArchiveRestore, UsersRound } from "lucide-react";

import { Button } from "@/components/ui/button";

import { useTeams } from "@/hooks/useTeams";
import { Team } from "@/types/Team";
import { TeamStatus } from "@/types/enums";

import { ResourceFormModal } from "../shared/ResourceFormModal";
import { TeamForm, TeamFormData } from "./TeamForm";
import { TeamMembersSection } from "./TeamMembersSection";

interface TeamModalProps {
  open: boolean;
  onClose: () => void;
  team?: Team;
}

const FORM_ID = "team-details-form";

export function TeamModal({ open, onClose, team }: TeamModalProps) {
  const {
    actions: { create, update, archive, unarchive },
  } = useTeams();

  const isEditMode = Boolean(team);
  const isArchived = team?.status === TeamStatus.ARCHIVED;
  const isSubmitting = create.isPending || update.isPending;

  const handleSubmit = (data: TeamFormData) => {
    if (team) {
      update.mutate({ id: team.id, data }, { onSuccess: onClose });
      return;
    }

    create.mutate(data, { onSuccess: onClose });
  };

  return (
    <ResourceFormModal
      open={open}
      onClose={onClose}
      size={isEditMode ? "lg" : "md"}
      title={isEditMode ? team!.name : "Create team"}
      description={
        isEditMode
          ? "Update team details and manage who's on it."
          : "Create a team to organize people and manage access."
      }
      icon={<UsersRound className="size-5" />}
      footer={
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
            <Button type="button" variant="ghost" size="sm" onClick={onClose}>
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
      }
    >
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
            <TeamMembersSection team={team!} />
          </div>
        )}
      </div>
    </ResourceFormModal>
  );
}
