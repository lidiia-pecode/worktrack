import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/api/server/auth";
import { ActivityCategoriesContent } from "@/app/components/categories/ActivityCategoriesContent";

export default async function ActivityCategoriesAdminPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/");
  }

  return <ActivityCategoriesContent />;
}
