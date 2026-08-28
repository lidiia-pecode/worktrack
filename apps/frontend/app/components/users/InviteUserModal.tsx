"use client";

import { MailPlus } from "lucide-react";

import { ResourceFormModal } from "../shared/resourse/ResourceFormModal";
import { InviteUserForm } from "./InviteUserForm";
import { InviteUserFormData } from "@/lib/forms/schemas/invite-user.schema";
import { useRouter } from "next/navigation";
import { useInvitations } from "@/hooks/auth/useInvitation";

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

  const handleSubmit = (data: InviteUserFormData) => {
    create.mutate(data, {
      onSuccess: () => {
        onClose();

        if (isOnboarding) {
          router.push("/");
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
    >
      <InviteUserForm onSubmit={handleSubmit} isSubmitting={create.isPending} />
    </ResourceFormModal>
  );
}
