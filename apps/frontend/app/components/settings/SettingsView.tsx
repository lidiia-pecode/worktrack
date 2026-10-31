"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";

import { useAuth } from "@/hooks/auth/useAuth";
import { useGoogleLinkResult } from "@/hooks/auth/useGoogleLinkResult";
import { useUnsavedChangesGuard } from "@/hooks/useUnsavedChangesGuard";
import { DiscardChangesModal } from "@/app/components/shared/DiscardChangesModal";

import { SettingsSidebar } from "./SettingsSidebar";
import { ProfileSettings } from "./profile/ProfileSettings";
import { SecuritySettings } from "./security/SecuritySettings";
import { CompanySettings } from "./company/CompanySettings";
import { resolveSettingsTab, type SettingsTab } from "./settings-tabs";

export const SettingsView = ({ isOwner }: { isOwner: boolean }) => {
  const { user } = useAuth();

  const searchParams = useSearchParams();
  const { hasResult: hasGoogleResult } = useGoogleLinkResult();

  const activeTab = resolveSettingsTab(searchParams.get("tab"), {
    isOwner,
    hasGoogleResult,
  });

  // Switching tabs replaces the form, and leaving drops it, so unsaved edits
  // ask first either way.
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [pendingTab, setPendingTab] = useState<SettingsTab | null>(null);
  const leaving = useUnsavedChangesGuard(hasUnsavedChanges);

  const showTab = (tab: SettingsTab) =>
    window.history.replaceState(null, "", `?tab=${tab}`);

  const changeTab = (tab: SettingsTab) => {
    if (tab === activeTab) return;

    if (hasUnsavedChanges) {
      setPendingTab(tab);
      return;
    }

    showTab(tab);
  };

  const discardAndChangeTab = () => {
    if (pendingTab) showTab(pendingTab);
    setPendingTab(null);
  };

  return (
    <>
      <div className="flex max-w-6xl flex-col gap-10 md:flex-row md:items-start">
        <SettingsSidebar
          activeTab={activeTab}
          isOwner={isOwner}
          onChange={changeTab}
        />

        <div className="min-w-0 max-w-180 flex-1">
          {activeTab === "profile" && (
            <ProfileSettings user={user} onDirtyChange={setHasUnsavedChanges} />
          )}

          {activeTab === "security" && (
            <SecuritySettings onDirtyChange={setHasUnsavedChanges} />
          )}

          {activeTab === "company" && isOwner && (
            <CompanySettings onDirtyChange={setHasUnsavedChanges} />
          )}
        </div>
      </div>

      <DiscardChangesModal
        isOpen={pendingTab !== null}
        onDiscard={discardAndChangeTab}
        onKeepEditing={() => setPendingTab(null)}
      />

      <DiscardChangesModal
        isOpen={leaving.pendingHref !== null}
        onDiscard={leaving.discardAndLeave}
        onKeepEditing={leaving.keepEditing}
      />
    </>
  );
};
