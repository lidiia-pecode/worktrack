"use client";

import { useRouter } from "next/navigation";
import { UsersRound } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useTeamsMutations } from "@/hooks/useTeams";
import { GETTING_STARTED_PATH } from "@/lib/constants";
import { Team } from "@/types/Team";

import { ResourceFormModal } from "../shared/resource/ResourceFormModal";
import { TeamForm, TeamFormData } from "./TeamForm";

interface TeamCreateDialogProps {
  open: boolean;
  onClose: () => void;
  /** Gets the new team, unless onboarding returns to the checklist instead. */
  onCreated: (team: Team) => void;
  isOnboarding?: boolean;
}

const FORM_ID = "team-create-form";

/** Members are added in the new team's panel. */
export const TeamCreateDialog = ({
  open,
  onClose,
  onCreated,
  isOnboarding = false,
}: TeamCreateDialogProps) => {
  const router = useRouter();
  const { create } = useTeamsMutations();

  const handleSubmit = (data: TeamFormData) =>
    create.mutate(data, {
      onSuccess: (team) => {
        onClose();

        if (isOnboarding) router.push(GETTING_STARTED_PATH);
        else onCreated(team);
      },
    });

  return (
    <ResourceFormModal
      open={open}
      onClose={onClose}
      title="Create team"
      description="Name the team. You add its manager and members next."
      icon={<UsersRound className="size-5" />}
      footer={
        <>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={create.isPending}
          >
            Cancel
          </Button>

          <Button
            type="submit"
            form={FORM_ID}
            size="sm"
            isLoading={create.isPending}
          >
            Create team
          </Button>
        </>
      }
    >
      <TeamForm
        formId={FORM_ID}
        onSubmit={handleSubmit}
        isSubmitting={create.isPending}
      />
    </ResourceFormModal>
  );
};
