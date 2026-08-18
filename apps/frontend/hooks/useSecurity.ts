"use client";

import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

import { AuthClient } from "@/lib/api/resources";
import { getErrorMessage } from "@/lib/api/errors";

export function useSecurity() {
  const changePassword = useMutation({
    mutationFn: AuthClient.changePassword,

    onSuccess: () => {
      toast.success("Password changed successfully");
    },

    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });

  return {
    actions: {
      changePassword,
    },
  };
}
