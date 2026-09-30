"use client";

import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

import { AuthClient } from "@/lib/api/resources";
import { getErrorMessage } from "@/lib/api/errors";

export function useResetPassword() {
  const forgotPassword = useMutation({
    mutationFn: AuthClient.forgotPassword,

    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });

  const resetPassword = useMutation({
    mutationFn: AuthClient.resetPassword,

    onSuccess: () => {
      toast.success("Your password has been changed");
    },

    onError: () => {},
  });

  return {
    actions: {
      resetPassword,
      forgotPassword,
    },
  };
}
