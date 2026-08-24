"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useRouter } from "next/navigation";

import { InvitationsClientApi } from "@/lib/api/resources/invitations-client-api";

import { queryKeys } from "./shared/queryKeys";

import { toast } from "sonner";

export const useInvitations = () => {
  const queryClient = useQueryClient();

  const create = useMutation({
    mutationFn: InvitationsClientApi.create,

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.invitations.all,
      });

      toast.success("Invitation sent successfully");
    },
  });

  return {
    actions: {
      create,
    },
  };
};

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
