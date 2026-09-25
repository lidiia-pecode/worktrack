"use client";

import { useState } from "react";

import { useAuth } from "@/hooks/auth/useAuth";
import { UserRole } from "@/types/enums";
import { SettingsSidebar } from "@/app/components/settings/SettingsSidebar";
import { ProfileSettings } from "@/app/components/settings/profile/ProfileSettings";
import { SecuritySettings } from "@/app/components/settings/security/SecuritySettings";
import { CompanySettings } from "@/app/components/settings/company/CompanySettings";
import { PageHeader } from "@/app/components/shared/PageHeader";
import { useGoogleLinkResult } from "@/hooks/auth/useGoogleLinkResult";

type SettingsTab = "profile" | "security" | "company";

export default function SettingsPage() {
  const { user } = useAuth();

  useGoogleLinkResult();

  const isOwner = user?.role === UserRole.OWNER;

  const [activeTab, setActiveTab] = useState<SettingsTab>("profile");

  return (
    <section className="flex min-h-full w-full flex-col p-6">
      <PageHeader
        title="Settings"
        description="Manage your profile, security, and workspace."
      />

      <div className="flex max-w-6xl flex-col gap-10 md:flex-row md:items-start">
        <SettingsSidebar
          activeTab={activeTab}
          isOwner={isOwner}
          onChange={setActiveTab}
        />

        <div className="min-w-0 max-w-180 flex-1">
          {activeTab === "profile" && <ProfileSettings user={user} />}

          {activeTab === "security" && <SecuritySettings />}

          {activeTab === "company" && isOwner && <CompanySettings />}
        </div>
      </div>
    </section>
  );
}
