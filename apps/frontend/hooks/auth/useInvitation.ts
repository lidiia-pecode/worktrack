"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useRouter } from "next/navigation";

import { InvitationsClientApi } from "@/lib/api/resources/invitations-client-api";

import { queryKeys } from "../shared/queryKeys";

import { toast } from "sonner";

export const useInvitations = () => {
  const queryClient = useQueryClient();

  const invalidateInvitations = () =>
    queryClient.invalidateQueries({
      queryKey: queryKeys.invitations.all,
    });

  const create = useMutation({
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
  });
