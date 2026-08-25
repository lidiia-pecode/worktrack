import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/api/server/auth";
import { ActivitiesContent } from "@/app/components/activities/ActivitiesContent";

export default async function ActivitiesAdminPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/");
  }

  return <ActivitiesContent />;
}
