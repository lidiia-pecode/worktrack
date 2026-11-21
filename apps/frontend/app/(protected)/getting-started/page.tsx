import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/api/server/auth";
import { UserRole } from "@/types/enums";
import { GettingStarted } from "@/app/components/onboarding/workspace-setup/GettingStarted";
import { RoleGuide } from "@/app/components/onboarding/RoleGuide";
import { gettingStarted } from "@/app/components/layout/sidebar/sidebar-navigation";

export const metadata: Metadata = { title: gettingStarted.label };

export default async function GettingStartedPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/");
  }

  return (
    <div className="flex justify-center">
      {user.role === UserRole.OWNER ? (
        <GettingStarted />
      ) : (
        <RoleGuide role={user.role} tracksOwnTime={user.tracksOwnTime} />
      )}
    </div>
  );
}
