"use client";

import { useRouter } from "next/navigation";
import { useTeamsMutations } from "@/hooks/useTeams";
import { GETTING_STARTED_PATH } from "@/lib/constants";
import { Team } from "@/types/Team";

import { CreateDialog } from "../shared/resource/CreateDialog";
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
    create.mutateAsync(data, {
      onSuccess: (team) => {
        onClose();

        if (isOnboarding) router.push(GETTING_STARTED_PATH);
        else onCreated(team);
      },
    });

  return (
    <CreateDialog
      open={open}
      onClose={onClose}
      title="New team"
      next="Next, add its manager and members."
      formId={FORM_ID}
      submitLabel="Create team"
      isSubmitting={create.isPending}
    >
      <TeamForm
        formId={FORM_ID}
        onSubmit={handleSubmit}
        isSubmitting={create.isPending}
      />
    </CreateDialog>
  );
};
