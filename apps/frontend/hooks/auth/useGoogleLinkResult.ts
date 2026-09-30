"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";

import { googleErrorMessage } from "@/lib/constants";

export function useGoogleLinkResult() {
  const searchParams = useSearchParams();

  useEffect(() => {
    const linked = searchParams.get("google") === "linked";
    const error = googleErrorMessage(searchParams.get("error"));

    if (!linked && !error) return;

    requestAnimationFrame(() => {
      if (linked) {
        toast.success("Google account linked successfully");
      }

      if (error) {
        toast.error(error);
      }
    });
  }, [searchParams]);
}
