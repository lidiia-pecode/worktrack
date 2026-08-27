import { getCurrentUser } from "@/lib/api/server/auth";

import { LandingPage } from "../components/homepage/LandingPage";

import { WorkspaceSetup } from "../components/onboarding/workspace-setup/WorkspaceSetup";
import { ManagerWorkspaceSetup } from "../components/onboarding/workspace-setup/ManagerWorkspaceSetup";

export default async function Home() {
  const user = await getCurrentUser();

  if (!user) {
    return <LandingPage />;
  }

  console.log(user);

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto flex max-w-7xl justify-center px-6 py-10">
        {user.role === "OWNER" && <WorkspaceSetup />}

        {user.role === "MANAGER" && <ManagerWorkspaceSetup />}
      </div>
    </main>
  );
}
