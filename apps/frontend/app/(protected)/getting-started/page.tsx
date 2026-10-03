import { requireOwnerAccess } from "@/lib/api/server/auth";
import { GettingStarted } from "@/app/components/onboarding/workspace-setup/GettingStarted";

export default async function GettingStartedPage() {
  await requireOwnerAccess();

  return (
    <div className="flex justify-center">
      <GettingStarted />
    </div>
  );
}
