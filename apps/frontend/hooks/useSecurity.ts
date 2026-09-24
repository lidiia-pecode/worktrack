"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { AuthClient } from "@/lib/api/resources";
import { getErrorMessage, isApiValidationError } from "@/lib/api/errors";
import { queryKeys } from "./shared/queryKeys";

export function useSecurity() {
  const queryClient = useQueryClient();

  const changePassword = useMutation({
    mutationFn: AuthClient.changePassword,

    onSuccess: (_, { currentPassword }) => {
      // Setting a first password changes `hasPassword` on the current user.
      queryClient.invalidateQueries({ queryKey: queryKeys.auth.me() });

      toast.success(
        currentPassword
          ? "Password changed. You've been signed out on your other devices."
          : "Password set. You can now also sign in with your email.",
      );
    },

    // Field errors are shown next to the field by the form.
    onError: (error) => {
      if (isApiValidationError(error)) return;

      toast.error(getErrorMessage(error));
    },
  });

  return {
    actions: {
      changePassword,
    },
  };
}
