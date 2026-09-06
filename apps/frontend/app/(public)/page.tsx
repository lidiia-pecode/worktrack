import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/api/server/auth";
import { UserRole } from "@/types/enums";

import { LandingPage } from "../components/homepage/LandingPage";

import { WorkspaceSetup } from "../components/onboarding/workspace-setup/WorkspaceSetup";
import { ManagerWorkspaceSetup } from "../components/onboarding/workspace-setup/ManagerWorkspaceSetup";

export default async function Home() {
  const user = await getCurrentUser();

  if (!user) {
    return <LandingPage />;
  }

  if (user.role === UserRole.EMPLOYEE) {
    redirect("/timesheet");
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto flex max-w-7xl justify-center px-6 py-10">
        {user.role === UserRole.OWNER && <WorkspaceSetup />}

        {user.role === UserRole.MANAGER && <ManagerWorkspaceSetup />}
      </div>
    </main>
  );
}
