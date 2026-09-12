import { requireManagerAccess } from "@/lib/api/server/auth";
import { ActivitiesContent } from "@/app/components/activities/ActivitiesContent";

export default async function ActivitiesAdminPage() {
  await requireManagerAccess();

  return <ActivitiesContent />;
}
