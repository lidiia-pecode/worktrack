"use client";

import { MailPlus } from "lucide-react";

import { ResourceFormModal } from "../shared/resourse/ResourceFormModal";
import { InviteUserForm } from "./InviteUserForm";
import { useInvitations } from "@/hooks/useInvitation";
import { InviteUserFormData } from "@/lib/forms/schemas/invite-user.schema";

interface InviteUserModalProps {
  open: boolean;
  onClose: () => void;
}

export function InviteUserModal({ open, onClose }: InviteUserModalProps) {
  const {
    actions: { create },
  } = useInvitations();

  const handleSubmit = (data: InviteUserFormData) => {
    create.mutate(data, {
      onSuccess: onClose,
    });
  };

  return (
    <ResourceFormModal
      open={open}
      onClose={onClose}
      title="Invite user"
      description="Send an invitation to join your workspace."
      icon={<MailPlus className="size-5" />}
    >
      <InviteUserForm onSubmit={handleSubmit} isSubmitting={create.isPending} />
    </ResourceFormModal>
  );
}
