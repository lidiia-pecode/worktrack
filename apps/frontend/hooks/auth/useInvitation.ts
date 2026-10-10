"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useRouter } from "next/navigation";

import { InvitationsClientApi } from "@/lib/api/resources/invitations-client-api";
import { isUnusableInvitationError } from "@/lib/api/errors";

import { queryKeys } from "../shared/queryKeys";

import { toast } from "sonner";

export const useInvitations = () => {
  const queryClient = useQueryClient();

  const invalidateInvitations = () =>
    queryClient.invalidateQueries({
      queryKey: queryKeys.invitations.all,
    });

  const create = useMutation({
    // The form shows an email already in use under the field.
    meta: { conflictShownInForm: true },
    mutationFn: InvitationsClientApi.create,

    onSuccess: () => {
      invalidateInvitations();

      toast.success("Invitation sent successfully");
    },
  });

  const resend = useMutation({
    mutationFn: InvitationsClientApi.resend,

    onSuccess: () => {
      invalidateInvitations();

      toast.success(
        "Invitation sent again. The previous link no longer works.",
      );
    },
  });

  const revoke = useMutation({
    mutationFn: InvitationsClientApi.revoke,

    onSuccess: () => {
      invalidateInvitations();

      toast.success("Invitation revoked");
    },
  });

  return {
    actions: {
      create,
      resend,
      revoke,
    },
  };
};

export const usePendingInvitations = () =>
  useQuery({
    queryKey: queryKeys.invitations.pending(),
    queryFn: InvitationsClientApi.listPending,
  });

export const useCompleteInvitation = () => {
  const router = useRouter();

  const password = useMutation({
    mutationFn: InvitationsClientApi.completeWithPassword,

    onSuccess: () => {
      router.replace("/");
      router.refresh();
    },

    // Replaces the global toast: the form shows the error itself.
    onError: () => {},
  });

  return {
    password,
  };
};

export const useInvitationValidation = (token: string) =>
  useQuery({
    queryKey: queryKeys.invitations.validate(token),
    queryFn: () => InvitationsClientApi.validate(token),
    enabled: Boolean(token),
    // An unusable link stays unusable; only a failed request is worth retrying.
    retry: (failureCount, error) =>
      !isUnusableInvitationError(error) && failureCount < 2,
  });
