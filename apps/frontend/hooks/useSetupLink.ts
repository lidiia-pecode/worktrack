"use client";

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { EntityRef, formatEntityRef, OPEN_PARAM } from "@/lib/utils/entity-ref";

interface SetupLinkOptions {
  create?: boolean;
  /** Shown in the page's entity panel on arrival. */
  open?: EntityRef | null;
}

const CREATE = "create";
const ONBOARDING = "onboarding";

/** A link from the setup checklist; the page it opens returns to Getting started once the step is done. */
export const setupLink = (path: string, options: SetupLinkOptions = {}) => {
  const params = new URLSearchParams({ [ONBOARDING]: "true" });

  if (options.create) params.set(CREATE, "true");
  if (options.open) params.set(OPEN_PARAM, formatEntityRef(options.open));

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

/** Whether the page was reached from the setup checklist, which it returns to once the step is done. */
export const useIsOnboarding = () =>
  useSearchParams().get(ONBOARDING) === "true";

/**
 * Read these once, as the page's starting state: the form opens on arrival,
 * and the parameters are then dropped so a reload or Back does not reopen it.
 */
export const useSetupLinkParams = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!searchParams.has(CREATE)) return;

    const remaining = new URLSearchParams(searchParams);
    remaining.delete(CREATE);

    router.replace(remaining.size ? `${pathname}?${remaining}` : pathname, {
      scroll: false,
    });
  }, [pathname, router, searchParams]);

  return {
    isOnboarding: searchParams.get(ONBOARDING) === "true",
    opensCreateForm: searchParams.get(CREATE) === "true",
  };
};
