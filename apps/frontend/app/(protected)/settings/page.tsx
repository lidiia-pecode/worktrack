"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { useAuth } from "@/hooks/auth/useAuth";
import { UserRole } from "@/types/enums";
import { SettingsSidebar } from "@/app/components/settings/SettingsSidebar";
import { ProfileSettings } from "@/app/components/settings/profile/ProfileSettings";
import { SecuritySettings } from "@/app/components/settings/security/SecuritySettings";
import { CompanySettings } from "@/app/components/settings/company/CompanySettings";
import { PageHeader } from "@/app/components/shared/PageHeader";
import { useGoogleLinkResult } from "@/hooks/auth/useGoogleLinkResult";
import {
  resolveSettingsTab,
  type SettingsTab,
} from "@/app/components/settings/settings-tabs";

export default function SettingsPage() {
  const { user } = useAuth();

  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const { hasResult: hasGoogleResult } = useGoogleLinkResult();

  const isOwner = user?.role === UserRole.OWNER;

  const activeTab = resolveSettingsTab(searchParams.get("tab"), {
    isOwner,
    hasGoogleResult,
  });

  const setActiveTab = (tab: SettingsTab) =>
    router.replace(`${pathname}?tab=${tab}`, { scroll: false });

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
