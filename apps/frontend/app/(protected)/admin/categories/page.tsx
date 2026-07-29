import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/api/server/auth";
import { ActCategoryList } from "@/app/components/categories/ActCategoryList";

export default async function ActivityCategoriesAdminPage() {
  const user = await getCurrentUser("/admin/categories");
  if (!user) {
    redirect("/");
  }

  return <ActCategoryList />;
}
