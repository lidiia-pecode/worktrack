import type { Metadata } from "next";
import { requireOwnerAccess } from "@/lib/api/server/auth";
import { GettingStarted } from "@/app/components/onboarding/workspace-setup/GettingStarted";
import { gettingStarted } from "@/app/components/layout/sidebar/sidebar-navigation";

export const metadata: Metadata = { title: gettingStarted.label };

export default async function GettingStartedPage() {
  await requireOwnerAccess();

  return (
    <div className="flex justify-center">
      <GettingStarted />
    </div>
  );
}
