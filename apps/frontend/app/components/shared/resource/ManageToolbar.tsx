"use client";

import { Archive, ArchiveRestore } from "lucide-react";

import type { ManageListState } from "@/hooks/useManageListState";

import { SearchInput } from "../inputs/SearchInput";
import { ResourceTabButton, ResourceTabList } from "./ResourceTabs";

interface ManageToolbarProps {
  title: string;
  listState: ManageListState;
  panelId: string;
  archivedLabel: string;
  searchPlaceholder: string;
}

export const manageTabId = (panelId: string, tab: string) =>
  `${panelId}-${tab}`;

/** Active / Archived tabs and the search box above a Manage list. */
export const ManageToolbar = ({
  title,
  listState,
  panelId,
  archivedLabel,
  searchPlaceholder,
}: ManageToolbarProps) => {
  const { tab, setTab, search, setSearch } = listState;

  return (
    <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between md:border-b md:border-border">
      <ResourceTabList label={`${title} status`} className="md:border-b-0">
        <ResourceTabButton
          id={manageTabId(panelId, "active")}
          controls={panelId}
          active={tab === "active"}
          icon={<ArchiveRestore className="size-3.5" />}
          label="Active"
          onClick={() => setTab("active")}
        />

        <ResourceTabButton
          id={manageTabId(panelId, "archived")}
          controls={panelId}
          active={tab === "archived"}
          icon={<Archive className="size-3.5" />}
          label={archivedLabel}
          onClick={() => setTab("archived")}
        />
      </ResourceTabList>

      <SearchInput
        value={search}
        onChange={setSearch}
        placeholder={searchPlaceholder}
        className="w-full md:mb-2 md:w-72"
      />
    </div>
  );
};
