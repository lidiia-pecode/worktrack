"use client";

import { useState } from "react";
import { MailPlus } from "lucide-react";

import { Button } from "@/components/ui/button";

import { ResourceFormModal } from "../shared/resource/ResourceFormModal";
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

export function InviteUserModal({
  open,
  onClose,
  isOnboarding,
}: InviteUserModalProps) {
  const {
    actions: { create },
  } = useInvitations();

  const router = useRouter();
  const [canSubmit, setCanSubmit] = useState(true);

  const handleSubmit = (data: InviteUserFormData) => {
    create.mutate(data, {
      onSuccess: () => {
        onClose();

        if (isOnboarding) {
          router.push(GETTING_STARTED_PATH);
        }
      },
    });
  };

  return (
    <ResourceFormModal
      open={open}
      onClose={onClose}
      title="Invite user"
      description="Send an invitation to join your workspace."
      icon={<MailPlus className="size-5" />}
      footer={
        <div className="flex items-center justify-end gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>

          <Button
            type="submit"
            form={FORM_ID}
            size="sm"
            isLoading={create.isPending}
            disabled={!canSubmit}
          >
            Send invitation
          </Button>
        </div>
      }
    >
      <InviteUserForm
        formId={FORM_ID}
        onSubmit={handleSubmit}
        onCanSubmitChange={setCanSubmit}
        isSubmitting={create.isPending}
      />
    </ResourceFormModal>
  );
}
