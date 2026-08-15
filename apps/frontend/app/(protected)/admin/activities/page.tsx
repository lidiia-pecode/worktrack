import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/api/server/auth";
import { ActivityList } from "@/app/components/activities/ActivitiesList";

export default async function ActivitiesAdminPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/");
  }

  return <ActivityList />;
}
