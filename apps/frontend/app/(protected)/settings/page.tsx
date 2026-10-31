import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/api/server/auth";
import { UserRole } from "@/types/enums";
import { PageHeader } from "@/app/components/shared/PageHeader";
import { SettingsView } from "@/app/components/settings/SettingsView";
import { settings } from "@/app/components/layout/sidebar/sidebar-navigation";

export const metadata: Metadata = { title: settings.label };

export default async function SettingsPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/");
  }

  return (
    <>
      <PageHeader title="Settings" hideTitle />

      <SettingsView isOwner={user.role === UserRole.OWNER} />
    </>
  );
}
