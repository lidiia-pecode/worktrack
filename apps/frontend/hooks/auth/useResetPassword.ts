"use client";

import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

import { AuthClient } from "@/lib/api/resources";

export function useResetPassword() {
  const forgotPassword = useMutation({
    mutationFn: AuthClient.forgotPassword,

    onError: () => {},
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
