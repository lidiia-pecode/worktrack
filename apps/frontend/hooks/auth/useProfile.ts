"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { UsersClientApi } from "@/lib/api/resources";
import { queryKeys } from "./shared/queryKeys";

export function useProfile() {
  const queryClient = useQueryClient();

  const update = useMutation({
    mutationFn: UsersClientApi.updateProfile,

    onSuccess: (user) => {
      queryClient.setQueryData(queryKeys.auth.me(), user);

      toast.success("Profile updated");
    },
  });

  return {
    actions: {
      update,
    },
  };
}
