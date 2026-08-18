"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";

export function useGoogleLinkResult() {
  const searchParams = useSearchParams();

  useEffect(() => {
    const googleStatus = searchParams.get("google");
    const message = searchParams.get("message");

    if (!googleStatus) return;

    requestAnimationFrame(() => {
      if (googleStatus === "linked") {
        toast.success("Google account linked successfully");
      }

      if (googleStatus === "error") {
        toast.error(message ?? "Failed to link Google account");
      }
    });
  }, [searchParams]);
}
