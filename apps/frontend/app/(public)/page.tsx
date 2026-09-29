import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/api/server/auth";
import { getOwnerSetupState } from "@/lib/api/server/onboarding";
import { GETTING_STARTED_PATH } from "@/lib/constants";
import { UserRole } from "@/types/enums";

import { LandingPage } from "../components/homepage/LandingPage";

export default async function Home() {
  const user = await getCurrentUser();

  if (!user) {
    return <LandingPage />;
  }

  if (user.role === UserRole.EMPLOYEE) {
    redirect("/timesheet");
  }

  // A manager's welcome is on Team time.
  if (user.role === UserRole.MANAGER) {
    redirect("/team");
  }

  // The owner is led through setup only until it is completed or skipped.
  const setupState = await getOwnerSetupState();

  redirect(setupState?.setupFinished ? "/team" : GETTING_STARTED_PATH);
}
