"use client";

import { useState } from "react";
import { CreateDialog } from "../shared/resource/CreateDialog";
import { InviteUserForm } from "./InviteUserForm";
import { InviteUserFormData } from "@/lib/forms/schemas/invite-user.schema";
import { useRouter } from "next/navigation";

import { GETTING_STARTED_PATH } from "@/lib/constants";
import { useInvitations } from "@/hooks/auth/useInvitation";

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

  const router = useRouter();
  const [canSubmit, setCanSubmit] = useState(true);

  const handleSubmit = (data: InviteUserFormData) =>
    create.mutateAsync(data, {
      onSuccess: () => {
        onClose();

        if (isOnboarding) {
          router.push(GETTING_STARTED_PATH);
        }
      },
    });

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
