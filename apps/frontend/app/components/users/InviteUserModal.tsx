"use client";

import { useState } from "react";

import { useInvitations } from "@/hooks/auth/useInvitation";
import { InviteUserFormData } from "@/lib/forms/schemas/invite-user.schema";

import { CreateDialog, useAfterCreate } from "../shared/resource/CreateDialog";
import { InviteUserForm } from "./InviteUserForm";

const FORM_ID = "invite-user-form";

interface InviteUserModalProps {
  open: boolean;
  onClose: () => void;
  isOnboarding?: boolean;
}

export const InviteUserModal = ({
  open,
  onClose,
  isOnboarding,
}: InviteUserModalProps) => {
  const {
    actions: { create },
  } = useInvitations();

  const [canSubmit, setCanSubmit] = useState(true);
  const afterCreate = useAfterCreate({ onClose, isOnboarding });

  const handleSubmit = (data: InviteUserFormData) =>
    create.mutateAsync(data, { onSuccess: afterCreate });

  return (
    <CreateDialog
      open={open}
      onClose={onClose}
      title="Invite someone"
      next="They get an email with a link to join."
      formId={FORM_ID}
      submitLabel="Send invitation"
      isSubmitting={create.isPending}
      submitDisabled={!canSubmit}
    >
      <InviteUserForm
        formId={FORM_ID}
        onSubmit={handleSubmit}
        onCanSubmitChange={setCanSubmit}
        isSubmitting={create.isPending}
      />
    </CreateDialog>
  );
};
