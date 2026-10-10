"use client";

import { useTeamsMutations } from "@/hooks/useTeams";
import { Team } from "@/types/Team";

import { CreateDialog, useAfterCreate } from "../shared/resource/CreateDialog";
import { NameForm, NameFormData } from "../shared/resource/NameForm";

interface TeamCreateDialogProps {
  open: boolean;
  onClose: () => void;
  onCreated: (team: Team) => void;
  isOnboarding?: boolean;
}

const FORM_ID = "team-create-form";

/** The same name field on creating and in the panel. */
export const TEAM_NAME_FIELD = {
  entity: "Team",
  maxLength: 255,
  placeholder: "e.g. Engineering",
};

export const TeamCreateDialog = ({
  open,
  onClose,
  onCreated,
  isOnboarding,
}: TeamCreateDialogProps) => {
  const { create } = useTeamsMutations();
  const afterCreate = useAfterCreate({ onClose, onCreated, isOnboarding });

  const handleSubmit = (data: NameFormData) =>
    create.mutateAsync(data, { onSuccess: afterCreate });

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
      <NameForm
        formId={FORM_ID}
        {...TEAM_NAME_FIELD}
        onSubmit={handleSubmit}
        isSubmitting={create.isPending}
      />
    </CreateDialog>
  );
};
