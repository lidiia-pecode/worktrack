import { getCurrentUser } from "@/lib/api/server/auth";
import { LandingPage } from "../components/homepage/LandingPage";
import { WorkspaceSetup } from "../components/onboarding/workspace-setup/WorkspaceSetup";

export default async function Home() {
  const user = await getCurrentUser();

  if (!user) {
    return <LandingPage />;
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto flex max-w-7xl justify-center px-6 py-10">
        <WorkspaceSetup hasTeam={false} />
      </div>
    </main>
  );
}
