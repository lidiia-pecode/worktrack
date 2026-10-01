"use client";

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

interface SetupLinkOptions {
  create?: boolean;
  projectId?: string | null;
}

const CREATE = "create";
const PROJECT = "project";

/** A link from the setup checklist; the page it opens returns to Getting started once the step is done. */
export const setupLink = (path: string, options: SetupLinkOptions = {}) => {
  const params = new URLSearchParams({ onboarding: "true" });

  if (options.create) params.set(CREATE, "true");
  if (options.projectId) params.set(PROJECT, options.projectId);

  return `${path}?${params}`;
};

/**
 * A "create this first" hint: opens the page with its create form open, and
 * keeps the setup context only when the hint itself was reached from setup.
 */
export const createFirstLink = (path: string, isOnboarding: boolean) =>
  isOnboarding
    ? setupLink(path, { create: true })
    : `${path}?${new URLSearchParams({ [CREATE]: "true" })}`;

/**
 * Read these once, as the page's starting state: the form opens on arrival,
 * and the parameters are then dropped so a reload or Back does not reopen it.
 */
export const useSetupLinkParams = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!searchParams.has(CREATE) && !searchParams.has(PROJECT)) return;

    const remaining = new URLSearchParams(searchParams);
    remaining.delete(CREATE);
    remaining.delete(PROJECT);

    router.replace(remaining.size ? `${pathname}?${remaining}` : pathname, {
      scroll: false,
    });
  }, [pathname, router, searchParams]);

  return {
    isOnboarding: searchParams.get("onboarding") === "true",
    opensCreateForm: searchParams.get(CREATE) === "true",
    projectId: searchParams.get(PROJECT),
  };
};
