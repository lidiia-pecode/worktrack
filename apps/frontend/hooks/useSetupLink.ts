"use client";

import { useSearchParams } from "next/navigation";

interface SetupLinkOptions {
  create?: boolean;
  projectId?: string | null;
}

/** A link from the setup checklist; the page it opens returns there once the step is done. */
export const setupLink = (path: string, options: SetupLinkOptions = {}) => {
  const params = new URLSearchParams({ onboarding: "true" });

  if (options.create) params.set("create", "true");
  if (options.projectId) params.set("project", options.projectId);

  return `${path}?${params}`;
};

export const useSetupLinkParams = () => {
  const searchParams = useSearchParams();

  return {
    isOnboarding: searchParams.get("onboarding") === "true",
    opensCreateForm: searchParams.get("create") === "true",
    projectId: searchParams.get("project"),
  };
};
