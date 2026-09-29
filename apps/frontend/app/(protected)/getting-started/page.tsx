import { requireOwnerAccess } from "@/lib/api/server/auth";
import { GettingStarted } from "@/app/components/onboarding/workspace-setup/GettingStarted";

export default async function GettingStartedPage() {
  await requireOwnerAccess();

  return (
    <div className="mx-auto flex max-w-7xl justify-center px-6 py-10">
      <GettingStarted />
    </div>
  );
}
