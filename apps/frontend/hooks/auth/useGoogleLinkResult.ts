"use client";

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

import { googleErrorMessage } from "@/lib/constants";

const GOOGLE_PARAMS = ["google", "error"] as const;

/** A fixed id, so an effect that runs twice still shows one toast. */
const RESULT_TOAST_ID = "google-link-result";

/**
 * Shows the result of linking Google once, then drops it from the URL, so a
 * reload or Back does not show it again.
 */
export function useGoogleLinkResult() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const linked = searchParams.get("google") === "linked";
  const error = googleErrorMessage(searchParams.get("error"));
  const hasResult = linked || Boolean(error);

  useEffect(() => {
    if (!hasResult) return;

    // The toaster subscribes after this page's first effects, so wait a tick.
    setTimeout(() => {
      if (linked) {
        toast.success("Google account linked", { id: RESULT_TOAST_ID });
      } else if (error) {
        toast.error(error, { id: RESULT_TOAST_ID });
      }
    }, 0);

    const remaining = new URLSearchParams(searchParams);
    GOOGLE_PARAMS.forEach((param) => remaining.delete(param));

    // Linking started on Security, so the page stays there once the result goes.
    if (!remaining.has("tab")) remaining.set("tab", "security");

    router.replace(`${pathname}?${remaining}`, { scroll: false });
  }, [error, hasResult, linked, pathname, router, searchParams]);

  return { hasResult };
}
