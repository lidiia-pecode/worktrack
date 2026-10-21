"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";

import { useAuth } from "@/hooks/auth/useAuth";
import { UserRole } from "@/types/enums";
import { SettingsSidebar } from "@/app/components/settings/SettingsSidebar";
import { ProfileSettings } from "@/app/components/settings/profile/ProfileSettings";
import { SecuritySettings } from "@/app/components/settings/security/SecuritySettings";
import { CompanySettings } from "@/app/components/settings/company/CompanySettings";
import { DiscardChangesModal } from "@/app/components/shared/DiscardChangesModal";
import { PageHeader } from "@/app/components/shared/PageHeader";
import { useGoogleLinkResult } from "@/hooks/auth/useGoogleLinkResult";
import {
  resolveSettingsTab,
  type SettingsTab,
} from "@/app/components/settings/settings-tabs";

export default function SettingsPage() {
  const { user } = useAuth();

  const searchParams = useSearchParams();
  const { hasResult: hasGoogleResult } = useGoogleLinkResult();

  const isOwner = user?.role === UserRole.OWNER;

  const activeTab = resolveSettingsTab(searchParams.get("tab"), {
    isOwner,
    hasGoogleResult,
  });

  // Switching tabs replaces the form, so unsaved edits ask first.
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [pendingTab, setPendingTab] = useState<SettingsTab | null>(null);

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
      <PageHeader title="Settings" hideTitle />

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
    </>
  );
}
