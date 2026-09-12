import { requireManagerAccess } from "@/lib/api/server/auth";
import { ActivityCategoriesContent } from "@/app/components/categories/ActivityCategoriesContent";

export default async function ActivityCategoriesAdminPage() {
  await requireManagerAccess();

  return <ActivityCategoriesContent />;
}
