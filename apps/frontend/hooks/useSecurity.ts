"use client";

import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

import { AuthClient } from "@/lib/api/resources";
import { getErrorMessage } from "@/lib/api/errors";
import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export function useSecurity() {
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const googleStatus = searchParams.get("google");
    const message = searchParams.get("message");

    if (googleStatus === "linked") {
      toast.success("Google account linked successfully");
    }

    if (googleStatus === "error") {
      toast.error(message ?? "Failed to link Google account");
    }

    if (googleStatus) {
      router.replace("/settings");
    }
  }, [searchParams, router]);

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
