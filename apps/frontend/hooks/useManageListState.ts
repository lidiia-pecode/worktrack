"use client";

import { useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

import { useDebouncedValue } from "./useDebouncedValue";

export type ResourceTab = "active" | "archived";

const TAB_PARAM = "tab";
const ARCHIVED_TAB: ResourceTab = "archived";
const SEARCH_DEBOUNCE_MS = 300;

/** What is typed, and what goes to the server once typing pauses. */
export const useServerSearch = () => {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search.trim(), SEARCH_DEBOUNCE_MS);

  return {
    search,
    setSearch,
    /** What was last asked for; undefined while nothing is searched. */
    searchQuery: debouncedSearch || undefined,
  };
};

/**
 * A Manage list's tab, kept in `?tab=` so a reload stays on it, and its
 * search, which goes to the server once typing pauses and applies on both tabs.
 */
export const useManageListState = () => {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const serverSearch = useServerSearch();

  const tab: ResourceTab =
    searchParams.get(TAB_PARAM) === ARCHIVED_TAB ? ARCHIVED_TAB : "active";

  // Other parameters, such as `?onboarding=`, stay in the URL.
  const setTab = (nextTab: ResourceTab) => {
    const params = new URLSearchParams(searchParams);

    if (nextTab === ARCHIVED_TAB) params.set(TAB_PARAM, nextTab);
    else params.delete(TAB_PARAM);

    window.history.replaceState(
      null,
      "",
      params.size ? `${pathname}?${params}` : pathname,
    );
  };

  return {
    tab,
    setTab,
    ...serverSearch,
  };
};

export type ManageListState = ReturnType<typeof useManageListState>;
