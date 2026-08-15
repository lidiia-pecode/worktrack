"use client";

import { useState } from "react";
import { Settings2 } from "lucide-react";

import { useAuth } from "@/hooks/useAuth";
import { UserRole } from "@/types/enums";
import { SettingsSidebar } from "@/app/components/settings/SettingsSidebar";
import { ProfileSettings } from "@/app/components/settings/profile/ProfileSettings";
import { SecuritySettings } from "@/app/components/settings/security/SecuritySettings";
import { CompanySettings } from "@/app/components/settings/company/CompanySettings";
import { GlowBackground } from "@/components/ui/glow-background";

type SettingsTab = "profile" | "security" | "company";

export default function SettingsPage() {
  const { user } = useAuth();

  const isOwner = user?.role === UserRole.OWNER;

  const [activeTab, setActiveTab] = useState<SettingsTab>("profile");

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 text-white">
      <GlowBackground intensity="strong" />

      <div className="relative z-10 mx-auto w-full max-w-6xl px-6 pb-12 pt-8 lg:px-8">
        <header className="mb-8 flex justify-end">
          <div className="flex flex-col gap-1 ">
            <div className="flex gap-4 items-center justify-end">
              <h1 className="text-2xl text-blue-400 font-semibold tracking-tight ">
                Settings
              </h1>

              <div className="flex h-7 w-7 items-center justify-center rounded border border-white/10 bg-white/[0.04] text-blue-400">
                <Settings2 className="h-5 w-5" />
              </div>
            </div>

            <p className="text-sm text-slate-400">
              Manage your profile, security, and workspace.
            </p>
          </div>
        </header>

        <div className="flex flex-col gap-10 justify-between md:flex-row md:items-start">
          <SettingsSidebar
            activeTab={activeTab}
            isOwner={isOwner}
            onChange={setActiveTab}
          />

          <main className="min-w-0 flex-1 max-w-180">
            {activeTab === "profile" && <ProfileSettings user={user} />}

            {activeTab === "security" && <SecuritySettings />}

            {activeTab === "company" && isOwner && <CompanySettings />}
          </main>
        </div>
      </div>
    </div>
  );
}
